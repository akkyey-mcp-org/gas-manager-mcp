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
    ScriptAppEmulator,
    Spreadsheet,
    detectDuplicateFunctions,
    detectDeadCode,
    detectUndefinedCalls,
    detectSwallowedErrors,
    LoggerEmulator,
    TestAssertions
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
                            description: "Absolute path of the .gs or .js file to execute, or a directory containing .gs files",
                        },
                        gasFilePaths: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of absolute paths to .gs files to load (alternative to gasFilePath for multi-file projects)",
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
        const gasFilePaths = args?.gasFilePaths as string[] | undefined;
        const functionName = args?.functionName as string;
        const funcArgs = (args?.args as any[]) || [];
        const mockState = args?.mockState as any;

        try {
            // ========================================
            // Step 2: 複数ファイル結合ロード
            // ========================================
            let combinedCode = "";
            const fileMap: { name: string; startLine: number; endLine: number }[] = [];
            let currentLine = 1;

            // ファイルリストの構築
            let filesToLoad: string[] = [];

            if (gasFilePaths && gasFilePaths.length > 0) {
                // 明示的な複数ファイル指定
                filesToLoad = gasFilePaths;
            } else if (gasFilePath) {
                const stat = fs.statSync(gasFilePath);
                if (stat.isDirectory()) {
                    // ディレクトリ指定: 全 .gs ファイルを収集
                    const entries = fs.readdirSync(gasFilePath)
                        .filter(f => f.endsWith(".gs") || f.endsWith(".js"))
                        .sort(); // アルファベット順で安定したロード順
                    filesToLoad = entries.map(f => path.join(gasFilePath, f));
                } else {
                    // 単一ファイル指定（後方互換）
                    filesToLoad = [gasFilePath];
                }
            }

            if (filesToLoad.length === 0) {
                throw new Error("No .gs files found to load.");
            }

            // ファイル結合
            for (const filePath of filesToLoad) {
                const code = fs.readFileSync(filePath, "utf8");
                const lineCount = code.split("\n").length;
                const fileName = path.basename(filePath);

                fileMap.push({
                    name: fileName,
                    startLine: currentLine,
                    endLine: currentLine + lineCount - 1
                });

                combinedCode += `// ===== FILE: ${fileName} =====\n`;
                combinedCode += code + "\n";
                currentLine += lineCount + 1; // +1 for the file header comment
            }

            // ========================================
            // Step 1: 重複関数の静的検出
            // ========================================
            const duplicates = detectDuplicateFunctions(combinedCode, fileMap);
            const warnings: string[] = [];

            if (duplicates.length > 0) {
                for (const dup of duplicates) {
                    const locations = dup.locations.map(l =>
                        `  - Line ${l.line}${l.file ? ` (${l.file})` : ""}`
                    ).join("\n");
                    const lastDef = dup.locations[dup.locations.length - 1]!;
                    warnings.push(
                        `⚠️ DUPLICATE FUNCTION: '${dup.name}' is defined ${dup.locations.length} times:\n` +
                        `${locations}\n` +
                        `  → GAS will use the LAST definition (Line ${lastDef.line}${lastDef.file ? `, ${lastDef.file}` : ""})`
                    );
                }
                console.error(`[STATIC_ANALYSIS] ${warnings.join("\n")}`);
            }

            // --- GAS Non-destructive Code Transform ---
            let gasCode = combinedCode;
            gasCode = gasCode.replace(/module\.exports\s*=\s*(.*);?/g, "// $&");
            gasCode = gasCode.replace(/const\s+.*\s*=\s*require\(.*\);?/g, "// $&");
            gasCode = gasCode.replace(/^import\s+.*;?/gm, "// $&");
            gasCode = gasCode.replace(/^(const|let) /gm, "var ");

            // エミュレータインスタンスの作成
            const ss = new Spreadsheet("EmulatedSS");
            if (mockState) {
                ss.loadState(mockState);
            }

            // B1: コンソール出力キャプチャ
            const capturedLogs: { level: string; message: string }[] = [];

            // C1: Logger モック
            const logger = new LoggerEmulator();

            // D1: アサーション関数
            const assertions = new TestAssertions();

            // B3: API 呼び出し回数トラッキング
            const apiCalls: { [service: string]: number } = {};
            const trackApi = (service: string) => {
                apiCalls[service] = (apiCalls[service] || 0) + 1;
            };

            const context = {
                SpreadsheetApp: {
                    ...SpreadsheetAppEmulator,
                    getActiveSpreadsheet: () => { trackApi("SpreadsheetApp"); return ss; },
                    openById: (id: string) => { trackApi("SpreadsheetApp.openById"); return ss; },
                },
                Utilities: UtilitiesEmulator,
                DriveApp: DriveAppEmulator,
                ContentService: ContentServiceEmulator,
                PropertiesService: PropertiesServiceEmulator,
                Drive: DriveAdvancedServiceEmulator,
                ScriptApp: ScriptAppEmulator,
                Logger: logger,
                // D1: アサーション関数をグローバルに注入
                assertEqual: assertions.assertEqual.bind(assertions),
                assertTrue: assertions.assertTrue.bind(assertions),
                assertFalse: assertions.assertFalse.bind(assertions),
                assertNotNull: assertions.assertNotNull.bind(assertions),
                assertThrows: assertions.assertThrows.bind(assertions),
                UrlFetchApp: {
                    fetch: (url: string, options?: any) => {
                        trackApi("UrlFetchApp.fetch");
                        return {
                            getBlob: () => ({
                                setName: (n: string) => ({
                                    name: n,
                                    getDataAsString: () => "Ticker\tCode\nTest\t1234\n"
                                })
                            }),
                            getContentText: () => "",
                            getResponseCode: () => 200
                        };
                    }
                },
                // B1: コンソール出力のキャプチャ
                console: {
                    log: (...m: any[]) => {
                        const msg = m.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ");
                        capturedLogs.push({ level: "log", message: msg });
                        console.error(`[GAS_LOG] ${msg}`);
                    },
                    error: (...m: any[]) => {
                        const msg = m.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ");
                        capturedLogs.push({ level: "error", message: msg });
                        console.error(`[GAS_ERR] ${msg}`);
                    },
                    warn: (...m: any[]) => {
                        const msg = m.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ");
                        capturedLogs.push({ level: "warn", message: msg });
                        console.error(`[GAS_WARN] ${msg}`);
                    },
                    info: (...m: any[]) => {
                        const msg = m.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ");
                        capturedLogs.push({ level: "info", message: msg });
                    },
                },
                Date,
                Math,
                Object,
                Array,
                String,
                Number,
                JSON,
                Error,
                Buffer,
                parseInt,
                parseFloat,
                isNaN,
                isFinite,
                RegExp,
                Map,
                Set,
                Promise,
                setTimeout: (fn: Function, ms: number) => fn(),
                encodeURIComponent,
                decodeURIComponent,
            };

            const vmContext = vm.createContext(context);
            vm.runInContext(gasCode, vmContext);

            const targetFunc = (vmContext as any)[functionName];
            if (typeof targetFunc !== "function") {
                const availableFuncs = Object.keys(vmContext as any)
                    .filter(k => typeof (vmContext as any)[k] === "function")
                    .join(", ");
                throw new Error(
                    `Function '${functionName}' not found.\n` +
                    `Available functions: ${availableFuncs}`
                );
            }

            // B2: 実行時間計測
            const startTime = Date.now();
            const result = targetFunc(...funcArgs);
            const executionTimeMs = Date.now() - startTime;
            const finalState = ss.dumpState();

            // ========================================
            // A1: デッドコード検出
            // ========================================
            const deadCode = detectDeadCode(combinedCode, fileMap);
            if (deadCode.length > 0) {
                const deadList = deadCode.map(d =>
                    `  - ${d.name} (Line ${d.line}${d.file ? `, ${d.file}` : ""})`
                ).join("\n");
                warnings.push(
                    `🪦 DEAD CODE: ${deadCode.length} function(s) defined but never called:\n${deadList}`
                );
            }

            // ========================================
            // A2: 未定義関数呼び出し検出
            // ========================================
            const undefinedCalls = detectUndefinedCalls(combinedCode, fileMap);
            if (undefinedCalls.length > 0) {
                const undefList = undefinedCalls.map(u =>
                    `  - ${u.name}() (Line ${u.line}${u.file ? `, ${u.file}` : ""})`
                ).join("\n");
                warnings.push(
                    `❓ UNDEFINED CALLS: ${undefinedCalls.length} function(s) called but not defined:\n${undefList}`
                );
            }

            // ========================================
            // A6: 飲み込まれたエラーの検出
            // ========================================
            const swallowed = detectSwallowedErrors(combinedCode, fileMap);
            if (swallowed.length > 0) {
                const swallowedList = swallowed.map(s =>
                    `  - Line ${s.line}${s.file ? ` (${s.file})` : ""}: ${s.type}`
                ).join("\n");
                warnings.push(
                    `🤐 SWALLOWED ERRORS: ${swallowed.length} empty catch block(s):\n${swallowedList}`
                );
            }

            // B2: 6分制限警告
            const executionWarnings: string[] = [];
            if (executionTimeMs > 300000) { // 5分超
                executionWarnings.push(`⏰ CRITICAL: Execution took ${(executionTimeMs/1000).toFixed(1)}s — approaching GAS 6-minute limit!`);
            } else if (executionTimeMs > 60000) { // 1分超
                executionWarnings.push(`⏱️ WARNING: Execution took ${(executionTimeMs/1000).toFixed(1)}s — monitor for GAS timeout risk.`);
            }
            warnings.push(...executionWarnings);

            // アサーション結果の収集
            const testResults = assertions.getResults().length > 0
                ? assertions.getSummary()
                : undefined;

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            status: "success",
                            result: result,
                            warnings: warnings.length > 0 ? warnings : undefined,
                            filesLoaded: fileMap.map(f => f.name),
                            logs: capturedLogs.length > 0 ? capturedLogs : undefined,
                            loggerOutput: logger.getLogs().length > 0 ? logger.getLogs() : undefined,
                            testResults: testResults,
                            apiCalls: Object.keys(apiCalls).length > 0 ? apiCalls : undefined,
                            executionTimeMs,
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
