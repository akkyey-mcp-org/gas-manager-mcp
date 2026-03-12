/**
 *  GAS Emulator Core (TypeScript) - Fixed & Improved Version
 */

export class Range {
    constructor(
        private data: any[][],
        private row: number,
        private col: number,
        private rows: number,
        private cols: number
    ) { }

    getValues(): any[][] {
        const result: any[][] = [];
        for (let r = 0; r < this.rows; r++) {
            const rowIndex = this.row - 1 + r;
            const rowData = this.data[rowIndex] || [];
            result.push(rowData.slice(this.col - 1, this.col - 1 + this.cols).map(v => v === undefined ? "" : v));
        }
        result.forEach(r => {
            while (r.length < this.cols) r.push("");
        });
        return result;
    }

    setValues(values: any[][]): void {
        for (let r = 0; r < Math.min(values.length, this.rows); r++) {
            const targetRowIndex = this.row - 1 + r;
            if (!this.data[targetRowIndex]) {
                this.data[targetRowIndex] = [];
            }
            const rowData = values[r];
            if (!rowData) continue;
            for (let c = 0; c < Math.min(rowData.length, this.cols); c++) {
                const targetColIndex = this.col - 1 + c;
                this.data[targetRowIndex][targetColIndex] = rowData[c];
            }
        }
    }

    setFormulas(formulas: string[][]): void {
        const mockValues = formulas.map((row) =>
            row.map((formula) => {
                if (formula.includes("GOOGLEFINANCE")) {
                    if (formula.includes('"price"')) return 1000 + Math.random() * 100;
                    if (formula.includes('"eps"')) return 50 + Math.random() * 10;
                    if (formula.includes('"pbr"')) return 1.2;
                    if (formula.includes('"pe"')) return 15.0;
                    if (formula.includes('"priceToBook"')) return 1.2;
                    if (formula.includes('"marketcap"')) return 1000000;
                }
                return 0;
            })
        );
        this.setValues(mockValues);
    }

    clearContent(): void {
        for (let r = 0; r < this.rows; r++) {
            const targetRow = this.data[this.row - 1 + r];
            if (targetRow) {
                for (let c = 0; c < this.cols; c++) {
                    targetRow[this.col - 1 + c] = "";
                }
            }
        }
    }

    copyTo(destRange: Range): void {
        destRange.setValues(this.getValues());
    }

    getValue(): any {
        const values = this.getValues();
        return values[0] ? values[0][0] : "";
    }

    setValue(value: any): void {
        this.setValues([[value]]);
    }
}

export class Sheet {
    public data: any[][] = [];

    constructor(private name: string) { }

    getDataRange(): Range {
        const rows = this.data.length;
        const cols = rows > 0 ? Math.max(...this.data.map(r => r ? r.length : 0)) : 0;
        return new Range(this.data, 1, 1, Math.max(rows, 1), Math.max(cols, 1));
    }

    getRange(row: any, col?: number, rows?: number, cols?: number): Range {
        if (typeof row === "string") {
            const match = row.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
            if (match) {
                const colStart = this.columnNameToIndex(match[1] as string);
                const rowStart = parseInt(match[2] as string);
                if (match[3]) {
                    const colEnd = this.columnNameToIndex(match[3] as string);
                    const rowEnd = parseInt(match[4] as string);
                    return new Range(this.data, rowStart, colStart, rowEnd - rowStart + 1, colEnd - colStart + 1);
                }
                return new Range(this.data, rowStart, colStart, 1, 1);
            }
            throw new Error(`Unsupported A1 notation: ${row}`);
        }

        const rStart = row as number;
        const cStart = col || 1;
        const rCount = rows || 1;
        const cCount = cols || 1;

        while (this.data.length < rStart + rCount - 1) {
            this.data.push([]);
        }

        return new Range(this.data, rStart, cStart, rCount, cCount);
    }

    private columnNameToIndex(name: string): number {
        let index = 0;
        for (let i = 0; i < name.length; i++) {
            index = index * 26 + (name.charCodeAt(i) - 64);
        }
        return index;
    }

    getLastRow(): number {
        let lastRow = 0;
        for (let i = 0; i < this.data.length; i++) {
            const row = this.data[i];
            if (row && row.some(v => v !== "" && v !== null && v !== undefined)) {
                lastRow = i + 1;
            }
        }
        return lastRow;
    }

    appendRow(row: any[]): void {
        this.data.push(row);
    }

    clear(): void {
        this.data = [];
    }

    getName(): string {
        return this.name;
    }

    getValues(): any[][] {
        return this.getDataRange().getValues();
    }
}

export class Spreadsheet {
    private sheets: { [key: string]: Sheet } = {};

    constructor(private name: string) { }

    getSheetByName(name: string): Sheet | null {
        return this.sheets[name] || null;
    }

    getSheets(): Sheet[] {
        return Object.values(this.sheets);
    }

    insertSheet(name: string): Sheet {
        const s = new Sheet(name);
        this.sheets[name] = s;
        return s;
    }

    getName(): string {
        return this.name;
    }

    getId(): string {
        return "mock_ss_id_" + this.name;
    }

    flush(): void { }

    dumpState(): any {
        const state: any = {};
        for (const name in this.sheets) {
            const s = this.sheets[name];
            if (s) state[name] = s.data;
        }
        return state;
    }

    loadState(state: any): void {
        for (const name in state) {
            const s = this.insertSheet(name);
            s.data = JSON.parse(JSON.stringify(state[name]));
        }
    }
}

export const SpreadsheetAppEmulator = {
    activeSpreadsheet: new Spreadsheet("MockSpreadsheet"),
    // IDベースのキャッシュ: 同一IDに対して同一インスタンスを返す
    _openedById: {} as { [id: string]: Spreadsheet },
    getActiveSpreadsheet() {
        return this.activeSpreadsheet;
    },
    openById(id: string) {
        if (!this._openedById[id]) {
            this._openedById[id] = new Spreadsheet(`Spreadsheet_${id}`);
        }
        return this._openedById[id];
    },
    flush() { },
    // テスト用: キャッシュをリセット
    _reset() {
        this._openedById = {};
        this.activeSpreadsheet = new Spreadsheet("MockSpreadsheet");
    }
};

export const UtilitiesEmulator = {
    sleep(ms: number) { },
    newBlob(content: any, type?: string, name?: string) {
        return {
            getDataAsString: () => typeof content === 'string' ? content : JSON.stringify(content),
            getName: () => name || "blob",
            setContentType: (t: string) => { },
        };
    },
    parseCsv(content: string): string[][] {
        return content.trim().split("\n").map((l) => l.split(",").map(v => v.trim()));
    },
    base64Encode(data: string) {
        return Buffer.from(data).toString('base64');
    },
    formatDate(date: Date, tz: string, format: string) {
        return date.toISOString();
    }
};

export const DriveAppEmulator = {
    getRootFolder() {
        return this.createMockFolder("root");
    },
    getFolderById(id: string) {
        return this.createMockFolder(`folder_${id}`);
    },
    getFileById(id: string) {
        return this.createMockFile(id);
    },
    getFoldersByName(name: string) {
        let found = false;
        return {
            hasNext: () => {
                const res = !found;
                found = true;
                return res;
            },
            next: () => this.createMockFolder(name)
        };
    },
    createMockFolder(name: string): any {
        return {
            getName: () => name,
            getId: () => `id_${name}`,
            createFolder: (n: string) => this.createMockFolder(n),
            createFile: (n: string, c: string) => this.createMockFile(n, c),
            getFoldersByName: (n: string) => this.getFoldersByName(n),
            getFilesByName: (n: string) => ({ hasNext: () => false, next: () => null }),
            searchFiles: (q: string) => ({ hasNext: () => false, next: () => null }),
        };
    },
    createMockFile(id: string, name?: string): any {
        return {
            getId: () => id,
            getName: () => name || `File_${id}`,
            getBlob: () => UtilitiesEmulator.newBlob("mock content"),
            setTrashed: (v: boolean) => { },
            getUrl: () => `https://drive.google.com/item/${id}`,
            getParents: () => ({ hasNext: () => false, next: () => null }),
            moveTo: (f: any) => { }
        };
    }
};

export const ContentServiceEmulator = {
    createTextOutput(content: string) {
        return {
            setMimeType: (type: string) => ({
                content,
                mimeType: type,
                setMimeType: (t: string) => ({ content, mimeType: t })
            }),
        };
    },
    MimeType: {
        TEXT: "text/plain",
        JSON: "application/json",
        CSV: "text/csv",
    },
};

export class PropertiesServiceEmulatorClass {
    private props: { [key: string]: string } = {};
    getScriptProperties() {
        return {
            getProperty: (key: string) => this.props[key] || null,
            setProperty: (key: string, value: any) => { this.props[key] = String(value); },
            deleteProperty: (key: string) => { delete this.props[key]; },
            getProperties: () => ({ ...this.props }),
            deleteAllProperties: () => { this.props = {}; },
            setProperties: (p: any) => { Object.assign(this.props, p); }
        };
    }
}

export const PropertiesServiceEmulator = new PropertiesServiceEmulatorClass();

export const DriveAdvancedServiceEmulator = {
    Files: {
        create: (metadata: any, blob: any) => ({
            id: `id_${metadata.name}`,
            name: metadata.name
        }),
        remove: (id: string) => { }
    }
};

/**
 * ScriptApp モック
 * トリガー管理やスクリプトIDの取得をエミュレート
 */
export const ScriptAppEmulator = {
    getProjectTriggers() {
        return [];
    },
    getScriptId() {
        return "mock_script_id_emulated";
    },
    newTrigger(funcName: string) {
        return {
            timeBased: () => ({
                everyMinutes: (m: number) => ({ create: () => ({}) }),
                everyHours: (h: number) => ({ create: () => ({}) }),
                atHour: (h: number) => ({ nearMinute: (m: number) => ({ everyDays: (d: number) => ({ create: () => ({}) }) }) }),
            })
        };
    },
    deleteTrigger(trigger: any) { }
};

/**
 * GAS コードの静的解析: 重複関数の検出
 * @param code - 結合済みの GAS ソースコード
 * @param fileMap - ファイル名→行数のマップ（複数ファイル結合時の位置特定用）
 * @returns 検出された重複情報の配列
 */
export function detectDuplicateFunctions(
    code: string,
    fileMap?: { name: string; startLine: number; endLine: number }[]
): { name: string; locations: { line: number; file?: string }[] }[] {
    const seen: { [name: string]: { line: number; file?: string }[] } = {};
    const lines = code.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const match = line.match(/^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
        if (match && match[1]) {
            const funcName = match[1];
            if (!seen[funcName]) seen[funcName] = [];

            // ファイルマップがある場合、どのファイルに属するか特定
            let fileName: string | undefined = undefined;
            if (fileMap) {
                for (const fm of fileMap) {
                    if (i + 1 >= fm.startLine && i + 1 <= fm.endLine) {
                        fileName = fm.name;
                        break;
                    }
                }
            }

            const entry: { line: number; file?: string } = { line: i + 1 };
            if (fileName) entry.file = fileName;
            seen[funcName]!.push(entry);
        }
    }

    // 2回以上定義されている関数のみを返す
    const duplicates: { name: string; locations: { line: number; file?: string }[] }[] = [];
    for (const name in seen) {
        const locs = seen[name];
        if (locs && locs.length > 1) {
            duplicates.push({ name, locations: locs });
        }
    }
    return duplicates;
}

// GAS のビルトインオブジェクト・関数一覧（これらは「未定義」として報告しない）
const GAS_BUILTINS = new Set([
    // グローバルサービス
    "SpreadsheetApp", "DriveApp", "UrlFetchApp", "ContentService",
    "PropertiesService", "ScriptApp", "CacheService", "LockService",
    "HtmlService", "MailApp", "GmailApp", "CalendarApp", "Session",
    "Utilities", "Logger", "Browser", "Drive", "FormApp",
    // JavaScript グローバル
    "console", "JSON", "Math", "Date", "Object", "Array", "String",
    "Number", "Error", "RegExp", "Map", "Set", "Promise", "Buffer",
    "parseInt", "parseFloat", "isNaN", "isFinite", "setTimeout",
    "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI",
    "undefined", "null", "true", "false", "NaN", "Infinity",
    // よくある GAS パターン
    "e", "err", "error",
]);

/**
 * A1: デッドコード検出
 * 定義されているがどこからも呼ばれていない関数を検出
 * @param code - 結合済みの GAS ソースコード
 * @param fileMap - ファイル名→行数のマップ
 * @param entryPoints - エントリーポイント（トリガーや Web App の受口）
 */
export function detectDeadCode(
    code: string,
    fileMap?: { name: string; startLine: number; endLine: number }[],
    entryPoints: string[] = [
        "doGet", "doPost", "onOpen", "onEdit", "onInstall",
        "onSelectionChange", "onFormSubmit"
    ]
): { name: string; line: number; file?: string | undefined }[] {
    const lines = code.split("\n");

    // 1. 全関数定義を収集
    const definedFunctions: { name: string; line: number; file?: string | undefined }[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const match = line.match(/^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
        if (match && match[1]) {
            let fileName: string | undefined;
            if (fileMap) {
                for (const fm of fileMap) {
                    if (i + 1 >= fm.startLine && i + 1 <= fm.endLine) {
                        fileName = fm.name;
                        break;
                    }
                }
            }
            const entry: { name: string; line: number; file?: string | undefined } = { name: match[1], line: i + 1 };
            if (fileName) entry.file = fileName;
            definedFunctions.push(entry);
        }
    }

    // 2. 全関数呼び出しを収集（関数名( のパターン）
    const calledFunctions = new Set<string>();
    for (const line of lines) {
        if (!line) continue;
        // 関数定義行は除外
        if (/^\s*function\s+/.test(line)) continue;
        // 関数呼び出しパターン: funcName( ただし function funcName( は除外
        const callMatches = line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g);
        for (const m of callMatches) {
            if (m[1]) calledFunctions.add(m[1]);
        }
    }

    // 3. エントリーポイントとして呼ばれなくても除外すべき関数
    const entryPointSet = new Set(entryPoints);

    // 4. 定義されているが呼ばれていない関数を検出
    const deadCode: { name: string; line: number; file?: string | undefined }[] = [];
    for (const func of definedFunctions) {
        if (!calledFunctions.has(func.name) && !entryPointSet.has(func.name)) {
            deadCode.push(func);
        }
    }

    return deadCode;
}

/**
 * A2: 未定義関数呼び出しの検出
 * コード中で呼ばれているが定義されていない関数を検出
 * @param code - 結合済みの GAS ソースコード
 * @param fileMap - ファイル名→行数のマップ
 */
export function detectUndefinedCalls(
    code: string,
    fileMap?: { name: string; startLine: number; endLine: number }[]
): { name: string; line: number; file?: string | undefined }[] {
    const lines = code.split("\n");

    // 1. 全関数定義を収集
    const definedFunctions = new Set<string>();
    for (const line of lines) {
        if (!line) continue;
        const match = line.match(/^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
        if (match && match[1]) {
            definedFunctions.add(match[1]);
        }
    }

    // 2. メソッド呼び出し（.func()）とプロパティアクセスを除外するパターン
    const undefinedCalls: { name: string; line: number; file?: string | undefined }[] = [];
    const seen = new Set<string>(); // 同じ関数名を何度も報告しない

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        // コメント行をスキップ
        if (/^\s*\/\//.test(line) || /^\s*\/?\*/.test(line)) continue;

        // 関数呼び出しを検出（メソッド呼び出し .func() を除外）
        const callMatches = line.matchAll(/(?<!\.\s*)\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g);
        for (const m of callMatches) {
            const funcName = m[1];
            if (!funcName) continue;
            // 予約語・ビルトイン・定義済みは除外
            if (definedFunctions.has(funcName)) continue;
            if (GAS_BUILTINS.has(funcName)) continue;
            // JavaScript キーワードを除外
            if (["if", "for", "while", "switch", "catch", "return", "throw",
                 "typeof", "instanceof", "new", "delete", "void", "var",
                 "let", "const", "function", "class", "try"].includes(funcName)) continue;

            if (seen.has(funcName)) continue;
            seen.add(funcName);

            let fileName: string | undefined;
            if (fileMap) {
                for (const fm of fileMap) {
                    if (i + 1 >= fm.startLine && i + 1 <= fm.endLine) {
                        fileName = fm.name;
                        break;
                    }
                }
            }

            const entry: { name: string; line: number; file?: string | undefined } = { name: funcName, line: i + 1 };
            if (fileName) entry.file = fileName;
            undefinedCalls.push(entry);
        }
    }

    return undefinedCalls;
}

/**
 * A6: 飲み込まれたエラーの検出
 * 空の catch ブロックや console.log だけの catch を警告
 */
export function detectSwallowedErrors(
    code: string,
    fileMap?: { name: string; startLine: number; endLine: number }[]
): { line: number; file?: string | undefined; type: string }[] {
    const lines = code.split("\n");
    const results: { line: number; file?: string | undefined; type: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // catch (...) { } パターン（同一行で閉じる空 catch）
        if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
            let fileName: string | undefined;
            if (fileMap) {
                for (const fm of fileMap) {
                    if (i + 1 >= fm.startLine && i + 1 <= fm.endLine) {
                        fileName = fm.name;
                        break;
                    }
                }
            }
            const entry: { line: number; file?: string | undefined; type: string } = { line: i + 1, type: "empty_catch" };
            if (fileName) entry.file = fileName;
            results.push(entry);
            continue;
        }

        // catch の次の行が } だけ（1行の空 catch）
        if (/catch\s*\([^)]*\)\s*\{/.test(line)) {
            const nextLine = lines[i + 1];
            if (nextLine && /^\s*\}\s*$/.test(nextLine)) {
                let fileName: string | undefined;
                if (fileMap) {
                    for (const fm of fileMap) {
                        if (i + 1 >= fm.startLine && i + 1 <= fm.endLine) {
                            fileName = fm.name;
                            break;
                        }
                    }
                }
                const entry: { line: number; file?: string | undefined; type: string } = { line: i + 1, type: "empty_catch" };
                if (fileName) entry.file = fileName;
                results.push(entry);
            }
        }
    }

    return results;
}

/**
 * C1: Logger モック
 * GAS 固有の Logger.log() / Logger.getLog() をエミュレート
 */
export class LoggerEmulator {
    private logs: string[] = [];

    log(...args: any[]): void {
        this.logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
    }

    getLog(): string {
        return this.logs.join("\n");
    }

    clear(): void {
        this.logs = [];
    }

    getLogs(): string[] {
        return [...this.logs];
    }
}

/**
 * D1: アサーション関数群
 * テストスクリプト内で使用可能なアサーション
 */
export class TestAssertions {
    private results: { pass: boolean; message: string }[] = [];

    assertEqual(actual: any, expected: any, label?: string): void {
        const pass = JSON.stringify(actual) === JSON.stringify(expected);
        this.results.push({
            pass,
            message: pass
                ? `✅ ${label || "assertEqual"}: OK`
                : `❌ ${label || "assertEqual"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        });
    }

    assertTrue(value: any, label?: string): void {
        const pass = !!value;
        this.results.push({
            pass,
            message: pass
                ? `✅ ${label || "assertTrue"}: OK`
                : `❌ ${label || "assertTrue"}: expected truthy, got ${JSON.stringify(value)}`
        });
    }

    assertFalse(value: any, label?: string): void {
        const pass = !value;
        this.results.push({
            pass,
            message: pass
                ? `✅ ${label || "assertFalse"}: OK`
                : `❌ ${label || "assertFalse"}: expected falsy, got ${JSON.stringify(value)}`
        });
    }

    assertNotNull(value: any, label?: string): void {
        const pass = value !== null && value !== undefined;
        this.results.push({
            pass,
            message: pass
                ? `✅ ${label || "assertNotNull"}: OK`
                : `❌ ${label || "assertNotNull"}: got ${value}`
        });
    }

    assertThrows(fn: () => void, label?: string): void {
        let threw = false;
        try { fn(); } catch (e) { threw = true; }
        this.results.push({
            pass: threw,
            message: threw
                ? `✅ ${label || "assertThrows"}: OK`
                : `❌ ${label || "assertThrows"}: expected function to throw`
        });
    }

    getResults(): { pass: boolean; message: string }[] {
        return this.results;
    }

    getSummary(): { total: number; passed: number; failed: number; messages: string[] } {
        const passed = this.results.filter(r => r.pass).length;
        return {
            total: this.results.length,
            passed,
            failed: this.results.length - passed,
            messages: this.results.map(r => r.message)
        };
    }
}

