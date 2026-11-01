import type { FoundryConfig } from "./config";

export interface GenerateParams {
  prompt: string;
  n?: number;
  size?: string;
  quality?: string;
  output_format?: string;
  background?: string;
}

export interface GeneratedImage {
  bytes: Buffer;
  mimeType: string;
  extension: string;
  revisedPrompt: string | undefined;
}

export class FoundryError extends Error {
  constructor(
    readonly kind: "auth" | "not_found" | "content_policy" | "rate_limit" | "bad_request" | "server" | "network" | "bad_response",
    message: string,
  ) {
    super(message);
    this.name = "FoundryError";
  }
}

const FORMATS: Record<string, { mimeType: string; extension: string }> = {
  png: { mimeType: "image/png", extension: "png" },
  jpeg: { mimeType: "image/jpeg", extension: "jpg" },
  webp: { mimeType: "image/webp", extension: "webp" },
};

export function buildRequest(config: FoundryConfig, params: GenerateParams): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
  const optional = Object.fromEntries(
    Object.entries({ n: params.n, size: params.size, quality: params.quality, output_format: params.output_format, background: params.background }).filter(([, v]) => v !== undefined),
  );
  const headers = { "content-type": "application/json", "api-key": config.apiKey };

  if (config.apiVersion) {
    return {
      url: `${config.endpoint}/openai/deployments/${encodeURIComponent(config.deployment)}/images/generations?api-version=${encodeURIComponent(config.apiVersion)}`,
      headers,
      body: { prompt: params.prompt, ...optional },
    };
  }
  return { url: `${config.endpoint}/openai/v1/images/generations`, headers, body: { model: config.deployment, prompt: params.prompt, ...optional } };
}

/** Pulls a short human-readable message out of an error body without echoing arbitrary content. */
function upstreamMessage(text: string): { code: string | undefined; message: string } {
  try {
    const parsed = JSON.parse(text) as { error?: { code?: unknown; message?: unknown } };
    const code = typeof parsed.error?.code === "string" ? parsed.error.code : undefined;
    const message = typeof parsed.error?.message === "string" ? parsed.error.message : text;
    return { code, message: message.slice(0, 500) };
  } catch {
    return { code: undefined, message: text.slice(0, 500) };
  }
}

function toFoundryError(status: number, text: string, retryAfter: string | null, config: FoundryConfig): FoundryError {
  const { code, message } = upstreamMessage(text);
  if (status === 401 || status === 403) return new FoundryError("auth", `Foundry rejected the API key (HTTP ${status}). Check FOUNDRY_API_KEY and that the key belongs to this resource.`);
  if (status === 404) return new FoundryError("not_found", `Foundry returned 404: deployment "${config.deployment}" or the route was not found. Check FOUNDRY_IMAGE_DEPLOYMENT, FOUNDRY_ENDPOINT and FOUNDRY_API_VERSION.`);
  if (status === 429) return new FoundryError("rate_limit", `Foundry rate limit or quota reached${retryAfter ? `; retry after ${retryAfter}s` : ""}. ${message}`.trim());
  if (status >= 500) return new FoundryError("server", `Foundry server error (HTTP ${status}): ${message}`);
  if (code === "content_policy_violation" || /content[_ ]?(policy|filter)|safety system/i.test(message)) {
    return new FoundryError("content_policy", `The prompt was blocked by Foundry's content filter: ${message}`);
  }
  return new FoundryError("bad_request", `Foundry rejected the request (HTTP ${status}${code ? `, ${code}` : ""}): ${message}`);
}

export async function generateImages(config: FoundryConfig, params: GenerateParams, fetchImpl: typeof fetch = fetch): Promise<GeneratedImage[]> {
  const { url, headers, body } = buildRequest(config, params);

  let response: Response;
  try {
    response = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(config.timeoutMs) });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new FoundryError("network", timedOut ? `Foundry did not answer within ${Math.round(config.timeoutMs / 1000)}s.` : `Could not reach Foundry: ${error instanceof Error ? error.message : "unknown error"}. If this runs in a sandbox, the network policy must allow ${new URL(config.endpoint).hostname}.`);
  }

  const text = await response.text();
  if (!response.ok) throw toFoundryError(response.status, text, response.headers.get("retry-after"), config);

  let payload: { data?: Array<{ b64_json?: unknown; revised_prompt?: unknown; url?: unknown }> };
  try {
    payload = JSON.parse(text) as typeof payload;
  } catch {
    throw new FoundryError("bad_response", "Foundry returned a response that is not JSON.");
  }
  if (!Array.isArray(payload.data) || payload.data.length === 0) throw new FoundryError("bad_response", "Foundry returned no images.");

  const format = FORMATS[params.output_format ?? "png"] ?? FORMATS.png!;
  return payload.data.map((item, index) => {
    if (typeof item.b64_json !== "string" || item.b64_json.length === 0) {
      throw new FoundryError("bad_response", `Image ${index + 1} has no base64 data${typeof item.url === "string" ? " (the service returned a URL, which this server does not download)" : ""}.`);
    }
    return { bytes: Buffer.from(item.b64_json, "base64"), mimeType: format.mimeType, extension: format.extension, revisedPrompt: typeof item.revised_prompt === "string" ? item.revised_prompt : undefined };
  });
}
