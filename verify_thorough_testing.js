import fs from "fs";
import {
    Spreadsheet,
    SpreadsheetAppEmulator,
    UtilitiesEmulator,
    DriveAppEmulator,
    ContentServiceEmulator,
    DriveAdvancedServiceEmulator
} from "./out/emulator.js";
import vm from "vm";

const gasFilePath = "/home/irom/dev/project-stock2/stock-analyzer-server/gas_engine.gs";

const CONFIG = {
    SHEET_NAMES: {
        MASTER_LIST: "JPX_Master_List",
        FUNDAMENTALS: "Fundamentals_Master",
        FUNDAMENTALS_BACKUP: "Fundamentals_Backup_System",
        TEMP_ENGINE: "Temp_Engine_Work"
    }
};

async function runTestScenario(name, setupContext, testFn) {
    console.log(`\n=== Scenario: ${name} ===`);
    try {
        let gasCode = fs.readFileSync(gasFilePath, "utf8");
        gasCode = gasCode.replace(/^(const|let) /gm, "var ");

        const ss = new Spreadsheet("TestSS");
        ss.insertSheet(CONFIG.SHEET_NAMES.MASTER_LIST);

        const context = {
            SpreadsheetApp: {
                ...SpreadsheetAppEmulator,
                getActiveSpreadsheet: () => ss,
                openById: (id) => ss,
                getSheets: () => Object.values(ss.getSheets())
            },
            Utilities: UtilitiesEmulator,
            DriveApp: DriveAppEmulator,
            ContentService: ContentServiceEmulator,
            Drive: DriveAdvancedServiceEmulator,
            UrlFetchApp: {
                fetch: () => ({
                    getBlob: () => ({
                        setName: (n) => ({
                            name: n,
                            getDataAsString: () => "Ticker\tCode\nTest\t1234\nTest2\t5678"
                        })
                    }),
                    getContentText: () => ""
                })
            },
            console: {
                log: (...m) => console.log(`[GAS_LOG] ${m.join(" ")}`),
                error: (...m) => console.error(`[GAS_ERR] ${m.join(" ")}`),
                warn: (...m) => console.warn(`[GAS_WARN] ${m.join(" ")}`),
            },
            Date, Math, Object, Array, String, Number, JSON, Error, Buffer,
            ...setupContext(ss)
        };

        const vmContext = vm.createContext(context);
        vm.runInContext(gasCode, vmContext);

        await testFn(vmContext, ss);
        console.log(`Result:  PASSED`);
    } catch (e) {
        console.error(`Result:  FAILED - ${e.message}`);
        console.error(e.stack);
    }
}

async function main() {
    // 1. Normal Flow
    await runTestScenario("Normal Flow", (ss) => ({}), async (vmContext, ss) => {
        vmContext.logic_dailyTask_MasterRun();
        // Since we insert 'JPX_Master_List' at start, check for content
        const jpxSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.MASTER_LIST);
        // Note: JPX filtering expects /^\d{4}$/ on B column. 
        // Our mock Fetch returns "1234" and "5678" as codes.
    });

    // 2. Sticky Logic (0 guard)
    await runTestScenario("Sticky Logic (0 guard)", (ss) => {
        ss.loadState({
            [CONFIG.SHEET_NAMES.FUNDAMENTALS]: [
                ["code", "eps", "bps", "last_updated"],
                ["1234", 100, 1000, new Date(0).toISOString()]
            ]
        });
        return {};
    }, async (vmContext, ss) => {
        const originalInsert = ss.insertSheet.bind(ss);
        ss.insertSheet = (name) => {
            const sheet = originalInsert(name);
            if (name === CONFIG.SHEET_NAMES.TEMP_ENGINE) {
                sheet.getRange = (row, col, rows, cols) => {
                    const r = ss.getSheetByName(name).getRange(row, col, rows, cols);
                    return {
                        ...r,
                        getValues: () => Array(rows || 1).fill(0).map(() => [0, 0]),
                        setFormulas: () => { }
                    };
                };
            }
            return sheet;
        };

        vmContext.updateFundamentalsMaster(["1234"]);
        const fundSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.FUNDAMENTALS);
        const data = fundSheet.getValues();
        const row1234 = data.find(r => r[0] === "1234");
        if (row1234[1] !== 100 || row1234[2] !== 1000) {
            throw new Error(`Sticky Logic failed: expected 100/1000, got ${row1234[1]}/${row1234[2]}`);
        }
    });

    // 3. Execution Timeout
    await runTestScenario("Execution Timeout", (ss) => {
        let startTime = Date.now();
        const MockDate = class extends Date {
            constructor(arg) {
                if (arg) return new Date(arg);
                super();
                return new Date(startTime + 6 * 60 * 1000);
            }
            static now() { return startTime + 6 * 60 * 1000; }
        };
        return { Date: MockDate };
    }, async (vmContext, ss) => {
        vmContext.updateFundamentalsMaster(["1234", "5678"]);
    });

    // 4. A1 Notation and Helper Methods
    await runTestScenario("A1 Notation and Helpers", (ss) => ({}), async (vmContext, ss) => {
        const sheet = ss.insertSheet("A1Test");
        const range = sheet.getRange("B2:C3");
        range.setValues([[1, 2], [3, 4]]);

        const values = range.getValues();
        if (values[0][0] !== 1 || values[1][1] !== 4) throw new Error(`A1 set/get failed: got ${values[0][0]}, ${values[1][1]}`);

        if (sheet.getLastRow() !== 3) throw new Error(`getLastRow failed: expected 3, got ${sheet.getLastRow()}`);

        const b64 = vmContext.Utilities.base64Encode("Hello");
        if (b64 !== "SGVsbG8=") throw new Error(`base64Encode failed: ${b64}`);
    });
}

main();
