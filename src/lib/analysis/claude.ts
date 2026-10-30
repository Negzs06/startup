import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ClaudeDossierSchema, type ClaudeDossier } from "./schema";
import { SYSTEM_PROMPT } from "./prompt";

export const DEFAULT_MODEL = "claude-opus-5-5";

export function resolveModel(): string {
  return process.env.CHARGEGUARD_MODEL?.trim() || DEFAULT_MODEL;
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

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ timeout: 180_000, maxRetries: 2 });
  return client;
}

const OUTPUT_FORMAT = betaZodOutputFormat(ClaudeDossierSchema);

export async function requestDossier(userPrompt: string, model = resolveModel()): Promise<{ output: ClaudeDossier; model: string }> {
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await getClient().beta.messages.create({
      model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: OUTPUT_FORMAT },
      // Server-side fallback: if the model declines, the API retries on its recommended substitute.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new AnalysisError("api_error", "Anthropic API rejected the API key.");
    if (error instanceof Anthropic.RateLimitError) throw new AnalysisError("api_error", "Anthropic API rate limit reached.");
    if (error instanceof Anthropic.APIError) throw new AnalysisError("api_error", `Anthropic API error ${error.status ?? ""}: ${error.message}`.trim());
    throw new AnalysisError("api_error", error instanceof Error ? error.message : "Unknown error calling the Anthropic API.");
  }

  // Check why generation stopped before trusting any content.
  if (response.stop_reason === "refusal") {
    const category = response.stop_details?.category ?? "unspecified";
    throw new AnalysisError("refusal", `The model declined to analyse this case (category: ${category}).`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new AnalysisError("truncated", "The model's output hit max_tokens and was truncated.");
  }

  const text = response.content.find((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")?.text;
  if (!text) throw new AnalysisError("no_output", "The model returned no text output.");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AnalysisError("invalid_output", "The model output was not valid JSON.");
  }
  const parsed = ClaudeDossierSchema.safeParse(json);
  if (!parsed.success) {
    throw new AnalysisError("invalid_output", `The model output failed schema validation: ${parsed.error.issues[0]?.message ?? "unknown issue"}`);
  }
  return { output: parsed.data, model: response.model };
}
