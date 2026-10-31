import { ApiError, FinishReason, GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";
import { DossierOutputSchema, type DossierOutput } from "./schema";
import { SYSTEM_PROMPT } from "./prompt";

// Gemini model IDs change often. Confirm the ID against the model list for your
// key (https://ai.google.dev/gemini-api/docs/models) and override with GEMINI_MODEL.
export const DEFAULT_MODEL = "gemini-3.5-flash";

export function resolveModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export class AnalysisError extends Error {
  constructor(
    readonly code: "refusal" | "truncated" | "no_output" | "invalid_output" | "api_error",
    message: string,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

/** JSON Schema sent to Gemini as `responseJsonSchema`; derived from the same zod schema that validates the reply. */
export function dossierJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(DossierOutputSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

/**
 * Turns a Gemini response into a validated dossier. Checks why generation stopped
 * before trusting any text: blocked prompts and safety stops are refusals.
 */
export function parseDossierResponse(response: Pick<GenerateContentResponse, "candidates" | "promptFeedback" | "text" | "modelVersion">, requestedModel: string): { output: DossierOutput; model: string } {
  const blocked = response.promptFeedback?.blockReason;
  if (blocked) {
    throw new AnalysisError("refusal", `Gemini blocked the request (reason: ${blocked}).`);
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === FinishReason.MAX_TOKENS) {
    throw new AnalysisError("truncated", "The model's output hit the token limit and was truncated.");
  }
  if (
    finishReason === FinishReason.SAFETY ||
    finishReason === FinishReason.PROHIBITED_CONTENT ||
    finishReason === FinishReason.BLOCKLIST ||
    finishReason === FinishReason.SPII ||
    finishReason === FinishReason.RECITATION
  ) {
    throw new AnalysisError("refusal", `Gemini declined to analyse this case (finish reason: ${finishReason}).`);
  }

  const text = response.text;
  if (!text) throw new AnalysisError("no_output", "The model returned no text output.");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AnalysisError("invalid_output", "The model output was not valid JSON.");
  }
  const parsed = DossierOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new AnalysisError("invalid_output", `The model output failed schema validation: ${parsed.error.issues[0]?.message ?? "unknown issue"}`);
  }
  return { output: parsed.data, model: response.modelVersion ?? requestedModel };
}

/** Readable summary of a Gemini 429: which limit was hit and when to retry. */
export function describeRateLimit(apiMessage: string): string {
  let text = apiMessage;
  try {
    const parsed = JSON.parse(apiMessage) as { error?: { message?: string } };
    text = parsed.error?.message ?? apiMessage;
  } catch {
    // Not JSON: use the message as is.
  }
  const limit = text.match(/limit: (\d+), model: ([\w.-]+)/);
  const period = text.match(/requests per (day|minute)/i)?.[1];
  const retryIn = text.match(/retry in ([\dhms.]+)/i)?.[1]?.replace(/\.\d+/g, "");
  const parts = [limit && `limit ${limit[1]}${period ? ` per ${period.toLowerCase()}` : ""} for ${limit[2]}`, retryIn && `retry in ${retryIn}`].filter(Boolean);
  return `Gemini API quota or rate limit reached${parts.length ? ` (${parts.join("; ")})` : ""}.`;
}

export interface RequestOptions {
  apiKey: string;
  model?: string;
  /** Delay before the first retry of a transient failure, in seconds; doubles each attempt. */
  retryDelaySeconds?: number;
}

// Gemini answers 503 "high demand" in bursts. Three attempts at 90 s each stay inside the route's 300 s limit.
// 429 is deliberately not retried: it means a quota is used up (on the free tier often the daily one), so retrying only burns requests.
const REQUEST_TIMEOUT_MS = 90_000;
const RETRY_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = [500, 503, 504];

export async function requestDossier(userPrompt: string, { apiKey, model = resolveModel(), retryDelaySeconds = 2 }: RequestOptions): Promise<{ output: DossierOutput; model: string }> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: RETRY_ATTEMPTS, initialDelay: retryDelaySeconds, maxDelay: 20, httpStatusCodes: RETRYABLE_STATUS_CODES },
    },
  });

  let response: GenerateContentResponse;
  try {
    response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: dossierJsonSchema(),
        maxOutputTokens: 16000,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      // An invalid key comes back as HTTP 400 (API_KEY_INVALID) rather than 401/403.
      if (error.status === 401 || error.status === 403 || /API[_ ]KEY[_ ](INVALID|NOT VALID)|API key not valid/i.test(error.message)) throw new AnalysisError("api_error", "Gemini API rejected the API key.");
      if (error.status === 404) throw new AnalysisError("api_error", `Gemini model "${model}" was not found; set GEMINI_MODEL to a model your key can use.`);
      if (error.status === 429) throw new AnalysisError("api_error", describeRateLimit(error.message));
      throw new AnalysisError("api_error", `Gemini API error ${error.status}: ${error.message}`);
    }
    throw new AnalysisError("api_error", error instanceof Error ? error.message : "Unknown error calling the Gemini API.");
  }

  return parseDossierResponse(response, model);
}
