# foundry-image MCP server

A small [MCP](https://modelcontextprotocol.io) server (stdio) that lets an MCP
client, such as Claude Code, generate images with an OpenAI image model deployed
in **Microsoft Foundry**. It is independent of the ChargeGuard app: it only
shares the repository, so it can be moved to its own repo.

## Tool

`generate_image`

| Argument | Notes |
| --- | --- |
| `prompt` (required) | Up to 32,000 characters. |
| `n` | 1-4 images. Every image is billed. |
| `size` | `auto` or `WIDTHxHEIGHT`, for example `1024x1024`. Allowed sizes depend on the model. |
| `quality` | `low`, `medium`, `high`, `auto`. |
| `output_format` | `png` (default), `jpeg`, `webp`. |
| `background` | `transparent`, `opaque`, `auto`. Not every model supports it. |

Only the options you pass are sent to Foundry, so the service's own defaults and
validation apply. Images are written to `generated-images/` (git-ignored) under
a name the server chooses; the model never picks a path. The reply lists the
file paths and returns each image inline too, unless it is larger than
`FOUNDRY_MAX_INLINE_BYTES` (2 MB by default). Errors come back as tool errors
with a readable cause (bad key, unknown deployment, content filter, rate limit,
network). The API key never appears in them.

## Configuration

All through environment variables:

| Variable | Required | Meaning |
| --- | --- | --- |
| `FOUNDRY_ENDPOINT` | yes | Resource base URL, for example `https://<resource>.openai.azure.com`. `https` only (plain `http` is accepted for localhost, for tests). |
| `FOUNDRY_API_KEY` | yes | A key of that resource, sent in the `api-key` header. |
| `FOUNDRY_IMAGE_DEPLOYMENT` | yes | The **name you gave the deployment** of the image model, not the model ID. |
| `FOUNDRY_API_VERSION` | no | If set (for example `2025-04-01-preview`), calls `/openai/deployments/{name}/images/generations?api-version=...`. If empty, calls `/openai/v1/images/generations` with the deployment as `model`. |
| `FOUNDRY_IMAGE_OUTPUT_DIR` | no | Output folder, default `generated-images`. |
| `FOUNDRY_MAX_INLINE_BYTES` / `FOUNDRY_TIMEOUT_MS` | no | Defaults 2,000,000 and 180,000. |

If a required variable is missing the server still starts and the first call
explains which ones to set.

## Using it with Claude Code

The repository's `.mcp.json` registers the server as `foundry-image`. It is
picked up when a session starts, so open a new session after changing it.

- **Local:** export the three variables (or put them in your shell profile) and
  run `npm install` once.
- **Cloud sessions:** add the variables as secrets of the environment, make sure
  the environment installs the dependencies (`npm install`), and allow your
  Foundry host (`<resource>.openai.azure.com`, or `*.services.ai.azure.com`) in
  the environment's network policy, otherwise calls fail with a network error.

Run it by hand with `npm run mcp:foundry-image`. Tests: `npm test`
(`tests/foundry-image-mcp.test.ts`).

## What has and has not been verified

- **Verified:** the server against a local stand-in for the Foundry endpoint,
  over real stdio MCP: request URL, headers and body for both routes, image
  decoding and saving, every error mapping, argument validation, and the
  missing-configuration path. 19 automated tests.
- **Not verified:** any call to the real Foundry service. No credentials were
  available when this was written. In particular, which of the two routes your
  deployment accepts, which `api-version` the newest image models need, which
  arguments a given model accepts (`size`, `quality`, `background`), and the
  exact name and availability of the model. A catalog listing for
  `gpt-image-2.5-flare` exists, but its general availability was not confirmed.
- **Not supported:** image editing, Microsoft Entra (token) authentication, and
  responses that return a URL instead of base64.
- **It is a stdio server:** it runs where the MCP client starts it. It is not a
  network service you can call from elsewhere.
