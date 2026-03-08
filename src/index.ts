import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import vm from "vm";
import {
    SpreadsheetAppEmulator,
    UtilitiesEmulator,
    DriveAppEmulator,
    ContentServiceEmulator,
    PropertiesServiceEmulator,
    DriveAdvancedServiceEmulator,
    Spreadsheet
} from "./emulator.js";

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
 * Common function to execute clasp commands
 */
async function runClasp(args: string[], cwd: string) {
    try {
        const { stdout, stderr } = await execAsync(`npx --yes -p @google/clasp clasp ${args.join(" ")}`, {
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
                description: "Pushes code from the specified directory",
                inputSchema: {
                    type: "object",
                    properties: {
                        directory: {
                            type: "string",
                            description: "Absolute path of the directory containing .clasp.json",
                        },
                    },
                    required: ["directory"],
                },
            },
            {
                name: "gas_status",
                description: "Shows the status of the GAS project",
                inputSchema: {
                    type: "object",
                    properties: {
                        directory: {
                            type: "string",
                            description: "Absolute path of the GAS project directory",
                        },
                    },
                    required: ["directory"],
                },
            },
            {
                name: "gas_run",
                description: "Executes the specified GAS function",
                inputSchema: {
                    type: "object",
                    properties: {
                        directory: {
                            type: "string",
                            description: "Absolute path of the GAS project directory",
                        },
                        functionName: {
                            type: "string",
                            description: "Function name to execute",
                        },
                    },
                    required: ["directory", "functionName"],
                },
            },
            {
                name: "gas_logs",
                description: "Gets the GAS execution logs",
                inputSchema: {
                    type: "object",
                    properties: {
                        directory: {
                            type: "string",
                            description: "Absolute path of the GAS project directory",
                        },
                    },
                    required: ["directory"],
                },
            },
            {
                name: "gas_deployments",
                description: "Shows the list of GAS project deployments",
                inputSchema: {
                    type: "object",
                    properties: {
                        directory: {
                            type: "string",
                            description: "Absolute path of the GAS project directory",
                        },
                    },
                    required: ["directory"],
                },
            },
            {
                name: "gas_deploy",
                description: "Deploys the GAS project",
                inputSchema: {
                    type: "object",
                    properties: {
                        directory: {
                            type: "string",
                            description: "Absolute path of the GAS project directory",
                        },
                        deploymentId: {
                            type: "string",
                            description: "Deployment ID to update (defaults to new creation)",
                        },
                        description: {
                            type: "string",
                            description: "Description of the deployment",
                        },
                    },
                    required: ["directory"],
                },
            },
            {
                name: "gas_emulate",
                description: "Executes GAS logic in a local emulator",
                inputSchema: {
                    type: "object",
                    properties: {
                        gasFilePath: {
                            type: "string",
                            description: "Absolute path of the .gs or .js file to execute",
                        },
                        functionName: {
                            type: "string",
                            description: "Function name to execute",
                        },
                        args: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of arguments to pass to the function",
                        },
                        mockState: {
                            type: "object",
                            description: "Initial state of the spreadsheet  { sheetName: [[row1], [row2]] }",
                        }
                    },
                    required: ["gasFilePath", "functionName"],
                },
            }
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "gas_emulate") {
        const gasFilePath = args?.gasFilePath as string;
        const functionName = args?.functionName as string;
        const funcArgs = (args?.args as any[]) || [];
        const mockState = args?.mockState as any;

        try {
            let gasCode = fs.readFileSync(gasFilePath, "utf8");

            // --- GAS Non-destructive Test Logic ---
            // 1. Remove Node-specific keywords that crash GAS
            gasCode = gasCode.replace(/module\.exports\s*=\s*(.*);?/g, "// $&");
            gasCode = gasCode.replace(/const\s+.*\s*=\s*require\(.*\);?/g, "// $&");
            gasCode = gasCode.replace(/^import\s+.*;?/gm, "// $&");

            // 2. Convert const/let to var for VM compatibility in some cases
            gasCode = gasCode.replace(/^(const|let) /gm, "var ");

            // Emulator instance creation
            const ss = new Spreadsheet("EmulatedSS");
            if (mockState) {
                ss.loadState(mockState);
            }

            const context = {
                SpreadsheetApp: {
                    ...SpreadsheetAppEmulator,
                    getActiveSpreadsheet: () => ss,
                    openById: (id: string) => ss,
                },
                Utilities: UtilitiesEmulator,
                DriveApp: DriveAppEmulator,
                ContentService: ContentServiceEmulator,
                PropertiesService: PropertiesServiceEmulator,
                Drive: DriveAdvancedServiceEmulator,
                UrlFetchApp: {
                    fetch: (url: string) => ({
                        getBlob: () => ({
                            setName: (n: string) => ({
                                name: n,
                                getDataAsString: () => "Ticker\tCode\nTest\t1234\n"
                            })
                        }),
                        getContentText: () => ""
                    })
                },
                console: {
                    log: (...m: any[]) => console.error(`[GAS_LOG] ${m.join(" ")}`),
                    error: (...m: any[]) => console.error(`[GAS_ERR] ${m.join(" ")}`),
                    warn: (...m: any[]) => console.error(`[GAS_WARN] ${m.join(" ")}`),
                },
                Date,
                Math,
                Object,
                Array,
                String,
                Number,
                JSON,
                Error,
                Buffer
            };

            const vmContext = vm.createContext(context);
            vm.runInContext(gasCode, vmContext);

            const targetFunc = (vmContext as any)[functionName];
            if (typeof targetFunc !== "function") {
                throw new Error(`Function '${functionName}' not found in ${gasFilePath}`);
            }

            const result = targetFunc(...funcArgs);
            const finalState = ss.dumpState();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            status: "success",
                            result: result,
                            finalState: finalState
                        }, null, 2)
                    }
                ]
            };
        } catch (e: any) {
            console.error(`[EMULATION_ERR] ${e.stack || e.message}`);
            return {
                content: [{ type: "text", text: `Emulation error: ${e.message}\n${e.stack || ""}` }],
                isError: true
            };
        }
    }

    const directory = args?.directory as string;
    if (!directory) {
        throw new Error("Directory path is required for non-emulation tools");
    }

    switch (name) {
        case "gas_push": {
            const result = await runClasp(["push", "-f"], directory);
            return {
                content: [{ type: "text", text: result.success ? `Successfully pushed to GAS.\n${result.stdout}` : `Failed to push to GAS.\n${result.stderr}` }],
                isError: !result.success,
            };
        }
        case "gas_status": {
            const result = await runClasp(["status"], directory);
            return {
                content: [{ type: "text", text: result.success ? `GAS Project Status:\n${result.stdout}` : `Failed to get status.\n${result.stderr}` }],
                isError: !result.success,
            };
        }
        case "gas_run": {
            const functionName = args?.functionName as string;
            if (!functionName) throw new Error("Function name is required");
            const result = await runClasp(["run", functionName], directory);
            return {
                content: [{ type: "text", text: result.success ? `Successfully executed function: ${functionName}\n${result.stdout}` : `Failed to execute function: ${functionName}\n${result.stderr}` }],
                isError: !result.success,
            };
        }
        case "gas_logs": {
            const result = await runClasp(["logs"], directory);
            return {
                content: [{ type: "text", text: result.success ? `GAS Execution Logs:\n${result.stdout}` : `Failed to get logs.\n${result.stderr}` }],
                isError: !result.success,
            };
        }
        case "gas_deployments": {
            const result = await runClasp(["deployments"], directory);
            return {
                content: [{ type: "text", text: result.success ? `GAS Deployments:\n${result.stdout}` : `Failed to get deployments.\n${result.stderr}` }],
                isError: !result.success,
            };
        }
        case "gas_deploy": {
            const deployArgs = ["deploy"];
            const deploymentId = args?.deploymentId as string;
            const description = args?.description as string;
            if (deploymentId) deployArgs.push("-i", deploymentId);
            if (description) deployArgs.push("-d", description);
            const result = await runClasp(deployArgs, directory);
            return {
                content: [{ type: "text", text: result.success ? `Successfully deployed GAS project.\n${result.stdout}` : `Failed to deploy GAS project.\n${result.stderr}` }],
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
    console.error("GAS Manager MCP server running on stdio (with Emulation support)");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
