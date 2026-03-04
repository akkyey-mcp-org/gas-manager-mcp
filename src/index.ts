import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

const server = new Server(
    {
        name: "gas-manager-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * claspコマンドを実行する共通関数
 */
async function runClasp(args: string[], cwd: string) {
    try {
        // npx を経由して clasp を実行
        const { stdout, stderr } = await execAsync(`npx clasp ${args.join(" ")}`, {
            cwd,
        });
        return { stdout, stderr, success: true };
    } catch (error: any) {
        return {
            stdout: error.stdout || "",
            stderr: error.stderr || error.message,
            success: false,
        };
    }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "gas_push",
                description: "指定したディレクトリのコードをGASへプッシュします",
                inputSchema: {
                    type: "object",
                    properties: {
                        directory: {
                            type: "string",
                            description: "GASのソースコード（.clasp.json）が含まれるディレクトリの絶対パス",
                        },
                    },
                    required: ["directory"],
                },
            },
            {
                name: "gas_status",
                description: "GASプロジェクトのステータスを表示します",
                inputSchema: {
                    type: "object",
                    properties: {
                        directory: {
                            type: "string",
                            description: "GASプロジェクトのディレクトリの絶対パス",
                        },
                    },
                    required: ["directory"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const directory = args?.directory as string;

    if (!directory) {
        throw new Error("Directory path is required");
    }

    switch (name) {
        case "gas_push": {
            const result = await runClasp(["push", "-f"], directory);
            return {
                content: [
                    {
                        type: "text",
                        text: result.success
                            ? `Successfully pushed to GAS.\n${result.stdout}`
                            : `Failed to push to GAS.\n${result.stderr}`,
                    },
                ],
                isError: !result.success,
            };
        }
        case "gas_status": {
            const result = await runClasp(["status"], directory);
            return {
                content: [
                    {
                        type: "text",
                        text: result.success
                            ? `GAS Project Status:\n${result.stdout}`
                            : `Failed to get status.\n${result.stderr}`,
                    },
                ],
                isError: !result.success,
            };
        }
        default:
            throw new Error("Unknown tool");
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("GAS Manager MCP server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
