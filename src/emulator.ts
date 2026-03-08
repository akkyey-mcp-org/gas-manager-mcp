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
    getActiveSpreadsheet() {
        return this.activeSpreadsheet;
    },
    openById(id: string) {
        return new Spreadsheet(`Spreadsheet_${id}`);
    },
    flush() { }
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
