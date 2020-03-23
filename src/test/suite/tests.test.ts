import * as assert from 'assert';
import * as path from 'path';
import { workspace, TextDocument, Uri } from 'vscode';
import {  genCartesianProduct,  clearConfiguration, setConfiguration, assertValuesExpected, genInputs, VCReaderAutomatedTestSpec, VCReaderHardcodedTestSpec, VCReaderCompatAutomatedTestSpec, VCReaderCompatHardcodedTestSpec, assertValuesCompatExpected, UserDefinable, GoodBad } from './utilities';
import { VCReader } from '../../vc-reader';
import { VCReaderCompat } from '../../vc-reader-compat';

// Text document in which we scope to for the purposes of our tests. 
let scope: Thenable<TextDocument>;

// Get a reference to the text document within the workspace where we conduct our tests.
if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    // We only use the text documents within `workspace-1` (the first workspace) for our 
    // tests here.
    const workspace1 = workspace.workspaceFolders[0];
    scope = workspace.openTextDocument(Uri.file(path.join(workspace1.uri.fsPath, 'text.c')));
} else {
    throw new Error('Cannot open test environment!');
}

// -------------------------------------------------------------------------------------
// TEST MAIN

describe('`validated-configuration-reader` Tests', function () {


    // -------------------------------------
    // VCReader

    const section = '@onlylys/vscode-validated-configuration-reader';

    // The default value of the newer configuration with a good default value.
    const expectedGoodDefaultValue: string[] = [ "()", "[]", "{}", "<>", "``", "''", "\"\"" ];

    // Default language value can only be `undefined` since vscode doesn't yet allow third party 
    // extensions to define language based default values. Thus for any configuration we test
    // here, it will have `defaultLanguageValue` of `undefined`.
    const expectedDefaultLanguageValue = undefined;

    // Callback to validate the newer configuration and its variants.
    const validate = (t: unknown): t is string[] => {
        return Array.isArray(t) && t.every(pair => typeof pair === 'string' && pair.length === 2);
    };

    // We test `VCReader` with three variants of the same configuration, one with a good default
    // value, another with a bad default value and one with no default value. These configurations 
    // have the names:
    // 
    // - `@onlylys/vscode-validated-configuration-reader.goodDefault`
    // - `@onlylys/vscode-validated-configuration-reader.badDefault`
    // - `@onlylys/vscode-validated-configuration-reader.noDefault`
    //
    // Note that we can't test for variations in the language based default value since vscode does 
    // not yet (at least as of 1.43.0) allow third party extensions to define them. 
    describe('`VCReader`' , function() {

        // Run the automated test 3 times for each possibility: good, bad or missing default 
        // configuration value. 
        describe('# Automated', function () {

            // Set of values used to generate inputs for the automated tests. 
            const userDefinable: UserDefinable<GoodBad<string[]>> = {
                global: {
                    good: [ "()", "[]", "{}", "<>" ],
                    bad: "()",
                },
                workspace: {
                    good: [ "()", "[]", "{}", "<>", "``", "''", "\"\"", "||" ],
                    bad: [ { open: "(", close: ")" } ]
                },
                workspaceFolder: {
                    good: [ "()", "[]", "{}" ],
                    bad: [ "(", ")" ]
                },
                globalLanguage: {
                    good: [ "{}", "<>", "``", "''", "\"\"" ],
                    bad: [ "{{}}", "<>", "``", "''", "\"\"" ]
                },
                workspaceLanguage: {
                    good: [ "``", "''", "\"\"" ],
                    bad: 10
                },
                workspaceFolderLanguage: {
                    good: [ ],
                    bad: [ "()", { open: "[", close: "]" } ]
                }
            };

            testVCReaderAutomated({
                description: 'Good default value',
                scope,
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable
            });

            testVCReaderAutomated({
                description: 'Bad default value',
                scope,
                name: `${section}.badDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                userDefinable
            });

            testVCReaderAutomated({
                description: 'No default value',
                scope,
                name: `${section}.noDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                userDefinable
            });

        });

        // Hardcoded tests are a collection of tests that are not automated. Which tests are 
        // included in the collection is rather arbitrary, mostly based on what the author thinks 
        // will be the most common combination of values encountered. 
        // 
        // The purpose of this is as a fallback, just in case the automated test generator has a
        // bug within it. 
        describe('# Hardcoded', function () {

            testVCReaderHardcoded({
                description: 'Good default value only',
                scope,
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: expectedGoodDefaultValue,
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });

            testVCReaderHardcoded({
                description: 'Good default value + good global value',
                scope,
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: [ "()", "{}" ],
                userDefinable: {
                    global:                  { valid: true,  value: [ "()", "{}" ] },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });

            testVCReaderHardcoded({
                description: 'Good default value + bad global value',
                scope,
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: expectedGoodDefaultValue,
                userDefinable: {
                    global:                  { valid: false, value: [ "(())", "{}" ] },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });

            testVCReaderHardcoded({
                description: 'Good default value + good global value + good global language value',
                scope,
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: [ "()", "[]", "<>", "{}" ],
                userDefinable: {
                    global:                  { valid: true,  value: [ "()", "{}" ] },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: true,  value: [ "()", "[]", "<>", "{}" ] },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });

            testVCReaderHardcoded({
                description: 'Bad default value only',
                scope,
                name: `${section}.badDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: undefined,
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });

            testVCReaderHardcoded({
                description: 'Bad default value + good global value',
                scope,
                name: `${section}.badDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: [ "()", "{}", "<>" ],
                userDefinable: {
                    global:                  { valid: true,  value: [ "()", "{}", "<>" ] },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });

            testVCReaderHardcoded({
                description: 'No default value',
                scope,
                name: `${section}.noDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: undefined,
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });

            testVCReaderHardcoded({
                description: 'No default value + good global language value',
                scope,
                name: `${section}.noDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: [ "[]" ],
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: true,  value: [ "[]" ] },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });

            testVCReaderHardcoded({
                description: 'Good value in all scopes except default language',
                scope,
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: [ ],
                userDefinable: {
                    global:                  { valid: true, value: [ "()", "[]", "{}", "<>", "``" ] },
                    workspace:               { valid: true, value: [ "()", "[]", "{}", "<>" ]       },
                    workspaceFolder:         { valid: true, value: [ "()", "[]", "{}" ]             },
                    globalLanguage:          { valid: true, value: [ "()", "[]" ]                   },
                    workspaceLanguage:       { valid: true, value: [ "()" ]                         },
                    workspaceFolderLanguage: { valid: true, value: [ ]                              }                                                                                                       
                },
            });
        
            testVCReaderHardcoded({
                description: 'Good default value + bad workspace folder value + ' +
                'good workspace language value + bad workspace folder language value',
                scope,
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: [ "[]" ],
                userDefinable: {
                    global:                  { valid: true,  value: [ "()", "[]", "{}", "<>", "``" ] }, 
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: [ { open: "(", close: ")" } ]},
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: true,  value: [ "[]" ] },
                    workspaceFolderLanguage: { valid: false, value: "cat" }
                },
            });

            testVCReaderHardcoded({
                description: 'No values in all scopes',
                scope,
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                expectedEffectiveValue: undefined,
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });

        });
        
        describe('# Safeguards', function () {
            testVCReaderEmptyNameThrow();
        });

    });

    // -------------------------------------
    // VCReaderCompat

    // The default value of the deprecated configuration with a good default value.
    const expectedGoodDeprDefaultValue: { open: string, close: string }[] = [
        { open: "(",  close: ")" },
        { open: "[",  close: "]" },
        { open: "{",  close: "}" },
        { open: "<",  close: ">" },
        { open: "`",  close: "`" },
        { open: "'",  close: "'" },
        { open: "\"", close: "\"" }
    ];

    // This is `undefined` for the same reasons as `expectedDefaultLanguageValue` is `undefined`.
    const expectedDeprDefaultLanguageValue = undefined;

    // Callback to validate the deprecated configuration and its variants.
    const deprValidate = (d: unknown): d is { open: string, close: string }[] => {
        return Array.isArray(d) 
            && d.every(inner => 
                typeof inner === 'object'
                    && Reflect.ownKeys(inner).length === 2
                    && typeof inner.open  === 'string' 
                    && typeof inner.close === 'string'
                    && inner.open.length  === 1
                    && inner.close.length === 1
            );
    };

    // Convert configurations of the older type to that of the newer type. Strictly only used when
    // calculating the effective value. 
    const normalize = (d: { open: string, close: string }[]): string[] => {
        return d.map(({ open, close }) => `${open}${close}` );
    };

    // We test `VCReaderCompat` with three variants of a newer configuration, one with a good 
    // default value, one with a bad default value and another with no default value. Furthermore 
    // we use three corresponding variants of a deprecated configuration. In total we have:
    // 
    // - `@onlylys/vscode-validated-configuration-reader.goodDefault`
    // - `@onlylys/vscode-validated-configuration-reader.badDefault`
    // - `@onlylys/vscode-validated-configuration-reader.noDefault`
    // - `@onlylys/vscode-validated-configuration-reader.deprGoodDefault`
    // - `@onlylys/vscode-validated-configuration-reader.deprBadDefault`
    // - `@onlylys/vscode-validated-configuration-reader.deprNoDefault`
    //
    // For similar reasons to the test for `VCReader`, we cannot test the `defaultLanguageValue` for 
    // both the newer and deprecated configurations. 
    describe('`VCReaderCompat`' , function() {

        describe('# Automated', function () {

            // Set of values used to generate inputs for the newer configuration. 
            const userDefinable: UserDefinable<GoodBad<string[]>> = {
                global: {
                    good: [ "()", "[]", "{}" ],
                    bad: 15.34,
                },
                workspace: {
                    good: [ "()", "[]", "{}", "||" ],
                    bad: [ 
                        { open: "(",  close: ")" },
                        { open: "[",  close: "]" },
                        { open: "{",  close: "}" },
                        { open: "<",  close: ">" },
                    ]
                },
                workspaceFolder: {
                    good: [ "()" ],
                    bad: [ [ "(", ")" ], [ "{", "}" ] ]
                },
                globalLanguage: {
                    good: [ "``", "''", "\"\"" ],
                    bad: [ "<<>>" ]
                },
                workspaceLanguage: {
                    good: [ ],
                    bad: ""
                },
                workspaceFolderLanguage: {
                    good: [ "[]" ],
                    bad: "(), {}, []"
                }
            };

            // Set of values used to generate inputs for the deprecated configuration. 
            const deprUserDefinable: UserDefinable<GoodBad<{ open: string, close: string }[]>> = {
                global: {
                    good: [
                        { open: "(",  close: ")" },
                        { open: "[",  close: "]" },
                        { open: "{",  close: "}" },
                        { open: "<",  close: ">" },
                    ],
                    bad: [
                        { open: "(",  close: ")" },
                        { open: "[",  close: "]" },
                        { open: "{",  close: "}" },
                        { open: "<" },
                    ]
                },
                workspace: {
                    good: [
                        { open: "(",  close: ")" },
                        { open: "[",  close: "]" },
                        { open: "{",  close: "}" },
                    ],
                    bad: [ 
                        { open: "(" },  { close: ")" },
                        { open: "[" },  { close: "]" },
                        { open: "<" },  { close: ">" },
                        { open: "'" },  { close: "'" },
                    ]
                },
                workspaceFolder: {
                    good: [ ],
                    bad: true
                },
                globalLanguage: {
                    good: [
                        { open: "(",  close: ")" },
                        { open: "[",  close: "]" },
                        { open: "{",  close: "}" },
                        { open: "<",  close: ">" },
                        { open: "`",  close: "`" },
                        { open: "'",  close: "'" },
                        { open: "|",  close: "|" },
                        { open: "\"", close: "\"" }
                    ],
                    bad: [
                        { open: "(",  close: ")" },
                        { open: "[",  close: "]" },
                        { open: "{",  close: "}" },
                        { open: "<",  close: ">" },
                        { open: "`",  close: "`" },
                        { open: "'",  close: "'" },
                        { open: "\"", close: "\"" },
                        { open: "((",  close: "))" }
                    ]
                },
                workspaceLanguage: {
                    good: [ 
                        { open: "[",  close: "]" },
                        { open: "{",  close: "}" },
                    ],
                    bad: [
                        {},
                    ]
                },
                workspaceFolderLanguage: {
                    good: [ 
                        { open: "(",  close: ")" },
                        { open: "<",  close: ">" },
                        { open: "`",  close: "`" },
                    ],  
                    bad: [ 
                        { left: "(",  right: ")" },
                        { left: "<",  right: ">" },
                        { left: "`",  right: "`" },
                    ]
                }
            };

            testVCReaderCompatAutomated({
                description: 'Good default value + good deprecated default value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable,
                deprName: `${section}.goodDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: expectedGoodDeprDefaultValue,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable,
                normalize
            });

            testVCReaderCompatAutomated({
                description: 'Good default value + bad deprecated default value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable,
                deprName: `${section}.badDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable,
                normalize
            });

            testVCReaderCompatAutomated({
                description: 'Good default value + no deprecated default value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable,
                deprName: `${section}.noDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable,
                normalize
            });

            testVCReaderCompatAutomated({
                description: 'Bad default value + good deprecated default value',
                scope, 
                name: `${section}.badDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                userDefinable,
                deprName: `${section}.goodDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: expectedGoodDeprDefaultValue,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable,
                normalize
            });

            testVCReaderCompatAutomated({
                description: 'Bad default value + bad deprecated default value',
                scope, 
                name: `${section}.badDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                userDefinable,
                deprName: `${section}.badDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable,
                normalize
            });

            testVCReaderCompatAutomated({
                description: 'Bad default value + no deprecated default value',
                scope, 
                name: `${section}.badDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                userDefinable,
                deprName: `${section}.noDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable,
                normalize
            });

            testVCReaderCompatAutomated({
                description: 'No default value + good deprecated default value',
                scope, 
                name: `${section}.noDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                userDefinable,
                deprName: `${section}.goodDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: expectedGoodDeprDefaultValue,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable,
                normalize
            });

            testVCReaderCompatAutomated({
                description: 'No default value + bad deprecated default value',
                scope, 
                name: `${section}.noDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                userDefinable,
                deprName: `${section}.badDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable,
                normalize
            });

            testVCReaderCompatAutomated({
                description: 'No default value + no deprecated default value',
                scope, 
                name: `${section}.noDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                userDefinable,
                deprName: `${section}.noDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable,
                normalize
            });

        });

        describe('# Hardcoded', function () {

            testVCReaderCompatHardcoded({
                description: 'Good default value + no deprecated default value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprName: `${section}.noDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                normalize,
                expectedEffectiveValue: expectedGoodDefaultValue
            });

            testVCReaderCompatHardcoded({
                description: 'Good default value + good deprecated default value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprName: `${section}.goodDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: expectedGoodDeprDefaultValue,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                normalize,
                expectedEffectiveValue: expectedGoodDefaultValue
            });

            testVCReaderCompatHardcoded({
                description: 'Good default value + good deprecated global value'
                + ' + good global value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable: {
                    global: { 
                        valid: true, 
                        value: [ "()", "[]", "{}" ]
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprName: `${section}.goodDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: expectedGoodDeprDefaultValue,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                normalize,
                expectedEffectiveValue: [ "()", "[]", "{}" ]
            });

            testVCReaderCompatHardcoded({
                description: 'Good default value + good deprecated default value' 
                + ' + good deprecated global value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprName: `${section}.goodDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: expectedGoodDeprDefaultValue,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable: {
                    global: { 
                        valid: true, 
                        value: [
                            { open: "(",  close: ")" },
                            { open: "[",  close: "]" },
                            { open: "{",  close: "}" },
                            { open: "<",  close: ">" },
                        ]
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                normalize,
                expectedEffectiveValue: [ "()", "[]", "{}", "<>" ]
            });

            testVCReaderCompatHardcoded({
                description: 'Good default value + good deprecated global value'
                + ' + good global value + good deprecated global value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable: {
                    global: { 
                        valid: true, 
                        value: [ "()", "[]", "{}" ]
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprName: `${section}.goodDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: expectedGoodDeprDefaultValue,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable: {
                    global: { 
                        valid: true, 
                        value: [
                            { open: "(",  close: ")" },
                            { open: "[",  close: "]" },
                            { open: "{",  close: "}" },
                            { open: "<",  close: ">" },
                        ]
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                normalize,
                expectedEffectiveValue: [ "()", "[]", "{}" ]
            });

            testVCReaderCompatHardcoded({
                description: 'Good default value + no deprecated default value'
                + ' + good deprecated global value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprName: `${section}.noDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable: {
                    global: { 
                        valid: true, 
                        value: [
                            { open: "(", close: ")" }
                        ]
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                normalize,
                expectedEffectiveValue: [ "()" ]
            });

            testVCReaderCompatHardcoded({
                description: 'Good default value + no deprecated default value'
                + ' + good global value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable: {
                    global: { 
                        valid: true, 
                        value: [ "()", "[]", "<>" ]
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprName: `${section}.noDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                normalize,
                expectedEffectiveValue: [ "()", "[]", "<>" ]
            });

            testVCReaderCompatHardcoded({
                description: 'Bad default value + bad deprecated default value'
                + ' + good workspace value + good deprecated workspace value',
                scope, 
                name: `${section}.badDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace: { 
                        valid: true, 
                        value: [ ]
                    },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprName: `${section}.badDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { 
                        valid: true, 
                        value: [
                            { open: "[", close: "]" },
                            { open: "<", close: ">" }
                        ]
                    }
                },
                normalize,
                expectedEffectiveValue: [ "[]", "<>" ]
            });

            testVCReaderCompatHardcoded({
                description: 'No default value + no deprecated default value'
                + ' + bad global value + good deprecated global value',
                scope, 
                name: `${section}.noDefault`,
                validate,
                expectedDefaultValue: undefined,
                expectedDefaultLanguageValue,
                userDefinable: {
                    global: { 
                        valid: false, 
                        value: [ "{{}}", "(())", "[]", "()" ] 
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprName: `${section}.noDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable: {
                    global:                  { 
                        valid: true, 
                        value: [
                            { open: "[", close: "]" },
                            { open: "<", close: ">" },
                            { open: "'", close: "'" },
                            { open: "`", close: "`" }
                        ]
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                normalize,
                expectedEffectiveValue: [ "[]", "<>", "''", "``" ]
            });

            testVCReaderCompatHardcoded({
                description: 'Good default value + no deprecated default value'
                + ' + good workspace value + bad deprecated workspace folder value',
                scope, 
                name: `${section}.goodDefault`,
                validate,
                expectedDefaultValue: expectedGoodDefaultValue,
                expectedDefaultLanguageValue,
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace: { 
                        valid: true, 
                        value: [ "{}", "()", "[]", "''", "||", "``", "<>", "\"\"" ]
                    },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprName: `${section}.noDeprDefault`,
                deprValidate,
                expectedDeprDefaultValue: undefined,
                expectedDeprDefaultLanguageValue,
                deprUserDefinable: {
                    global:            { valid: false, value: undefined },
                    workspace:         { valid: false, value: undefined },
                    workspaceFolder:   { valid: false, value: undefined },
                    globalLanguage:    { valid: false, value: undefined },
                    workspaceLanguage: { valid: false, value: undefined },
                    workspaceFolderLanguage: { 
                        valid: false, 
                        value: [
                            { left: "[",  right: "]" },
                            { left: "<",  right: ">" },
                        ]
                    },
                },
                normalize,
                expectedEffectiveValue: [ "{}", "()", "[]", "''", "||", "``", "<>", "\"\"" ] 
            });

        });
        
        describe('# Safeguards', function () {
            testVCReaderCompatEmptyNameThrow();
        });

    });

    // -------------------------------------
    // Utilities

    describe('Utilities', function() {

        describe('# Cartesian product generator', testGenCartesianProduct);

        describe('# Configuration setter', async function () {
            testSetConfiguration(await scope);
        });

    });

    // -------------------------------------
    // Epilogue

    // Clear the test configurations so that no values are left after the tests are complete.
    after(async function () {
        await clearConfiguration(`${section}.goodDefault`,     await scope);
        await clearConfiguration(`${section}.badDefault`,      await scope);
        await clearConfiguration(`${section}.noDefault`,       await scope);
        await clearConfiguration(`${section}.deprGoodDefault`, await scope);
        await clearConfiguration(`${section}.deprBadDefault`,  await scope);
        await clearConfiguration(`${section}.deprNoDefault`,   await scope);
    });

});

// -------------------------------------------------------------------------------------
// VC READER TESTS

/** 
 * Automatically test `VCReader` by generating all possible combinations of user definable values
 * for a given test configuration. These values are set, then read back using the `read` method of
 * `VCReader`. the obtained values are then compared the expected values.
 * 
 * When generating values to set for each user definable scope, known good and known bad values are 
 * used. The bad values are used to simulate situations where the user has put in invalid 
 * configuration values (e.g. input values of the wrong type), and the intent here is to check 
 * whether the `read` method of `VCReader` successfully filters out these bad values. 
 */
function testVCReaderAutomated<T>(spec: VCReaderAutomatedTestSpec<T>): void {
    
    it(spec.description, async function () {

        const reader = new VCReader(spec);

        for (const input of genInputs(spec.userDefinable)) {
    
            // Set values then read back and check that the values obtained are as expected.
            await setConfiguration(spec.name, await spec.scope, input);

            // Calculate the effective value that we would expect from this combination of values.
            let expectedEffectiveValue: T | undefined;
            if (input.workspaceFolderLanguage.valid) {
                expectedEffectiveValue = input.workspaceFolderLanguage.value;
            } else if (input.workspaceLanguage.valid) {
                expectedEffectiveValue = input.workspaceLanguage.value;
            } else if (input.globalLanguage.valid) {
                expectedEffectiveValue = input.globalLanguage.value;
            } else if (spec.expectedDefaultLanguageValue !== undefined) {
                throw new Error('Unreachable!');
            } else if (input.workspaceFolder.valid) {
                expectedEffectiveValue = input.workspaceFolder.value;
            } else if (input.workspace.valid) {
                expectedEffectiveValue = input.workspace.value;
            } else if (input.global.valid) {
                expectedEffectiveValue = input.global.value;
            } else if (spec.expectedDefaultValue !== undefined) {
                expectedEffectiveValue = spec.expectedDefaultValue;
            } else {
                expectedEffectiveValue = undefined;
            }

            assertValuesExpected<T>(reader.read(await spec.scope), {
                defaultValue:         spec.expectedDefaultValue,
                defaultLanguageValue: spec.expectedDefaultLanguageValue,
                effectiveValue:       expectedEffectiveValue,
                userDefinable:        input
            });

        }

    });

}

function testVCReaderHardcoded<T>(spec: VCReaderHardcodedTestSpec<T>): void {

    it(spec.description, async function () {
        const reader = new VCReader(spec);
        await setConfiguration(spec.name, await spec.scope, spec.userDefinable);
        assertValuesExpected<T>(reader.read(await spec.scope), {
            defaultValue:         spec.expectedDefaultValue,
            defaultLanguageValue: spec.expectedDefaultLanguageValue,
            effectiveValue:       spec.expectedEffectiveValue,
            userDefinable:        spec.userDefinable                                                                                                                                                                            
        });
    });

}

function testVCReaderEmptyNameThrow(): void {

    it('Throw when empty name', function () {
        assert.throws(
            function () {
                new VCReader({
                    name: '',
                    validate: (t: any): t is number => typeof t === 'number'
                });
            }
        );
    });

    it('Throw when whitespace only name', function () {
        assert.throws(
            function () {
                new VCReader({
                    name: '              ',
                    validate: (t: any): t is number => typeof t === 'number'
                });
            }
        );
    });

}

// -------------------------------------------------------------------------------------
// VC READER COMPAT TESTS

function testVCReaderCompatAutomated<T, D>(spec: VCReaderCompatAutomatedTestSpec<T, D>): void {

    it(spec.description, async function () {

        const reader = new VCReaderCompat(spec);

        // Generate then set all possible inputs for both the newer and deprecated configurations.
        for (const input of genInputs(spec.userDefinable)) {

            await setConfiguration(spec.name, await spec.scope, input);

            for (const deprInput of genInputs(spec.deprUserDefinable)) {

                await setConfiguration(spec.deprName, await spec.scope, deprInput);

                // Calculate the effective value by merging the views of the newer and deprecated
                // configurations.
                let expectedEffectiveValue: T | undefined;
                if (input.workspaceFolderLanguage.valid) {
                    expectedEffectiveValue = input.workspaceFolderLanguage.value;
                } else if (deprInput.workspaceFolderLanguage.valid) {
                    expectedEffectiveValue = spec.normalize(deprInput.workspaceFolderLanguage.value);
                } else if (input.workspaceLanguage.valid) {
                    expectedEffectiveValue = input.workspaceLanguage.value;
                } else if (deprInput.workspaceLanguage.valid) {
                    expectedEffectiveValue = spec.normalize(deprInput.workspaceLanguage.value);
                } else if (input.globalLanguage.valid) {
                    expectedEffectiveValue = input.globalLanguage.value;
                } else if (deprInput.globalLanguage.valid) {
                    expectedEffectiveValue = spec.normalize(deprInput.globalLanguage.value);
                } else if (spec.expectedDefaultLanguageValue !== undefined) {
                    throw new Error('Unreachable!');
                } else if (spec.expectedDeprDefaultLanguageValue !== undefined) {
                    throw new Error('Unreachable!');
                } else if (input.workspaceFolder.valid) {
                    expectedEffectiveValue = input.workspaceFolder.value;
                } else if (deprInput.workspaceFolder.valid) {
                    expectedEffectiveValue = spec.normalize(deprInput.workspaceFolder.value);
                } else if (input.workspace.valid) {
                    expectedEffectiveValue = input.workspace.value;
                } else if (deprInput.workspace.valid) {
                    expectedEffectiveValue = spec.normalize(deprInput.workspace.value);
                } else if (input.global.valid) {
                    expectedEffectiveValue = input.global.value;
                } else if (deprInput.global.valid) {
                    expectedEffectiveValue = spec.normalize(deprInput.global.value);
                } else if (spec.expectedDefaultValue !== undefined) {
                    expectedEffectiveValue = spec.expectedDefaultValue;
                } else if (spec.expectedDeprDefaultValue !== undefined) {
                    expectedEffectiveValue = spec.normalize(spec.expectedDeprDefaultValue);
                } else {
                    expectedEffectiveValue = undefined;
                }

                assertValuesCompatExpected<T, D>(reader.read(await spec.scope), {
                    defaultValue:             spec.expectedDefaultValue,
                    defaultLanguageValue:     spec.expectedDefaultLanguageValue,
                    effectiveValue:           expectedEffectiveValue,
                    userDefinable:            input,
                    deprDefaultValue:         spec.expectedDeprDefaultValue,
                    deprDefaultLanguageValue: spec.expectedDeprDefaultLanguageValue,
                    deprUserDefinable:        deprInput
                });

            }

        }

    });

}

function testVCReaderCompatHardcoded<T, D>(spec: VCReaderCompatHardcodedTestSpec<T, D>): void {

    it(spec.description, async function () {
        const reader = new VCReaderCompat(spec);
        await setConfiguration(spec.name, await spec.scope, spec.userDefinable);
        assertValuesCompatExpected<T, D>(reader.read(await spec.scope), {
            defaultValue:             spec.expectedDefaultValue,
            defaultLanguageValue:     spec.expectedDefaultLanguageValue,
            effectiveValue:           spec.expectedEffectiveValue,
            userDefinable:            spec.userDefinable,
            deprDefaultValue:         spec.expectedDefaultLanguageValue,
            deprDefaultLanguageValue: spec.expectedDeprDefaultLanguageValue,
            deprUserDefinable:        spec.deprUserDefinable
        });
    });

}

function testVCReaderCompatEmptyNameThrow(): void {

    // Dummy callback.
    const validate = (t: any): t is number => typeof t === 'number';

    // Dummy callback.
    const deprValidate = (d: any): d is string => typeof d === 'string';

    // Dummy callback.
    const normalize = () => 10;

    it('Throw when empty name for newer configuration', function () {
        assert.throws(
            function () {
                new VCReaderCompat({
                    name: '',
                    validate,
                    deprName: 'deprDummy',
                    deprValidate,
                    normalize
                });
            }
        );
    });

    it('Throw when whitespace only name for newer configuration', function () {
        assert.throws(
            function () {
                new VCReaderCompat({
                    name: '              ',
                    validate,
                    deprName: 'deprDummy',
                    deprValidate,
                    normalize
                });
            }
        );
    });

    it('Throw when empty name for deprecated configuration', function () {
        assert.throws(
            function () {
                new VCReaderCompat({
                    name: 'dummy',
                    validate,
                    deprName: '',
                    deprValidate,
                    normalize
                });
            }
        );
    });

    it('Throw when whitespace only for name of newer configuration', function () {
        assert.throws(
            function () {
                new VCReaderCompat({
                    name: 'dummy',
                    validate,
                    deprName: '                   ',
                    deprValidate,
                    normalize
                });
            }
        );
    });

}

// -------------------------------------------------------------------------------------
// UTILITIES TESTS

function testGenCartesianProduct(): void {

    it('Empty input throws', function () {
        assert.throws(
            function () {
                Array.from(genCartesianProduct());
            }
        );
    });

    it('Only one array throws', function () {
        assert.throws(
            function () {
                Array.from(genCartesianProduct([1, 2, 3]));
            }
        );
    });

    it('Mismatched dimension throws', function () {
        assert.throws(
            function () {
                Array.from(genCartesianProduct([1, 2, 3], [2, 4]));
            }
        );
    });

    it('Two input arrays', function () {
        const a = [1, 2];
        const b = [3, 4];
        const cartesianProduct = Array.from(genCartesianProduct(a, b));
        const expected = [
            [1, 3],
            [2, 3],
            [1, 4],
            [2, 4]
        ];
        assert.deepStrictEqual(cartesianProduct, expected);
    });

    it ('Three input arrays', function () {
        const a = [1, 2, 3];
        const b = [4, 5, 6];
        const c = [7, 8, 9];
        const cartesianProduct = Array.from(genCartesianProduct(a, b, c));
        const expected = [
            [1, 4, 7],
            [2, 4, 7],
            [3, 4, 7],
            [1, 5, 7],
            [2, 5, 7],
            [3, 5, 7],
            [1, 6, 7],
            [2, 6, 7],
            [3, 6, 7],
            [1, 4, 8],
            [2, 4, 8],
            [3, 4, 8],
            [1, 5, 8],
            [2, 5, 8],
            [3, 5, 8],
            [1, 6, 8],
            [2, 6, 8],
            [3, 6, 8],
            [1, 4, 9],
            [2, 4, 9],
            [3, 4, 9],
            [1, 5, 9],
            [2, 5, 9],
            [3, 5, 9],
            [1, 6, 9],
            [2, 6, 9],
            [3, 6, 9]
        ];
        assert.deepStrictEqual(cartesianProduct, expected);
    });
    
}

/** `textDocument` can be any arbitrary text document. */
function testSetConfiguration(textDocument: TextDocument): void {

    const section = '@onlylys/vscode-validated-configuration-reader';
    const child   = 'forTestSetConfiguration';
    const full    = `${section}.${child}`;

    it('Set to arbitrary values', async function () {
        await setConfiguration(full, textDocument, {
                global:                  { valid: true, value: 2 },
                workspace:               { valid: true, value: 3 },
                workspaceFolder:         { valid: true, value: 4 },
                globalLanguage:          { valid: true, value: 5 },
                workspaceLanguage:       { valid: true, value: 6 },
                workspaceFolderLanguage: { valid: true, value: 7 }
            }
        );
        // Check by reading back using the raw extension API then comparing against expected values.
        const inspect = workspace.getConfiguration(section, textDocument).inspect(child);
        if (inspect === undefined) {
            throw new Error('`Inspect` is unexpectedly `undefined`!');
        }
        assert.deepStrictEqual(inspect.globalValue,                  2);
        assert.deepStrictEqual(inspect.workspaceValue,               3);
        assert.deepStrictEqual(inspect.workspaceFolderValue,         4);
        assert.deepStrictEqual(inspect.globalLanguageValue,          5);
        assert.deepStrictEqual(inspect.workspaceLanguageValue,       6);
        assert.deepStrictEqual(inspect.workspaceFolderLanguageValue, 7);
    });

    // Further test that we can
    it('Clear all user definable values', async function() {
        await clearConfiguration(full, textDocument);
        // Check by reading back using the raw extension API then comparing against expected values.
        const inspect = workspace.getConfiguration(section, textDocument).inspect(child);
        if (inspect === undefined) {
            throw new Error('`Inspect` is unexpectedly `undefined`!');
        }
        assert.deepStrictEqual(inspect.globalValue,                  undefined);
        assert.deepStrictEqual(inspect.workspaceValue,               undefined);
        assert.deepStrictEqual(inspect.workspaceFolderValue,         undefined);
        assert.deepStrictEqual(inspect.globalLanguageValue,          undefined);
        assert.deepStrictEqual(inspect.workspaceLanguageValue,       undefined);
        assert.deepStrictEqual(inspect.workspaceFolderLanguageValue, undefined);
    });

}

