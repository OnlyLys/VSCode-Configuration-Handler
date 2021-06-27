import * as path from 'path';
import { workspace, TextDocument, Uri } from 'vscode';
import { clearConfiguration, testSetConfiguration, testClearConfiguration, testVCReader, assertVCReaderCtorThrows, assertVCDualReaderCtorThrows, testVCDualReader } from './utilities';

/** 
 * Text document in which our tests are scoped to.
 */
let scope: Thenable<TextDocument>;

// Initialize the `scope` pointer.
//
// We will be using the `text.c` file in the first workspace.
if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspace1 = workspace.workspaceFolders[0];
    scope = workspace.openTextDocument(Uri.file(path.join(workspace1.uri.fsPath, 'text.c')));
} else {
    throw new Error('Cannot open test environment!');
}

/** 
 * The [section name] of the configurations defined by this extension.
 * 
 * [section name]: https://code.visualstudio.com/api/references/vscode-api#workspace.getConfiguration
 */
const section = '@onlylys/vscode-validated-configuration-reader';

/**
 * The full name of the new configuration with a good default value.
 */
 const goodName = `${section}.goodDefault`;

/**
 * The full name of the new configuration with a bad default value.
 */
const badName = `${section}.badDefault`;

/**
 * The full name of the deprecated configuration with a good default value.
 */
const deprGoodName = `${section}.deprGoodDefault`;

/**
 * The full name of the deprecated configuration with a bad default value.
 */
const deprBadName = `${section}.deprBadDefault`;

/**
 * Configuration used to test the `setConfiguration` and `clearConfiguration` utility functions. 
 */
const testSetConfigurationName = `${section}.forTestSetConfiguration`;

/** 
 * The expected default value of the new configuration with a good default value. 
 */
const expectedGoodDefaultValue: string[] = [ "()", "[]", "{}", "<>", "``", "''", "\"\"" ];

/**
 * The expected default value of the deprecated configuration with a good default value.
 */
const expectedGoodDeprDefaultValue: { open: string, close: string }[] = [
    { open: "(",  close: ")" },
    { open: "[",  close: "]" },
    { open: "{",  close: "}" },
    { open: "<",  close: ">" },
    { open: "`",  close: "`" },
    { open: "'",  close: "'" },
    { open: "\"", close: "\"" }
];

/** 
 * Callback to validate the new configuration.
 */
const validate = (t: unknown): t is string[] => {
    return Array.isArray(t) && t.every(pair => typeof pair === 'string' && pair.length === 2);
};

/**
 * Callback to validate the deprecated configuration.
 */
const deprValidate = (d: unknown): d is { open: string, close: string }[] => {
    return Array.isArray(d) 
        && d.every(inner => 
            typeof inner === 'object'
                && inner !== null
                && Reflect.ownKeys(inner).length === 2
                && typeof inner.open  === 'string' 
                && typeof inner.close === 'string'
                && inner.open.length  === 1
                && inner.close.length === 1
        );
};

/**
 * Callback to transform values of the deprecated configuration to the type of the new configuration.
 */
const normalize = (d: { open: string, close: string }[]): string[] => {
    return d.map(({ open, close }) => `${open}${close}` );
};

// Test entry point.
//
// To test this project, we will be running this package as a vscode extension to see if the readers
// defined in this package can correctly read the configuration values. We will also be using the
// vscode API to modify configuration values along the way in order to perform more comprehensive 
// tests.
describe('`validated-configuration-reader` Tests (all scopes except language-specific default tested)', function () {

    // `VCReader` tests.
    //
    // We test `VCReader` with two variants of the same configuration, one with a good default value 
    // and another with a bad default value. These configurations have the names:
    // 
    // - `@onlylys/vscode-validated-configuration-reader.goodDefault`
    // - `@onlylys/vscode-validated-configuration-reader.badDefault`
    //
    // Notice that there is no variant for no default value. That is because if a default value is
    // not specified in the package manifest, vscode will implicitly provide a default value based 
    // on the declared type of the configuration. For instance, for a configuration that was declared 
    // an `array` type, the implicit default value is the empty array `[]`. 
    // 
    // Note that we do not test the language based default value (`defaultLanguageValue`) since 
    // vscode does not yet (at least as of 1.57.1) allow extensions to provide default values for
    // third party configurations (i.e. configurations defined by extensions, such as the ones we
    // are using here for testing). 
    //
    // The values used here for the tests are rather arbitrary, and is mostly based on what the 
    // author thinks will result in a more comprehensive test.
    describe('VCReader', function() {

        it('A - Good default only', async function () {
            await testVCReader({
                scope: await scope,
                name: goodName,
                validate,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       expectedGoodDefaultValue
                },
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

        it('B - Good default, bad in all other scopes', async function () {
            await testVCReader({
                scope: await scope,
                name: goodName,
                validate,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       expectedGoodDefaultValue
                },
                userDefinable: {
                    global:                  { valid: false, value: 'cat' },
                    workspace:               { valid: false, value: [ { open: '{', close: '}' }] },
                    workspaceFolder:         { valid: false, value: '[]' },
                    globalLanguage:          { valid: false, value: 6 },
                    workspaceLanguage:       { valid: false, value: [ '{{}', '[]', '<>' ] },
                    workspaceFolderLanguage: { valid: false, value: [ [ '{', '}' ] ] }
                },
            });
        });

        it('C - Bad default only', async function () {
            await testVCReader({
                scope: await scope,
                name: badName,
                validate,
                expected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined,
                    effectiveValue:       undefined
                },
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

        it('D - Good default, good global', async function () {
            await testVCReader({
                scope: await scope,
                name: goodName,
                validate,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "()", "{}" ]
                },
                userDefinable: {
                    global:                  { valid: true,  value: [ "()", "{}" ] },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });
        });

        it('E - Good default, bad global', async function () {
            await testVCReader({
                scope: await scope,
                name: goodName,
                validate,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       expectedGoodDefaultValue
                },
                userDefinable: {
                    global:                  { valid: false, value: [ "(())", "{}" ] },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });
        });

        it('F - Bad default, good global', async function () {
            await testVCReader({
                scope: await scope,
                name: badName,
                validate,
                expected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "()", "{}", "<>" ]
                },
                userDefinable: {
                    global:                  { valid: true,  value: [ "()", "{}", "<>" ] },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });
        });

        it('G - Good default, bad workspace, good workspace folder', async function () {
            await testVCReader({
                scope: await scope,
                name: goodName,
                validate,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "[]", "<>", "{}" ]
                },
                userDefinable: {
                    global:                  { valid: true,  value: [ "()", "{}", "``" ] },
                    workspace:               { valid: false, value: [ "||||", "[]", "<>" ] },
                    workspaceFolder:         { valid: true,  value: [ "[]", "<>", "{}" ] },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });
        });

        it('H - Good default, good global, good global language', async function () {
            await testVCReader({
                scope: await scope,
                name: goodName,
                validate,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "()", "[]", "<>", "{}" ]
                },
                userDefinable: {
                    global:                  { valid: true,  value: [ "()", "{}" ] },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: true,  value: [ "()", "[]", "<>", "{}" ] },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });
        });

        it('I - Good default, bad workspace, good workspace language', async function () {
            await testVCReader({
                scope: await scope,
                name: goodName,
                validate,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "``", "''", "\"\"" ]
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined }, 
                    workspace:               { valid: false, value: "[ \"``\", \"''\", \"\"\"\" ]" },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: true,  value: [ "``", "''", "\"\"" ] },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
            });
        });

        it('J - Bad default, good global, bad workspace, bad workspace folder, bad global language, '
            + 'bad workspace language + good workspace folder language', async function () {
                await testVCReader({
                    scope: await scope,
                    name: badName,
                    validate,
                    expected: {
                        defaultValue:         undefined,
                        defaultLanguageValue: undefined,
                        effectiveValue:       [ "``" ]
                    },
                    userDefinable: {
                        global:                  { valid: true,  value: [ "[]" ] }, 
                        workspace:               { valid: true,  value: [ "<>" ] },
                        workspaceFolder:         { valid: false, value: {} },
                        globalLanguage:          { valid: false, value: 10.5 },
                        workspaceLanguage:       { valid: false, value: [ "[[]]" ] },
                        workspaceFolderLanguage: { valid: true,  value: [ "``" ] }
                    },
                });
        });

        it('K - Good value in all scopes', async function () {
            await testVCReader({
                scope: await scope,
                name: goodName,
                validate,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ ]
                },
                userDefinable: {
                    global:                  { valid: true, value: [ "()", "[]", "{}", "<>", "``" ] },
                    workspace:               { valid: true, value: [ "()", "[]", "{}", "<>" ]       },
                    workspaceFolder:         { valid: true, value: [ "()", "[]", "{}" ]             },
                    globalLanguage:          { valid: true, value: [ "()", "[]" ]                   },
                    workspaceLanguage:       { valid: true, value: [ "()" ]                         },
                    workspaceFolderLanguage: { valid: true, value: [ ]                              }                                                                                                       
                },
            });
        });

        it('L - Bad in all scopes', async function () {
            await testVCReader({
                scope: await scope,
                name: badName,
                validate,
                expected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined,
                    effectiveValue:       undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: null },
                    workspace:               { valid: false, value: [ '<>', '[]', '(())' ] },
                    workspaceFolder: { 
                        valid: false, 
                        value: [ 
                            { open: '[', close: ']' }, 
                            { open: '(', close: ')' }, 
                            { open: '<', close: '>' }, 
                        ]
                    },
                    globalLanguage:          { valid: false, value: '' },
                    workspaceLanguage:       { valid: false, value: { left: '"', right: '"' } },
                    workspaceFolderLanguage: { valid: false, value: 105.6 }
                },
            });
        });

        describe('# Constructor safety checks', function () {

            it('Throw when empty name', function () {
                assertVCReaderCtorThrows('');
            });
        
            it('Throw when whitespace only name', function () {
                assertVCReaderCtorThrows('              ');
            });

        });

    });

    // `VCDualReader` tests.
    //
    // We test `VCDualReader` with two variants of a new configuration, one with a good default 
    // value and another with a bad default value. Furthermore we use two corresponding variants of 
    // a deprecated configuration. In total we have:
    // 
    // - `@onlylys/vscode-validated-configuration-reader.goodDefault`
    // - `@onlylys/vscode-validated-configuration-reader.badDefault`
    // - `@onlylys/vscode-validated-configuration-reader.deprGoodDefault`
    // - `@onlylys/vscode-validated-configuration-reader.deprBadDefault`
    //
    // Similar to the tests for `VCReader`, we do not have configuration variants for no default 
    // values. Furthermore, we do not test the language based default values for both the new and 
    // deprecated configurations for reasons explained in the tests for `VCReader`.
    describe('VCDualReader' , function() {

        it('A - Good default, good depr default', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       expectedGoodDefaultValue
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                }
            });
        });

        it('B - Good default, bad depr default', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprBadName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       expectedGoodDefaultValue
                },
                deprExpected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                }
            });
        });

        it('C - Bad default, good depr default', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     badName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined,
                    effectiveValue:       normalize(expectedGoodDeprDefaultValue)
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                }
            });
        });

        it('D - Good default, good depr default, bad global, good depr global, bad global language', 
            async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "<>", "''" ]
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: [ "()", "[]", "<>", "" ] },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global: { 
                        valid: true, 
                        value: [
                            { open: "<", close: ">" },
                            { open: "'", close: "'" },
                        ]
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage: { 
                        valid: false, 
                        value: [
                            { open: "{{", close: "}}" }
                        ] 
                    },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                }
            });
        });

        it('E - Good default, good depr default, good global, good depr global, bad workspace folder'
        + ', bad depr workspace language', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "()", "[]", "<>" ]
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: true, value: [ "()", "[]", "<>" ] },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder: { 
                        valid: false, 
                        value: [
                            { open: "{", close: "" } 
                        ]
                    },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global: { 
                        valid: true, 
                        value: [
                            { open: "<", close: ">" },
                            { open: "'", close: "'" },
                        ]
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage: { 
                        valid: false, 
                        value: "cat"
                    },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                }
            });
        });

        it('F - Good default, bad depr default, bad workspace, good depr workspace'
        + ', bad depr workspace language folder', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprBadName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "()", "[]", "<>" ]
                },
                deprExpected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: [ "()", "[]", 10 ] },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace: { 
                        valid: true, 
                        value: [
                            { open: "(", close: ")" },
                            { open: "[", close: "]" },
                            { open: "<", close: ">" },
                        ]
                    },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { 
                        valid: false, 
                        value: [
                            { open: "{", close: "}" },
                            { open: "|", close: "|" },
                            { open: "<", clos:  ">" },
                        ]
                    }
                }
            });
        });

        it('G - Good default, good depr default, good global, good workspace, good depr workspace',
            async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "''", "{}" ]
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: true,  value: [ "()", "[]" ] },
                    workspace:               { valid: true,  value: [ "''", "{}" ] },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace: { 
                        valid: true, 
                        value: [
                            { open: ":",  close: ":" },
                            { open: "`",  close: "`" },
                            { open: "'", close: "'" },
                        ]
                    },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                }
            });
        });

        it('H - Good default, good depr default, good depr global, good depr workspace'
        +', good depr workspace folder, bad depr workspace folder language', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "<>", "''" ]      
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global: { 
                        valid: true, 
                        value: [
                            { open: "<", close: ">" },
                            { open: "'", close: "'" },
                            { open: "[", close: "]" },
                            { open: "(", close: ")" },
                        ]
                    },
                    workspace: { 
                        valid: true, 
                        value: [
                            { open: "<", close: ">" },
                            { open: "'", close: "'" },
                            { open: "[", close: "]" },
                        ]
                    },
                    workspaceFolder: { 
                        valid: true, 
                        value: [
                            { open: "<", close: ">" },
                            { open: "'", close: "'" },
                        ]
                    },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { 
                        valid: false, 
                        value: [
                            { left: "{", right: "}" },
                            { left: "(", right: ")" },
                        ]
                    }
                }
            });
        });

        it('I - Bad default, bad depr default, good workspace, bad depr global'
        + ', good workspace folder, bad depr global language', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     badName,
                deprName: deprBadName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "``" ]
                },
                deprExpected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: true,  value: [ "''", "{}", "()" ] },
                    workspaceFolder:         { valid: true,  value: [ "``" ] },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global: { 
                        valid: false, 
                        value: -65
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage: { 
                        valid: false,
                        value: {}
                    },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                }
            });
        });

        it('J - Good default, good depr default, good workspace folder, good depr global language',
            async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "()", "[]", "{}", "<>", "``", "''", "||", "\"\"" ]
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: true,  value: [ ] },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage: { 
                        valid: true, 
                        value: [
                            { open: "(",  close: ")" },
                            { open: "[",  close: "]" },
                            { open: "{",  close: "}" },
                            { open: "<",  close: ">" },
                            { open: "`",  close: "`" },
                            { open: "'",  close: "'" },
                            { open: "|",  close: "|" },
                            { open: "\"", close: "\"" }
                        ]
                    },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                }
            });
        });

        it('K - Good default, bad depr default, bad depr workspace, good global language'
        + ', bad depr workspace folder language', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprBadName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "[]", "()", "<>" ]
                },
                deprExpected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: true,  value: [ "[]", "()", "<>" ] },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace: { 
                        valid: false, 
                        value: [ "cat", "dog" ],
                    },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { 
                        valid: false, 
                        value: [
                            { open: ":",  close: ":" },
                            { open: "``", close: "`" },
                        ]
                    },
                }
            });
        });

        it('L - Good default, good depr default, good depr workspace language', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "{}", "<>" ]
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage: { 
                        valid: true, 
                        value: [
                            { open: "{", close: "}" },
                            { open: "<", close: ">" },
                        ]
                    },
                    workspaceFolderLanguage: { valid: false, value: undefined },
                }
            });
        });

        it('M - Good default, good depr default, good global, bad workspace, depr global language'
        + ', good global language, good workspace language', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "[]", "<>", "``", "''" ]
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: true,  value: [ "[]", "<>", "``" ] },
                    workspace:               { valid: false, value: -3.1 },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: true,  value: [ "()", "{}" ] },
                    workspaceLanguage:       { valid: true,  value: [ "[]", "<>", "``", "''" ] },
                    workspaceFolderLanguage: { valid: false, value: undefined }
                },
                deprUserDefinable: {
                    global: { 
                        valid: true, 
                        value: [
                            { open: "{", close: "}" },
                            { open: "<", close: ">" },
                            { open: "[", close: "]" },
                        ]
                    },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: undefined },
                }
            });
        });

        it('N - Bad default, good depr default, bad workspace folder, bad workspace folder language'
        + ', good depr workspace folder language', async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     badName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "{}", "<>", "[]" ]
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: [ [], "<>", "``" ] },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: false, value: null }
                },
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { 
                        valid: true, 
                        value: [
                            { open: "{", close: "}" },
                            { open: "<", close: ">" },
                            { open: "[", close: "]" },
                        ]
                    },
                }
            });
        });

        it('O - Good default, good depr default, bad depr workspace folder'
        + ', good depr workspace language, good workspace folder language'
        + ', good depr workspace folder language', 
            async function () {
            await testVCDualReader({
                scope:    await scope, 
                name:     goodName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "''", "\"\"", "``" ]
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder:         { valid: false, value: undefined },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage:       { valid: false, value: undefined },
                    workspaceFolderLanguage: { valid: true,  value: [ "''", "\"\"", "``" ] }
                },
                deprUserDefinable: {
                    global:                  { valid: false, value: undefined },
                    workspace:               { valid: false, value: undefined },
                    workspaceFolder: { 
                        valid: false, 
                        value: [
                            { open: "(",  close: ")" },
                            { open: "[[", close: "]]" },
                            { open: "<",  close: ">" },
                            { open: "{",  close: "}" },
                        ] 
                    },
                    globalLanguage:          { valid: false, value: undefined },
                    workspaceLanguage: { 
                        valid: true, 
                        value: [
                            { open: "(", close: ")" },
                        ]
                    },
                    workspaceFolderLanguage: { 
                        valid: true, 
                        value: [
                            { open: "{", close: "}" },
                            { open: "<", close: ">" },
                            { open: "[", close: "]" },
                        ]
                    },
                }
            });
        });

        it('P - Good in all scopes', async function () {
            await testVCDualReader({
                scope: await scope, 
                name: goodName,
                deprName: deprGoodName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       [ "()" ]
                },
                userDefinable: {
                    global:                  { valid: true, value: [ "()", "[]", "{}", "<>", "``", "''" ] },
                    workspace:               { valid: true, value: [ "()", "[]", "{}", "<>", "``" ] },
                    workspaceFolder:         { valid: true, value: [ "()", "[]", "{}", "<>" ] },
                    globalLanguage:          { valid: true, value: [ "()", "[]", "{}" ] },
                    workspaceLanguage:       { valid: true, value: [ "()", "[]" ] },
                    workspaceFolderLanguage: { valid: true, value: [ "()" ] }
                },
                deprExpected: {
                    defaultValue:         expectedGoodDeprDefaultValue,
                    defaultLanguageValue: undefined
                },
                deprUserDefinable: {
                    global: { 
                        valid: true, 
                        value: [ 
                            { open: "*", close: "*" },
                            { open: "%", close: "%" },
                            { open: "@", close: "@" },
                            { open: "!", close: "!" },
                            { open: "#", close: "#" },
                            { open: "$", close: "$" },
                            { open: "^", close: "^" },
                        ]
                    },
                    workspace: { 
                        valid: true, 
                        value: [
                            { open: "*", close: "*" },
                            { open: "%", close: "%" },
                            { open: "@", close: "@" },
                            { open: "!", close: "!" },
                            { open: "#", close: "#" },
                            { open: "$", close: "$" },
                        ]
                    },
                    workspaceFolder: { 
                        valid: true, 
                        value: [
                            { open: "*", close: "*" },
                            { open: "%", close: "%" },
                            { open: "@", close: "@" },
                            { open: "!", close: "!" },
                            { open: "#", close: "#" },
                        ]
                    },
                    globalLanguage: { 
                        valid: true, 
                        value: [
                            { open: "*", close: "*" },
                            { open: "%", close: "%" },
                            { open: "@", close: "@" },
                            { open: "!", close: "!" },
                        ]
                    },
                    workspaceLanguage: { 
                        valid: true, 
                        value: [
                            { open: "*", close: "*" },
                            { open: "%", close: "%" },
                            { open: "@", close: "@" },
                        ]
                    },
                    workspaceFolderLanguage: { 
                        valid: true, 
                        value: [
                            { open: "*", close: "*" },
                            { open: "%", close: "%" },
                        ]
                    }
                }
            });
        });

        it('Q - Good default, but bad in all other scopes', async function () {
            await testVCDualReader({
                scope: await scope, 
                name: goodName,
                deprName: deprBadName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         expectedGoodDefaultValue,
                    defaultLanguageValue: undefined,
                    effectiveValue:       expectedGoodDefaultValue
                },
                userDefinable: {
                    global:                  { valid: false, value: [ "()", "[[]]", "{}" ] },
                    workspace:               { valid: false, value: {} },
                    workspaceFolder:         { valid: false, value: [ { open: "(", close: ")" } ] },
                    globalLanguage:          { valid: false, value: "" },
                    workspaceLanguage:       { valid: false, value: 11.3 },
                    workspaceFolderLanguage: { valid: false, value: "() []" }
                },
                deprExpected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined
                },
                deprUserDefinable: {
                    global: { 
                        valid: false, 
                        value: "cat"
                    },
                    workspace: { 
                        valid: false, 
                        value: [
                            { open: "**", close: "**" },
                            { open: "%", close: "%" },
                            { open: "@", close: "@" },
                        ]
                    },
                    workspaceFolder: { 
                        valid: false, 
                        value: [ "()" , "[]" ]
                    },
                    globalLanguage: { 
                        valid: false, 
                        value: null 
                    },
                    workspaceLanguage: { 
                        valid: false, 
                        value: 10.2
                    },
                    workspaceFolderLanguage: { 
                        valid: false, 
                        value: [
                            { left: "[", right: "]" },
                            { left: "(", right: ")" },
                        ]
                    }
                }
            });
        });

        it('R - Bad in all scopes', async function () {
            await testVCDualReader({
                scope: await scope, 
                name: badName,
                deprName: deprBadName,
                validate,
                deprValidate,
                normalize,
                expected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined,
                    effectiveValue:       undefined
                },
                userDefinable: {
                    global:                  { valid: false, value: [ "[[]]" ] },
                    workspace:               { valid: false, value: { open: "(", close: ")" } },
                    workspaceFolder:         { valid: false, value: [ "(())", "[]", "<>" ] },
                    globalLanguage:          { valid: false, value: -5.6 },
                    workspaceLanguage:       { valid: false, value: [ "(", ")", "'", "'" ] },
                    workspaceFolderLanguage: { valid: false, value: null }
                },
                deprExpected: {
                    defaultValue:         undefined,
                    defaultLanguageValue: undefined
                },
                deprUserDefinable: {
                    global: { 
                        valid: false, 
                        value: "cat says meow"
                    },
                    workspace: { 
                        valid: false, 
                        value: [
                            { open: "**", close: "**" },
                            { open: "@", close: "@" },
                        ]
                    },
                    workspaceFolder: { 
                        valid: false, 
                        value: [ "()" , "[]", "<>", null ]
                    },
                    globalLanguage: { 
                        valid: false, 
                        value: [
                            { openc: "[", close: "]" },
                            { open:  "(", close: ")" },
                            { open:  "<", close: ">" },
                        ]
                    },
                    workspaceLanguage: { 
                        valid: false, 
                        value: null
                    },
                    workspaceFolderLanguage: { 
                        valid: false, 
                        value: [
                            { open: "(", close: ")" },
                            { open: "<", close: ">" },
                            { open: "[", close: "]]" },
                        ]
                    }
                }
            });
        });

        describe('# Constructor safety checks', function () {

            it('Throw when empty name for the new configuration', function () {
                assertVCDualReaderCtorThrows(
                    '',
                    'deprDummy'
                );
            });

            it('Throw when whitespace only name for the new configuration', function () {
                assertVCDualReaderCtorThrows(
                    '              ',
                    'deprDummy'
                );
            });

            it('Throw when empty name for deprecated configuration', function () {
                assertVCDualReaderCtorThrows(
                    'dummy',
                    '',
                );
            });

            it('Throw when whitespace only for name of deprecated configuration', function () {
                assertVCDualReaderCtorThrows(
                    'dummy',
                    '                   ',
                );
            });

        });

    });

    // Utilities Tests
    describe('Utilities', function() {
        
        it('setConfiguration', async function () {
            await testSetConfiguration(testSetConfigurationName, await scope);
        });

        it('clearConfiguration', async function () {
            await testClearConfiguration(testSetConfigurationName, await scope);
        });

    });

    // Cleanup
    describe('Epilogue', function () {

        it('Clear all test configuration values', async function () {
            await clearConfiguration(goodName,                 await scope);
            await clearConfiguration(badName,                  await scope);
            await clearConfiguration(deprGoodName,             await scope);
            await clearConfiguration(deprBadName,              await scope);
            await clearConfiguration(testSetConfigurationName, await scope);
        });

    });

});

