import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { setDefaultBaseUrls } from "@google/genai";
import { AnalysisError, describeRateLimit, requestDossier } from "@/lib/analysis/gemini";

// Exercises the real @google/genai client against a local stand-in for the
// Gemini REST endpoint, to check what we send and how a reply is read back.

interface Seen {
  url: string;
  headers: IncomingMessage["headers"];
  body: Record<string, unknown>;
}

const dossier = {
  verdict: { decision: "accept", confidence: "medium", rationale: "Refund asked inside the window." },
  reasonCodeSummary: "s",
  requirements: [],
  timeline: [],
  highlightedClauses: [],
  coverLetter: { localized: "l", english: "e" },
  evidenceGaps: [],
  injectionFlags: [],
};

let server: Server;
let seen: Seen | null = null;
let respond: () => { status: number; body: unknown } = () => ({ status: 200, body: {} });

before(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      seen = { url: req.url ?? "", headers: req.headers, body: JSON.parse(raw || "{}") };
      const { status, body } = respond();
      res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  setDefaultBaseUrls({ geminiUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}` });
});

after(() => {
  server.close();
});

describe("requestDossier over HTTP", () => {
  it("sends the key, system prompt, JSON mode and schema, and reads the reply back", async () => {
    respond = () => ({
      status: 200,
      body: {
        candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(dossier) }] }, finishReason: "STOP" }],
        modelVersion: "gemini-test-001",
      },
    });
    const { output, model } = await requestDossier("CASE PROMPT", { apiKey: "test-key", model: "gemini-test", retryDelaySeconds: 0.01 });

    assert.equal(output.verdict.decision, "accept");
    assert.equal(model, "gemini-test-001");
    assert.ok(seen);
    assert.match(seen.url, /\/models\/gemini-test:generateContent$/);
    assert.equal(seen.headers["x-goog-api-key"], "test-key");
    const config = seen.body.generationConfig as Record<string, unknown>;
    assert.equal(config.responseMimeType, "application/json");
    assert.equal(config.maxOutputTokens, 16000);
    assert.equal((config.responseJsonSchema as { type: string }).type, "object");
    assert.match(JSON.stringify(seen.body.systemInstruction), /forensic analyst/);
    assert.match(JSON.stringify(seen.body.contents), /CASE PROMPT/);
  });

  it("retries transient 503s and succeeds when the service recovers", async () => {
    let calls = 0;
    respond = () => {
      calls += 1;
      if (calls < 3) return { status: 503, body: { error: { code: 503, message: "This model is currently experiencing high demand.", status: "UNAVAILABLE" } } };
      return { status: 200, body: { candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(dossier) }] }, finishReason: "STOP" }] } };
    };
    const { output } = await requestDossier("p", { apiKey: "k", model: "m", retryDelaySeconds: 0.01 });
    assert.equal(output.verdict.decision, "accept");
    assert.equal(calls, 3);
  });

  it("gives up with a readable error when the service stays unavailable", async () => {
    let calls = 0;
    respond = () => {
      calls += 1;
      return { status: 503, body: { error: { code: 503, message: "high demand", status: "UNAVAILABLE" } } };
    };
    await assert.rejects(requestDossier("p", { apiKey: "k", model: "m", retryDelaySeconds: 0.01 }), (e: unknown) => e instanceof AnalysisError && /503/.test(e.message));
    assert.equal(calls, 3);
  });

  it("maps API failures to readable errors", async () => {
    const cases: [number, RegExp][] = [
      [400, /rejected the API key/],
      [403, /rejected the API key/],
      [404, /GEMINI_MODEL/],
      [429, /quota or rate limit/],
    ];
    for (const [status, message] of cases) {
      respond = () => ({ status, body: { error: { code: status, message: status === 400 ? "API key not valid. Please pass a valid API key." : "nope", status: "ERR" } } });
      await assert.rejects(
        requestDossier("p", { apiKey: "k", model: "m", retryDelaySeconds: 0.01 }),
        (error: unknown) => error instanceof AnalysisError && error.code === "api_error" && message.test(error.message),
        String(status),
      );
    }
  });
});

describe("quota errors", () => {
  const quotaMessage =
    "You exceeded your current quota.\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-test\ndescription: Generate content requests per day limit exceeded on Free Tier.\nPlease retry in 16h3m40.339085781s.";

  it("is not retried and names the limit and the wait", async () => {
    let calls = 0;
    respond = () => {
      calls += 1;
      return { status: 429, body: { error: { code: 429, message: quotaMessage, status: "RESOURCE_EXHAUSTED" } } };
    };
    await assert.rejects(
      requestDossier("p", { apiKey: "k", model: "m", retryDelaySeconds: 0.01 }),
      (e: unknown) => e instanceof AnalysisError && /limit 20 per day for gemini-test; retry in 16h3m40s/.test(e.message),
    );
    assert.equal(calls, 1);
  });

  it("summarises what it can when the message is unstructured", () => {
    assert.equal(describeRateLimit("slow down"), "Gemini API quota or rate limit reached.");
    assert.match(describeRateLimit(JSON.stringify({ error: { message: quotaMessage } })), /limit 20 per day/);
  });
});

