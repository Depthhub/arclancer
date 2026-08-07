import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ALL_MCP_TOOLS, WRITE_TOOLS } from "../../shared/src/tools/definitions.js";
import { jsonSchemaToZodShape } from "./zodFromJson.js";
import { ArcLancerService } from "./service.js";
import { MCP_PROMPTS, renderPrompt } from "./prompts.js";
import type { UserContext } from "../../shared/src/context/UserContext.js";
import type { JsonStore } from "../../shared/src/store/types.js";

export function createArcLancerMcpServer(user: UserContext, store: JsonStore): McpServer {
  const server = new McpServer(
    {
      name: "arclancer",
      version: "0.1.0",
    },
    {
      instructions:
        "ArcLancer MCP — milestone escrow, AI agents, and USDC payments on Arc Testnet. " +
        "Use request_confirmation before on-chain writes. Never expose private keys.",
    }
  );

  const service = new ArcLancerService(store, user);
  const assertReadScope = () => {
    if (user.scopes && !user.scopes.includes("arclancer:read")) {
      throw new Error("OAuth scope arclancer:read is required");
    }
  };

  for (const tool of ALL_MCP_TOOLS) {
    server.registerTool(
      tool.name,
      {
        description: tool.description ?? tool.name,
        inputSchema: jsonSchemaToZodShape(tool.inputSchema as Record<string, unknown>),
      },
      async (args: Record<string, unknown>) => {
        try {
          if (user.scopes && !user.scopes.includes("arclancer:read")) {
            return {
              content: [{ type: "text" as const, text: "OAuth scope arclancer:read is required." }],
              isError: true,
            };
          }
          if (
            user.scopes &&
            WRITE_TOOLS.has(tool.name) &&
            !user.scopes.includes("arclancer:write")
          ) {
            return {
              content: [{ type: "text" as const, text: "OAuth scope arclancer:write is required." }],
              isError: true,
            };
          }
          const result = await service.callTool(tool.name, args ?? {});
          return {
            content: [{ type: "text" as const, text: result.content }],
            isError: result.isError,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Tool call failed";
          return {
            content: [
              {
                type: "text" as const,
                text: `ArcLancer tool error (${tool.name}): ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  server.registerResource(
    "agents",
    "arclancer://agents",
    {
      description: "All registered AI agents on ArcLancer marketplace",
      mimeType: "application/json",
    },
    async () => {
      assertReadScope();
      const { text } = await service.readResource("arclancer://agents");
      return {
        contents: [{ uri: "arclancer://agents", mimeType: "application/json", text }],
      };
    }
  );

  server.registerResource(
    "jobs",
    "arclancer://jobs",
    {
      description: "Published freelance job listings",
      mimeType: "application/json",
    },
    async () => {
      assertReadScope();
      const jobs = await service.callTool("search_jobs", {});
      return {
        contents: [
          {
            uri: "arclancer://jobs",
            mimeType: "application/json",
            text: jobs.content,
          },
        ],
      };
    }
  );

  for (const prompt of MCP_PROMPTS) {
    const argsSchema: Record<string, z.ZodOptional<z.ZodString>> = {};
    for (const arg of prompt.arguments) {
      argsSchema[arg.name] = z.string().optional();
    }

    server.registerPrompt(
      prompt.name,
      {
        description: prompt.description,
        argsSchema,
      },
      async (args: Record<string, string | undefined>) => {
        const rendered = renderPrompt(prompt.name, args);
        if (!rendered) throw new Error(`Prompt ${prompt.name} failed`);
        return rendered;
      }
    );
  }

  return server;
}
