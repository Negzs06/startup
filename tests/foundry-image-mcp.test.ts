import assert from "node:assert/strict";
import { createServer as createHttpServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ConfigError, loadConfig, type FoundryConfig } from "../tools/foundry-image-mcp/config";
import { buildRequest, describeNetworkFailure, FoundryError, generateImages } from "../tools/foundry-image-mcp/foundry";
import { createServer } from "../tools/foundry-image-mcp/server";

// 1x1 transparent PNG.
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PNG_BYTES = Buffer.from(PNG_B64, "base64");
const SECRET = "super-secret-key-123";

interface Seen {
  method: string | undefined;
  url: string;
  headers: IncomingMessage["headers"];
  body: Record<string, unknown>;
}

let upstream: Server;
let origin = "";
let seen: Seen | null = null;
let respond: () => { status: number; body: unknown; headers?: Record<string, string> } = () => ({ status: 200, body: {} });
let outDir = "";

const okImages = (count = 1, extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { created: 1, data: Array.from({ length: count }, () => ({ b64_json: PNG_B64, ...extra })) },
});

before(async () => {
  upstream = createHttpServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      seen = { method: req.method, url: req.url ?? "", headers: req.headers, body: raw ? JSON.parse(raw) : {} };
      const { status, body, headers } = respond();
      res.writeHead(status, { "content-type": "application/json", ...headers }).end(JSON.stringify(body));
    });
  });
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
  outDir = await mkdtemp(join(tmpdir(), "foundry-image-test-"));
});

after(async () => {
  upstream.close();
  await rm(outDir, { recursive: true, force: true });
});

const config = (over: Partial<FoundryConfig> = {}): FoundryConfig => ({
  endpoint: origin,
  apiKey: SECRET,
  deployment: "gpt-image-test",
  apiVersion: null,
  outputDir: outDir,
  maxInlineBytes: 2_000_000,
  timeoutMs: 5_000,
  ...over,
});

describe("loadConfig", () => {
  const base = { FOUNDRY_ENDPOINT: "https://res.openai.azure.com/", FOUNDRY_API_KEY: "k", FOUNDRY_IMAGE_DEPLOYMENT: "d" };

  it("reads the required variables and normalises the endpoint", () => {
    const c = loadConfig(base, "/work");
    assert.equal(c.endpoint, "https://res.openai.azure.com");
    assert.equal(c.apiVersion, null);
    assert.equal(c.outputDir, "/work/generated-images");
  });

  it("names every missing variable, treating empty and unexpanded ${VAR} values as unset", () => {
    assert.throws(
      () => loadConfig({ FOUNDRY_ENDPOINT: "${FOUNDRY_ENDPOINT}", FOUNDRY_API_KEY: "  ", FOUNDRY_IMAGE_DEPLOYMENT: "d" }),
      (e: unknown) => e instanceof ConfigError && /FOUNDRY_ENDPOINT, FOUNDRY_API_KEY/.test(e.message) && !/DEPLOYMENT/.test(e.message),
    );
  });

  it("rejects invalid URLs and plain http except for localhost", () => {
    assert.throws(() => loadConfig({ ...base, FOUNDRY_ENDPOINT: "not a url" }), /valid URL/);
    assert.throws(() => loadConfig({ ...base, FOUNDRY_ENDPOINT: "http://res.openai.azure.com" }), /https/);
    assert.equal(loadConfig({ ...base, FOUNDRY_ENDPOINT: "http://127.0.0.1:9" }).endpoint, "http://127.0.0.1:9");
  });

  it("accepts the full image-generation URL copied from the portal and keeps only the origin", () => {
    const c = loadConfig({ ...base, FOUNDRY_ENDPOINT: "https://res-1234.services.ai.azure.com/openai/v1/images/generations" });
    assert.equal(c.endpoint, "https://res-1234.services.ai.azure.com");
    assert.equal(buildRequest(c, { prompt: "p" }).url, "https://res-1234.services.ai.azure.com/openai/v1/images/generations");
  });

  it("validates numeric settings and honours an API version", () => {
    assert.throws(() => loadConfig({ ...base, FOUNDRY_TIMEOUT_MS: "-1" }), /positive/);
    assert.equal(loadConfig({ ...base, FOUNDRY_API_VERSION: "2025-04-01-preview" }).apiVersion, "2025-04-01-preview");
  });
});

describe("buildRequest", () => {
  it("uses the v1 route with the deployment as the model when no API version is set", () => {
    const r = buildRequest(config({ endpoint: "https://res.openai.azure.com" }), { prompt: "a cat", size: "1024x1024" });
    assert.equal(r.url, "https://res.openai.azure.com/openai/v1/images/generations");
    assert.deepEqual(r.body, { model: "gpt-image-test", prompt: "a cat", size: "1024x1024" });
    assert.equal(r.headers["api-key"], SECRET);
  });

  it("uses the deployment route with api-version when one is set, and omits model", () => {
    const r = buildRequest(config({ endpoint: "https://res.openai.azure.com", deployment: "my image", apiVersion: "2025-04-01-preview" }), { prompt: "a cat" });
    assert.equal(r.url, "https://res.openai.azure.com/openai/deployments/my%20image/images/generations?api-version=2025-04-01-preview");
    assert.deepEqual(r.body, { prompt: "a cat" });
  });

  it("sends only the options that were given", () => {
    const r = buildRequest(config(), { prompt: "p", n: 2, quality: "high", output_format: "webp", background: "transparent" });
    assert.deepEqual(r.body, { model: "gpt-image-test", prompt: "p", n: 2, quality: "high", output_format: "webp", background: "transparent" });
  });
});

describe("generateImages against a stand-in Foundry", () => {
  it("posts the request and decodes the images", async () => {
    respond = () => okImages(2, { revised_prompt: "a tabby cat" });
    const images = await generateImages(config(), { prompt: "a cat", n: 2, output_format: "jpeg" });
    assert.equal(images.length, 2);
    assert.deepEqual(images[0]!.bytes, PNG_BYTES);
    assert.equal(images[0]!.mimeType, "image/jpeg");
    assert.equal(images[0]!.extension, "jpg");
    assert.equal(images[0]!.revisedPrompt, "a tabby cat");
    assert.equal(seen!.method, "POST");
    assert.equal(seen!.url, "/openai/v1/images/generations");
    assert.equal(seen!.headers["api-key"], SECRET);
    assert.deepEqual(seen!.body, { model: "gpt-image-test", prompt: "a cat", n: 2, output_format: "jpeg" });
  });

  it("calls the versioned deployment route when configured", async () => {
    respond = () => okImages();
    await generateImages(config({ apiVersion: "2025-04-01-preview" }), { prompt: "a cat" });
    assert.equal(seen!.url, "/openai/deployments/gpt-image-test/images/generations?api-version=2025-04-01-preview");
    assert.equal("model" in seen!.body, false);
  });

  it("maps failures to readable errors and never leaks the key", async () => {
    const cases: Array<[number, unknown, Record<string, string>, FoundryError["kind"], RegExp]> = [
      [401, { error: { message: `bad key ${SECRET}` } }, {}, "auth", /rejected the API key/],
      [404, { error: { code: "DeploymentNotFound" } }, {}, "not_found", /gpt-image-test/],
      [400, { error: { code: "content_policy_violation", message: "Your request was rejected by the safety system." } }, {}, "content_policy", /content filter/],
      [400, { error: { code: "invalid_value", message: "size is not supported" } }, {}, "bad_request", /invalid_value.*size is not supported/],
      [429, { error: { message: "Too many requests" } }, { "retry-after": "17" }, "rate_limit", /retry after 17s/],
      [503, { error: { message: "overloaded" } }, {}, "server", /HTTP 503/],
    ];
    for (const [status, body, headers, kind, message] of cases) {
      respond = () => ({ status, body, headers });
      await assert.rejects(
        generateImages(config(), { prompt: "p" }),
        (e: unknown) => e instanceof FoundryError && e.kind === kind && message.test(e.message) && !e.message.includes(SECRET),
        `${status} ${kind}`,
      );
    }
  });

  it("rejects empty and URL-only responses clearly", async () => {
    respond = () => ({ status: 200, body: { data: [] } });
    await assert.rejects(generateImages(config(), { prompt: "p" }), (e: unknown) => e instanceof FoundryError && e.kind === "bad_response" && /no images/.test(e.message));
    respond = () => ({ status: 200, body: { data: [{ url: "https://example.com/x.png" }] } });
    await assert.rejects(generateImages(config(), { prompt: "p" }), (e: unknown) => e instanceof FoundryError && /returned a URL/.test(e.message));
  });

  it("hints at NODE_USE_ENV_PROXY only when a proxy is configured and Node would ignore it", () => {
    const cfg = config({ endpoint: "https://res.services.ai.azure.com" });
    const failure = Object.assign(new Error("fetch failed"), { cause: Object.assign(new Error("x"), { code: "ENOTFOUND" }) });
    const plain = describeNetworkFailure(failure, cfg, {});
    assert.match(plain, /\(ENOTFOUND\)/);
    assert.match(plain, /allow res\.services\.ai\.azure\.com/);
    assert.doesNotMatch(plain, /NODE_USE_ENV_PROXY/);
    // undici reports a refused proxy tunnel with code 0 and the text only in the message.
    const refused = Object.assign(new Error("fetch failed"), { cause: Object.assign(new Error("Request was cancelled."), { code: 0 }) });
    assert.match(describeNetworkFailure(refused, cfg, {}), /\(Request was cancelled\.\)/);
    assert.match(describeNetworkFailure(failure, cfg, { HTTPS_PROXY: "http://p:1" }), /NODE_USE_ENV_PROXY=1/);
    assert.doesNotMatch(describeNetworkFailure(failure, cfg, { HTTPS_PROXY: "http://p:1", NODE_USE_ENV_PROXY: "1" }), /NODE_USE_ENV_PROXY/);
  });

  it("reports an unreachable host and mentions the network policy", async () => {
    await assert.rejects(
      generateImages(config({ endpoint: "http://127.0.0.1:1" }), { prompt: "p" }),
      (e: unknown) => e instanceof FoundryError && e.kind === "network" && /network policy/.test(e.message),
    );
  });
});

async function connectInMemory(loadConfigFn: () => FoundryConfig) {
  const server = createServer(loadConfigFn);
  const client = new Client({ name: "test", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client, close: () => Promise.all([client.close(), server.close()]) };
}

type ToolResult = { isError?: boolean; content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> };

describe("generate_image tool (in memory)", () => {
  it("advertises the tool with a validated input schema", async () => {
    const { client, close } = await connectInMemory(() => config());
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "generate_image")!;
    assert.ok(tool);
    assert.deepEqual(tool.inputSchema.required, ["prompt"]);
    assert.deepEqual(Object.keys(tool.inputSchema.properties ?? {}).sort(), ["background", "n", "output_format", "prompt", "quality", "size"]);
    await close();
  });

  it("saves the files, returns paths and inline images", async () => {
    respond = () => okImages(2, { revised_prompt: "revised" });
    const dir = await mkdtemp(join(outDir, "ok-"));
    const { client, close } = await connectInMemory(() => config({ outputDir: join(dir, "nested") }));
    const result = (await client.callTool({ name: "generate_image", arguments: { prompt: "a cat", n: 2 } })) as ToolResult;

    assert.equal(result.isError, undefined);
    assert.equal(result.content[0]!.type, "text");
    assert.match(result.content[0]!.text!, /Generated 2 image\(s\) with deployment "gpt-image-test"/);
    assert.match(result.content[0]!.text!, /revised prompt: revised/);
    const images = result.content.filter((c) => c.type === "image");
    assert.equal(images.length, 2);
    assert.equal(images[0]!.mimeType, "image/png");
    assert.equal(images[0]!.data, PNG_B64);

    const files = await readdir(join(dir, "nested"));
    assert.equal(files.length, 2);
    assert.ok(files.every((f) => /^image-.*\.png$/.test(f)));
    assert.deepEqual(await readFile(join(dir, "nested", files[0]!)), PNG_BYTES);
    await close();
  });

  it("keeps large images out of the reply but still saves them", async () => {
    respond = () => okImages(1);
    const dir = await mkdtemp(join(outDir, "big-"));
    const { client, close } = await connectInMemory(() => config({ outputDir: dir, maxInlineBytes: 10 }));
    const result = (await client.callTool({ name: "generate_image", arguments: { prompt: "a cat" } })) as ToolResult;
    assert.equal(result.content.filter((c) => c.type === "image").length, 0);
    assert.match(result.content[0]!.text!, /Not returned inline/);
    assert.equal((await readdir(dir)).length, 1);
    await close();
  });

  it("returns tool errors instead of failing the call", async () => {
    const dir = await mkdtemp(join(outDir, "err-"));
    const { client, close } = await connectInMemory(() => config({ outputDir: dir }));
    respond = () => ({ status: 401, body: {} });
    const auth = (await client.callTool({ name: "generate_image", arguments: { prompt: "p" } })) as ToolResult;
    assert.equal(auth.isError, true);
    assert.match(auth.content[0]!.text!, /rejected the API key/);
    assert.deepEqual(await readdir(dir), []);

    await close();
  });

  it("rejects invalid arguments before any paid request is made", async () => {
    let requests = 0;
    respond = () => {
      requests += 1;
      return okImages();
    };
    const { client, close } = await connectInMemory(() => config());
    for (const [args, where] of [
      [{ prompt: "p", size: "huge" }, /Use "auto" or WIDTHxHEIGHT.* at size/],
      [{ prompt: "p", n: 9 }, /<=4 at n/],
      [{ prompt: "" }, /at prompt/],
      [{ prompt: "p", output_format: "gif" }, /at output_format/],
    ] as const) {
      const result = (await client.callTool({ name: "generate_image", arguments: args })) as ToolResult;
      assert.equal(result.isError, true, JSON.stringify(args));
      assert.match(result.content[0]!.text!, /Invalid arguments for tool generate_image/);
      assert.match(result.content[0]!.text!, where);
    }
    assert.equal(requests, 0);
    await close();
  });

  it("explains missing configuration on the first call instead of failing to start", async () => {
    const { client, close } = await connectInMemory(() => loadConfig({}));
    const result = (await client.callTool({ name: "generate_image", arguments: { prompt: "p" } })) as ToolResult;
    assert.equal(result.isError, true);
    assert.match(result.content[0]!.text!, /Missing configuration: FOUNDRY_ENDPOINT, FOUNDRY_API_KEY, FOUNDRY_IMAGE_DEPLOYMENT/);
    await close();
  });
});

describe("stdio server process", () => {
  it("speaks MCP over stdio and generates an image end to end", async () => {
    respond = () => okImages(1);
    const dir = await mkdtemp(join(outDir, "stdio-"));
    const transport = new StdioClientTransport({
      command: join(process.cwd(), "node_modules/.bin/tsx"),
      args: [join(process.cwd(), "tools/foundry-image-mcp/server.ts")],
      env: {
        ...(process.env as Record<string, string>),
        FOUNDRY_ENDPOINT: origin,
        FOUNDRY_API_KEY: SECRET,
        FOUNDRY_IMAGE_DEPLOYMENT: "gpt-image-test",
        FOUNDRY_IMAGE_OUTPUT_DIR: dir,
      },
      stderr: "ignore",
    });
    const client = new Client({ name: "test", version: "0" });
    await client.connect(transport);
    try {
      assert.equal(client.getServerVersion()?.name, "foundry-image");
      const result = (await client.callTool({ name: "generate_image", arguments: { prompt: "a cat", quality: "low" } })) as ToolResult;
      assert.equal(result.isError, undefined);
      assert.equal(result.content.find((c) => c.type === "image")?.data, PNG_B64);
      assert.equal(seen!.body.quality, "low");
      assert.equal((await readdir(dir)).length, 1);
    } finally {
      await client.close();
    }
  });
});
