import fs from "fs";
import path from "path";
import vm from "vm";
import {
    Spreadsheet,
    SpreadsheetAppEmulator,
    PropertiesServiceEmulator,
    LoggerEmulator,
    detectDuplicateFunctions,
    detectDeadCode,
    detectUndefinedCalls
} from "./out/emulator.js";

const testGasDir = "./test-gas";

async function runIntegrationTest() {
    console.log("=== Integration Test Started ===");
    
    // 1. ファイル読み込みと結合
    const files = fs.readdirSync(testGasDir).filter(f => f.endsWith(".gs"));
    let combinedCode = "";
    const fileMap = [];
    let currentLine = 1;

    for (const f of files) {
        const content = fs.readFileSync(path.join(testGasDir, f), "utf8");
        const lines = content.split("\n").length;
        fileMap.push({ name: f, startLine: currentLine, endLine: currentLine + lines - 1 });
        combinedCode += content + "\n";
        currentLine += lines;
    }

    // コード変換 (const/let -> var)
    combinedCode = combinedCode.replace(/^(const|let) /gm, "var ");

    // 2. 静的解析
    console.log("\n[Static Analysis]");
    const duplicates = detectDuplicateFunctions(combinedCode);
    console.log(`- Duplicates: ${duplicates.length}`);

    const deadCodeArray = detectDeadCode(combinedCode);
    console.log(`- Dead Code: ${deadCodeArray.length} (${deadCodeArray.map(f => f.name).join(", ")})`);

    const definedNames = new Set(combinedCode.match(/function\s+([a-zA-Z0-9_$]+)/g)?.map(m => m.split(/\s+/)[1]) || []);
    const undefinedCalls = detectUndefinedCalls(combinedCode, definedNames, fileMap);
    console.log(`- Undefined Calls: ${undefinedCalls.length}`);
    undefinedCalls.forEach(c => console.log(`  ! ${c.name} at ${c.file}:${c.line}`));

    // 3. エミュレーション実行
    console.log("\n[Emulation Execution]");
    const ss = new Spreadsheet("IntegrationSS");
    const logger = new LoggerEmulator();
    
    const context = {
        SpreadsheetApp: {
            ...SpreadsheetAppEmulator,
            getActiveSpreadsheet: () => ss,
        },
        PropertiesService: PropertiesServiceEmulator,
        Logger: logger,
        console: {
            log: (...m) => console.log(`[GAS_LOG] ${m.join(" ")}`),
        },
        Date, Math, Object, Array, String, Number, JSON, Error, Buffer
    };

    try {
        const vmContext = vm.createContext(context);
        vm.runInContext(combinedCode, vmContext);
        
        const result = vmContext.main();
        console.log("- main() executed successfully");
        console.log("- Result:", JSON.stringify(result));
        
        // 検証
        const sheet = ss.getSheetByName("IntegratedTest");
        if (sheet && sheet.getLastRow() === 3) {
            console.log("- Spreadsheet verification: PASSED");
        } else {
            console.log("- Spreadsheet verification: FAILED", sheet ? `row count: ${sheet.getLastRow()}` : "sheet not found");
        }

        const lastRun = PropertiesServiceEmulator.getScriptProperties().getProperty("last_run");
        if (lastRun) {
            console.log("- PropertiesService verification: PASSED (" + lastRun + ")");
        } else {
            console.log("- PropertiesService verification: FAILED");
        }

    } catch (e) {
        console.error("- Execution FAILED:", e.message);
        console.error(e.stack);
    }

    console.log("\n=== Integration Test Finished ===");
}

runIntegrationTest();
