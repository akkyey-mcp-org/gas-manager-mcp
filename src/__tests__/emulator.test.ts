import { describe, it, expect, beforeEach } from 'vitest';
import { Spreadsheet, Sheet, Range, detectDuplicateFunctions, detectUndefinedCalls } from '../emulator.js';

describe('Spreadsheet Emulator Core', () => {
    let ss: Spreadsheet;

    beforeEach(() => {
        ss = new Spreadsheet('TestSS');
    });

    it('should create a spreadsheet and add sheets', () => {
        expect(ss.getName()).toBe('TestSS');
        const sheet = ss.insertSheet('Sheet1');
        expect(sheet.getName()).toBe('Sheet1');
        expect(ss.getSheetByName('Sheet1')).toBe(sheet);
    });

    it('should handle Range get/set values', () => {
        const sheet = ss.insertSheet('Sheet1');
        const range = sheet.getRange(1, 1, 2, 2);
        const data = [[1, 2], [3, 4]];
        range.setValues(data);
        expect(range.getValues()).toEqual(data);
        expect(sheet.getLastRow()).toBe(2);
        expect(sheet.getLastColumn()).toBe(2);
    });

    it('should handle clearContents', () => {
        const sheet = ss.insertSheet('Sheet1');
        sheet.getRange(1, 1).setValues([['data']]);
        sheet.clearContents();
        expect(sheet.getRange(1, 1).getValue()).toBe('');
    });
});

describe('Static Analysis', () => {
    it('should detect duplicate functions', () => {
        const code = `
            function test() {}
            function test() {}
        `;
        const duplicates = detectDuplicateFunctions(code);
        expect(duplicates).toHaveLength(1);
        expect(duplicates[0].name).toBe('test');
    });

    it('should detect undefined calls with method chains', () => {
        const code = `
            function main() {
                PropertiesService.getScriptProperties().setProperty("key", "value");
                PropertiesService.getScriptProperties().setProperty("invalid"); // missing arg
                unknownFunction();
            }
        `;
        // definedFunctions is empty, GAS_BUILTINS included PropertiesService
        const undefinedCalls = detectUndefinedCalls(code, new Set(['main']), undefined);
        
        const names = undefinedCalls.map(c => c.name);
        expect(names).toContain('unknownFunction');
        expect(names).toContain('PropertiesService.getScriptProperties().setProperty (missing arguments)');
    });
});
