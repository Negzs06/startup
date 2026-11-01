// MCP server (stdio) that generates images with an OpenAI image model deployed
// in Microsoft Foundry. Configuration comes from environment variables; see README.md.
//
// Never write to stdout here except through the transport: stdout carries the protocol.

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ConfigError, loadConfig, type FoundryConfig } from "./config";
import { FoundryError, generateImages } from "./foundry";

const inputSchema = {
  prompt: z.string().min(1).max(32_000).describe("What to draw. Be specific about subject, style, composition and any text that must appear."),
  n: z.number().int().min(1).max(4).optional().describe("How many images to generate (1-4). Each one is billed."),
  size: z
    .string()
    .regex(/^(auto|\d{3,4}x\d{3,4})$/, 'Use "auto" or WIDTHxHEIGHT, for example 1024x1024')
    .optional()
    .describe('Image size, for example "1024x1024", "1536x1024" or "auto". Supported sizes depend on the deployed model.'),
  quality: z.enum(["low", "medium", "high", "auto"]).optional().describe("Rendering quality; higher is slower and costs more."),
  output_format: z.enum(["png", "jpeg", "webp"]).optional().describe("File format. Defaults to png."),
  background: z.enum(["transparent", "opaque", "auto"]).optional().describe("Transparent backgrounds need png or webp. Not every model supports this."),
};

function textError(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

export function createServer(loadConfigFn: () => FoundryConfig = loadConfig, fetchImpl: typeof fetch = fetch): McpServer {
  const server = new McpServer({ name: "foundry-image", version: "0.1.0" });

  server.registerTool(
    "generate_image",
    {
      title: "Generate image (Microsoft Foundry)",
      description:
        "Generate one or more images from a text prompt with the OpenAI image model deployed in Microsoft Foundry. Images are saved to disk and the file paths are returned; small images are also returned inline.",
      inputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args): Promise<CallToolResult> => {
      let config: FoundryConfig;
      try {
        config = loadConfigFn();
      } catch (error) {
        return textError(error instanceof ConfigError ? error.message : "Invalid configuration.");
      }

      let images;
      try {
        images = await generateImages(config, args, fetchImpl);
      } catch (error) {
        return textError(error instanceof FoundryError ? error.message : "Unexpected error while generating the image.");
      }

      await mkdir(config.outputDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const lines: string[] = [];
      const content: CallToolResult["content"] = [];
      const skipped: string[] = [];

      for (const [index, image] of images.entries()) {
        // File names are generated here; the model never chooses a path.
        const path = join(config.outputDir, `image-${stamp}-${randomUUID().slice(0, 8)}-${index + 1}.${image.extension}`);
        await writeFile(path, image.bytes);
        lines.push(`${index + 1}. ${path} (${image.mimeType}, ${(image.bytes.length / 1024).toFixed(0)} KB)${image.revisedPrompt ? `\n   revised prompt: ${image.revisedPrompt}` : ""}`);
        if (image.bytes.length <= config.maxInlineBytes) {
          content.push({ type: "image", data: image.bytes.toString("base64"), mimeType: image.mimeType });
        } else {
          skipped.push(path);
        }
      }

      const note = skipped.length ? `\nNot returned inline (larger than ${config.maxInlineBytes} bytes); open the file instead:\n${skipped.join("\n")}` : "";
      return { content: [{ type: "text", text: `Generated ${images.length} image(s) with deployment "${config.deployment}":\n${lines.join("\n")}${note}` }, ...content] };
    },
  );

  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  console.error("foundry-image MCP server ready");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("foundry-image MCP server failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
