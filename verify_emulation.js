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

// 
const gasFilePath = "/home/irom/dev/project-stock2/stock-analyzer-server/gas_engine.gs";
const functionName = "logic_dailyTask_MasterRun";
const mockState = {
    "JPX_Master_List": [],
    "Fundamentals_Master": [
        ["Ticker", "Name", "EPS", "BPS"],
        ["1234", "Test Stock", 100, 1000]
    ]
};

async function testEmulation() {
    console.log("Starting Emulation Test...");
    try {
        let gasCode = fs.readFileSync(gasFilePath, "utf8");
        gasCode = gasCode.replace(/^(const|let) /gm, "var ");

        const ss = new Spreadsheet("TestSS");
        ss.loadState(mockState);

        const context = {
            SpreadsheetApp: {
                ...SpreadsheetAppEmulator,
                getActiveSpreadsheet: () => ss,
                openById: (id) => ({
                    ...ss,
                    getSheets: () => [ss.getSheetByName("JPX_Master_List") || ss.insertSheet("JPX_Master_List")]
                }),
                getSheets: () => [ss.getSheetByName("JPX_Master_List") || ss.insertSheet("JPX_Master_List")]
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
            Date, Math, Object, Array, String, Number, JSON, Error
        };

        const vmContext = vm.createContext(context);
        vm.runInContext(gasCode, vmContext);

        const testFunc = vmContext[functionName];
        if (testFunc) {
            console.log(`Running ${functionName}...`);
            testFunc();
            console.log("Success!");
            console.log("Final State of JPX_Master_List:");
            console.log(JSON.stringify(ss.getSheetByName("JPX_Master_List")?.data.slice(0, 5), null, 2));
        } else {
            console.log(`Function ${functionName} not found.`);
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

testEmulation();
