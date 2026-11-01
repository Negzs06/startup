import { isAbsolute, resolve } from "node:path";

export interface FoundryConfig {
  /** Resource base URL, for example https://my-resource.openai.azure.com (no trailing slash). */
  endpoint: string;
  apiKey: string;
  /** Name of the image model deployment in Foundry. */
  deployment: string;
  /** When set, use the versioned /openai/deployments/{name}/images/generations route; otherwise the /openai/v1 route. */
  apiVersion: string | null;
  outputDir: string;
  /** Images larger than this are saved but not returned inline to the client. */
  maxInlineBytes: number;
  timeoutMs: number;
}

type Env = Record<string, string | undefined>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * `.mcp.json` expands `${VAR}`; when VAR is unset the server receives the literal
 * text. Treat that, and empty values, as "not set".
 */
function read(env: Env, name: string): string | undefined {
  const value = env[name]?.trim();
  return value && !/^\$\{.*\}$/.test(value) ? value : undefined;
}

function isLocalHttp(url: URL): boolean {
  return url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
}

export function loadConfig(env: Env = process.env, cwd = process.cwd()): FoundryConfig {
  const missing = ["FOUNDRY_ENDPOINT", "FOUNDRY_API_KEY", "FOUNDRY_IMAGE_DEPLOYMENT"].filter((name) => !read(env, name));
  if (missing.length) {
    throw new ConfigError(
      `Missing configuration: ${missing.join(", ")}. Set them in the environment that starts this MCP server (see tools/foundry-image-mcp/README.md).`,
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(read(env, "FOUNDRY_ENDPOINT")!);
  } catch {
    throw new ConfigError("FOUNDRY_ENDPOINT is not a valid URL; expected something like https://<resource>.openai.azure.com");
  }
  if (endpoint.protocol !== "https:" && !isLocalHttp(endpoint)) {
    throw new ConfigError("FOUNDRY_ENDPOINT must use https (plain http is only accepted for localhost).");
  }

  const number = (name: string, fallback: number): number => {
    const raw = read(env, name);
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) throw new ConfigError(`${name} must be a positive number.`);
    return parsed;
  };

  const outputDir = read(env, "FOUNDRY_IMAGE_OUTPUT_DIR") ?? "generated-images";
  return {
    endpoint: endpoint.origin,
    apiKey: read(env, "FOUNDRY_API_KEY")!,
    deployment: read(env, "FOUNDRY_IMAGE_DEPLOYMENT")!,
    apiVersion: read(env, "FOUNDRY_API_VERSION") ?? null,
    outputDir: isAbsolute(outputDir) ? outputDir : resolve(cwd, outputDir),
    maxInlineBytes: number("FOUNDRY_MAX_INLINE_BYTES", 2_000_000),
    timeoutMs: number("FOUNDRY_TIMEOUT_MS", 180_000),
  };
}
