import * as path from 'path';
import * as assert from 'assert';
import { workspace, TextDocument, Uri } from 'vscode';
import { clearConfiguration, testVCReader, testVCDualReader, setConfiguration, VCReaderTestSpec, VCDualReaderTestSpec } from './utilities';
import { VCReader } from '../../vc-reader';
import { VCDualReader } from '../../vc-dual-reader';

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
 * The [section name] of the configurations defined by this package. 
 * 
 * [section name]: https://code.visualstudio.com/api/references/vscode-api#workspace.getConfiguration
 */
const section = '@onlylys/vscode-validated-configuration-reader';

/**
 * The full name of the new configuration with a good default value.
 */
const goodDefaultName = `${section}.goodDefault`;

/**
 * The full name of the new configuration with a bad default value.
 */
const badDefaultName = `${section}.badDefault`;

/**
 * The full name of the deprecated configuration with a good default value.
 */
const deprGoodDefaultName = `${section}.deprGoodDefault`;

/**
 * The full name of the deprecated configuration with a bad default value.
 */
const deprBadDefaultName = `${section}.deprBadDefault`;

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
 * Callback to transform the effective value if it is from the new configuration.
 */
const transform = (t: string[]): string => t.join('');

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
 * Callback to transform the effective value if it is from the deprecated configuration.
 */
const deprTransform = (d: { open: string, close: string }[]): string => {
    return d.map(({ open, close }) => `${open}${close}`).join('');
};

/**
 * `VCReader` tests.
 *
 * We test `VCReader` with two variants of the same configuration, one with a good default value 
 * (good meaning has the correct type) and another with a bad default value (bad meaning has the
 * wrong type). The two configurations we have have the names:
 * 
 * - `@onlylys/vscode-validated-configuration-reader.goodDefault`
 * - `@onlylys/vscode-validated-configuration-reader.badDefault`
 *
 * Notice that there is no variant with no default value. That is because if a default value is not 
 * specified in the package manifest, vscode will implicitly provide a default value based on the 
 * declared type of the configuration. For instance, for a configuration that was declared an `array` 
 * type, the implicit default value is the empty array `[]`, which means for a configuration that
 * does not have an explicit default value defined for it, it will have a good default value, so 
 * testing of such configurations is already covered under the testing of the configuration with a
 * good default value. 
 * 
 * Note that we do not test the language based default value (`defaultLanguageValue`) since vscode 
 * does not yet (at least as of 1.57.1) allow extensions to provide default values for third party 
 * configurations (such as the two listed above that we are using for testing). 
 */
const vcReaderTests: VCReaderTestSpec<string[], string>[] = [
    { 
        description: `A - Good default value. No values elsewhere.`,
        scope, validate, transform,
        name: goodDefaultName,
        preconfigure: {
            globalValue:                  undefined,
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                 expectedGoodDefaultValue,
            globalValue:                  undefined,
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            defaultLanguageValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined,
            effectiveValue:               transform(expectedGoodDefaultValue)
        },
    },
    { 
        description: `B - Good default value. Bad values elsewhere.`,
        scope, validate, transform,
        name: goodDefaultName, 
        preconfigure: {
            globalValue:                  'cat',                            // Bad value.
            workspaceValue:               [ { open: '{', close: '}' } ],    // Bad value.
            workspaceFolderValue:         '[]',                             // Bad value.
            globalLanguageValue:          6,                                // Bad value.
            workspaceLanguageValue:       [ '{{}', '[]', '<>' ],            // Bad value.
            workspaceFolderLanguageValue: [ [ '{', '}' ] ],                 // Bad value.
        },
        expected: {
            defaultValue:                 expectedGoodDefaultValue,
            globalValue:                  undefined,
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            defaultLanguageValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined,
            effectiveValue:               transform(expectedGoodDefaultValue)
        },
    },
    { 
        description: `C - Bad default value. No values elsewhere.`,
        scope, validate, transform,
        name: badDefaultName,
        preconfigure: {
            globalValue:                  undefined,
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                 undefined,
            globalValue:                  undefined,
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            defaultLanguageValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined,
            effectiveValue:               undefined
        },
    },
    {
        description: `D - Good default and global values. No values elsewhere.`,
        scope, validate, transform,
        name: goodDefaultName, 
        preconfigure: {
            globalValue:                  [ "()", "{}" ],    // Good value.
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                 expectedGoodDefaultValue,
            globalValue:                  [ "()", "{}" ],
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            defaultLanguageValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined,
            effectiveValue:               "(){}"
        },
    },
    {
        description: `E - Good default value. Bad global value. No values elsewhere.`,
        scope, validate, transform,
        name: goodDefaultName, 
        preconfigure: {
            globalValue:                  [ "(())", "{}" ],    // Bad value.
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                 expectedGoodDefaultValue,
            globalValue:                  undefined,
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            defaultLanguageValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined,
            effectiveValue:               transform(expectedGoodDefaultValue)
        },
    },
    { 
        description: `F - Good global value. Bad default value. No values elsewhere.`,
        scope, validate, transform,
        name: badDefaultName, 
        preconfigure: {
            globalValue:                  [ "()", "{}", "<>" ],    // Good value.
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                 undefined,
            globalValue:                  [ "()", "{}", "<>" ],
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            defaultLanguageValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined,
            effectiveValue:               "(){}<>"
        },
    },
    { 
        description: `G - Good default, global and workspace folder values. Bad workspace value. \
        No values elsewhere.`,
        scope, validate, transform,
        name: goodDefaultName, 
        preconfigure: {
            globalValue:                  [ "()", "{}", "``" ],      // Good value.
            workspaceValue:               [ "||||", "[]", "<>" ],    // Bad value.
            workspaceFolderValue:         [ "[]", "<>", "{}" ],      // Good value.
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                 expectedGoodDefaultValue,
            globalValue:                  [ "()", "{}", "``" ],
            workspaceValue:               undefined,
            workspaceFolderValue:         [ "[]", "<>", "{}" ],
            defaultLanguageValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined,
            effectiveValue:               "[]<>{}"
        },
    },
    { 
        description: `H - Good default, global and global language values. No values elsewhere.`,
        scope, validate, transform,
        name: goodDefaultName, 
        preconfigure: {
            globalValue:                  [ "()", "{}" ],                // Good value.
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            globalLanguageValue:          [ "()", "[]", "<>", "{}" ],    // Good value.
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                 expectedGoodDefaultValue,
            globalValue:                  [ "()", "{}" ],
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            defaultLanguageValue:         undefined,
            globalLanguageValue:          [ "()", "[]", "<>", "{}" ],
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined,
            effectiveValue:               "()[]<>{}"
        },
    },
    { 
        description: `I - Good default and workspace language values. Bad workspace value. \
        No values elsewhere.`,
        scope, validate, transform,
        name: goodDefaultName, 
        preconfigure: {
            globalValue:                  undefined,
            workspaceValue:               [ "``", "''", "(()" ],    // Bad value.
            workspaceFolderValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       [ "``", "''", "\"\"" ],   // Good value.
            workspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                 expectedGoodDefaultValue,
            globalValue:                  undefined,
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            defaultLanguageValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       [ "``", "''", "\"\"" ],
            workspaceFolderLanguageValue: undefined,
            effectiveValue:               "``''\"\""
        },
    },
    { 
        description: `J - Good global, workspace and workspace folder language values. \
        Bad default, workspace folder, global language and workspace language values. \ 
        No values elsewhere.`,
        scope, validate, transform,
        name: badDefaultName, 
        preconfigure: {
            globalValue:                  [ "[]" ],      // Good value.
            workspaceValue:               [ "<>" ],      // Good value.
            workspaceFolderValue:         {},            // Bad value.
            globalLanguageValue:          10.5,          // Bad value.
            workspaceLanguageValue:       "[],<>,{}",    // Bad value.
            workspaceFolderLanguageValue: [ "``" ]       // Good value.
        },
        expected: {
            defaultValue:                 undefined,
            globalValue:                  [ "[]" ],
            workspaceValue:               [ "<>" ],
            workspaceFolderValue:         undefined,
            defaultLanguageValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: [ "``" ],
            effectiveValue:               "``"
        },
    },
    {
        description: `K - Good everywhere except default language value. No default language value.`,
        scope, validate, transform,
        name: goodDefaultName, 
        preconfigure: {
            globalValue:                  [ "()", "[]", "{}", "<>", "``" ],    // Good value.
            workspaceValue:               [ "()", "[]", "{}", "<>" ],          // Good value.
            workspaceFolderValue:         [ "()", "[]", "{}" ],                // Good value.
            globalLanguageValue:          [ "()", "[]" ],                      // Good value.
            workspaceLanguageValue:       [ "()" ],                            // Good value.
            workspaceFolderLanguageValue: [ ]                                  // Good value.
        },
        expected: {
            defaultValue:                 expectedGoodDefaultValue,
            globalValue:                  [ "()", "[]", "{}", "<>", "``" ],
            workspaceValue:               [ "()", "[]", "{}", "<>" ],
            workspaceFolderValue:         [ "()", "[]", "{}" ],
            defaultLanguageValue:         undefined,
            globalLanguageValue:          [ "()", "[]" ],
            workspaceLanguageValue:       [ "()" ],
            workspaceFolderLanguageValue: [ ],
            effectiveValue:               ""
        },
    },
    {
        description: `L - Bad everywhere except default language value. No default language value.`,
        scope, validate, transform,
        name: badDefaultName, 
        preconfigure: {
            globalValue:                  null,                         // Bad value.
            workspaceValue:               [ '<>', '[]', '(())' ],       // Bad value.
            workspaceFolderValue:         [                             
                { open: '[', close: ']' }, 
                { open: '(', close: ')' } 
            ],                                                          // Bad value.
            globalLanguageValue:          '',                           // Bad Value.
            workspaceLanguageValue:       { left: '"', right: '"' },    // Bad Value.
            workspaceFolderLanguageValue: 105.6                         // Bad Value.
        },
        expected: {
            defaultValue:                 undefined,
            globalValue:                  undefined,
            workspaceValue:               undefined,
            workspaceFolderValue:         undefined,
            defaultLanguageValue:         undefined,
            globalLanguageValue:          undefined,
            workspaceLanguageValue:       undefined,
            workspaceFolderLanguageValue: undefined,
            effectiveValue:               undefined
        },
    }
];


/**
 * `VCDualReader` tests.
 *
 * We test `VCDualReader` with two variants of a new configuration, one with a good default value and 
 * another with a bad default value. Furthermore we use two corresponding variants of a deprecated 
 * configuration. In total, we use the following configurations:
 * 
 * - `@onlylys/vscode-validated-configuration-reader.goodDefault`
 * - `@onlylys/vscode-validated-configuration-reader.badDefault`
 * - `@onlylys/vscode-validated-configuration-reader.deprGoodDefault`
 * - `@onlylys/vscode-validated-configuration-reader.deprBadDefault`
 *
 * Similar to the tests for `VCReader`, we do not have configuration variants with no default values. 
 * Furthermore, we do not test the language based default values for both the new and deprecated 
 * configurations for reasons explained in the tests for `VCReader`.
 */
const vcDualReaderTests: VCDualReaderTestSpec<string[], { open: string, close: string }[], string>[] = [
    {
        description: `A - Good default and depr default values. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   transform(expectedGoodDefaultValue)
        }
    },
    {
        description: `B - Good default value. Bad depr default value. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprBadDefaultName,
        preconfigure: {
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   transform(expectedGoodDefaultValue)
        }
    },
    {
        description: `C - Good depr default value. Bad default value. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     badDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                     undefined,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   deprTransform(expectedGoodDeprDefaultValue)
        }
    },
    { 
        description: `D - Good default, depr default, and depr global values. \
        Bad global and depr global language values. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      [ "()", "[]", "<>", "" ],           // Bad value.
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  [ 
                { open: "<", close: ">" }, 
                { open: "'", close: "'" } 
            ],                                                                    // Good value.
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          [ { open: "{{", close: "}}" } ],    // Bad value.
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  [ { open: "<", close: ">" }, { open: "'", close: "'" } ],
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "<>''"
        }
    },
    {
        description: `E - Good default, depr default and global values. \
        Bad depr global, workspace folder and depr workspace language values. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      [ "()", "[]", "<>" ],             // Good value.
            workspaceValue:                   undefined,
            workspaceFolderValue:             [ { open: "{", close: "}" } ],    // Bad value.
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  [ 
                { open: "{", close: "}" }, 
                { open: "(", close: "))" } 
            ],                                                                  // Bad value.
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       "cat",                            // Bad value.
            deprWorkspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      [ "()", "[]", "<>" ],
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "()[]<>"
        }
    },
    {
        description: `F - Good default and depr workspace values. \
        Bad depr default, workspace and depr workspace language folder values. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprBadDefaultName,
        preconfigure: {
            globalValue:                      undefined,
            workspaceValue:                   [ "()", "[]", 10 ],    // Bad value.
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               [ 
                { open: "(", close: ")" }, 
                { open: "[", close: "]" }, 
                { open: "<", close: ">" } 
            ],                                                       // Good value.
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: [ 
                { open: "{", close: "}" }, 
                { open: "|", close: "|" }, 
                { open: "<", clos:  ">" } 
            ]                                                        // Bad value.
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               [ 
                { open: "(", close: ")" }, 
                { open: "[", close: "]" }, 
                { open: "<", close: ">" } 
            ],
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "()[]<>"
        }
    },
    {
        description: `G - Good default, depr default, global, workspace and depr workspace values. \
        No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      [ "()", "[]" ],    // Good value. 
            workspaceValue:                   [ "''", "{}" ],    // Good value.
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               [ 
                { open: ":", close: ":" }, 
                { open: "`", close: "`" }, 
                { open: "'", close: "'" } 
            ],                                                   // Good value.
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      [ "()", "[]" ],
            workspaceValue:                   [ "''", "{}" ],
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               [ 
                { open: ":", close: ":" }, 
                { open: "`", close: "`" }, 
                { open: "'", close: "'" } 
            ],
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "''{}"
        }
    },
    {
        description: `H - Good default, depr default, depr global, depr workspace and \
        depr workspace folder values. Bad depr workspace folder language value. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  [ 
                { open: "<", close: ">" }, 
                { open: "'", close: "'" }, 
                { open: "[", close: "]" }, 
                { open: "(", close: ")" } 
            ],    // Good value.
            deprWorkspaceValue:               [ 
                { open: "<", close: ">" }, 
                { open: "'", close: "'" }, 
                { open: "[", close: "]" } 
            ],    // Good value.
            deprWorkspaceFolderValue:         [ 
                { open: "<", close: ">" }, 
                { open: "'", close: "'" } 
            ],    // Good value.
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: [ 
                { left: "{", right: "}" }, 
                { left: "(", right: ")" } 
            ]    // Bad value.
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  [ 
                { open: "<", close: ">" }, 
                { open: "'", close: "'" }, 
                { open: "[", close: "]" }, 
                { open: "(", close: ")" } 
            ],
            deprWorkspaceValue:               [ 
                { open: "<", close: ">" }, 
                { open: "'", close: "'" }, 
                { open: "[", close: "]" } 
            ],
            deprWorkspaceFolderValue:         [ 
                { open: "<", close: ">" }, 
                { open: "'", close: "'" } 
            ],
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "<>''"
        }
    },
    {
        description: `I - Good workspace and workspace folder values. \
        Bad default, depr default, depr global and depr global language values. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     badDefaultName,
        deprName: deprBadDefaultName,
        preconfigure: {
            globalValue:                      undefined,
            workspaceValue:                   [ "''", "{}", "()" ],    // Good value.
            workspaceFolderValue:             [ "``" ],                // Good value.
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  -65,                     // Bad value.
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          {},                      // Bad value.
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
        },
        expected: {
            defaultValue:                     undefined,
            globalValue:                      undefined,
            workspaceValue:                   [ "''", "{}", "()" ],
            workspaceFolderValue:             [ "``" ],
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "``"
        }
    },
    {
        description: `J - Good default, depr default, workspace folder and depr global language values. \
        No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             [],           // Good value.
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          [
                { open: "(",  close: ")" },
                { open: "[",  close: "]" },
                { open: "{",  close: "}" },
                { open: "<",  close: ">" },
                { open: "`",  close: "`" },
                { open: "'",  close: "'" },
                { open: "|",  close: "|" },
                { open: "\"", close: "\"" }
            ],                                              // Good value.
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             [],
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          [
                { open: "(",  close: ")" },
                { open: "[",  close: "]" },
                { open: "{",  close: "}" },
                { open: "<",  close: ">" },
                { open: "`",  close: "`" },
                { open: "'",  close: "'" },
                { open: "|",  close: "|" },
                { open: "\"", close: "\"" }
            ],
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "()[]{}<>``''||\"\""
        }
    },
    {
        description: `K - Good default, global and global language values. \
        Bad depr default, depr workspace and depr workspace folder language values. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprBadDefaultName,
        preconfigure: {
            globalValue:                      [ "''", "``" ],          // Good value.
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              [ "[]", "()", "<>" ],    // Good value.
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               [ "cat", "dog" ],        // Bad value.
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: [
                { open: ":",  close: ":" },
                { open: "``", close: "`" },
            ],                                                         // Bad value.
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      [ "''", "``" ],
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              [ "[]", "()", "<>" ],
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "[]()<>"
        }
    },
    {
        description: `L - Good default, depr default and depr workspace language values. \
        No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       [
                { open: "{", close: "}" },
                { open: "<", close: ">" },
            ],    // Good value.
            deprWorkspaceFolderLanguageValue: undefined,

        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       [
                { open: "{", close: "}" },
                { open: "<", close: ">" },
            ],
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "{}<>"
        }
    },
    {

        description: `M - Good default, depr default, global, depr global, global language and \
        workspace language values. Bad workspace value. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      [ "[]", "<>", "``" ],          // Good value.
            workspaceValue:                   -3.1,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              [ "()", "{}" ],                // Good value.
            workspaceLanguageValue:           [ "[]", "<>", "``", "''" ],    // Good value.
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  [
                { open: "{", close: "}" },
                { open: "<", close: ">" },
                { open: "[", close: "]" },
            ],                                                               // Good value.
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,

        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      [ "[]", "<>", "``" ],
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              [ "()", "{}" ],
            workspaceLanguageValue:           [ "[]", "<>", "``", "''" ],
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  [
                { open: "{", close: "}" },
                { open: "<", close: ">" },
                { open: "[", close: "]" },
            ],
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "[]<>``''"
        }
    },
    {
        description: `N - Good depr default and depr workspace folder language values. \
        Bad default, workspace folder and workspace folder language values. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     badDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             [ [], "<>", "``" ],    // Bad value.
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     null,                  // Bad value.
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: [
                { open: "{", close: "}" },
                { open: "<", close: ">" },
                { open: "[", close: "]" },
            ],                                                       // Good value.
        },
        expected: {
            defaultValue:                     undefined,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: [
                { open: "{", close: "}" },
                { open: "<", close: ">" },
                { open: "[", close: "]" },
            ],
            effectiveValue:                   "{}<>[]"
        }
    },
    {
        description: `O - Good default, depr default, depr workspace language, \
        workspace folder language and depr workspace folder language values. \
        Bad depr workspace folder value. No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     [ "''", "\"\"", "``" ],           // Good value.
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         [
                { open: "(",  close: ")" },
                { open: "[[", close: "]]" },
                { open: "<",  close: ">" },
                { open: "{",  close: "}" },
            ],                                                                  // Bad value.
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       [ { open: "(", close: ")" } ],    // Good value.
            deprWorkspaceFolderLanguageValue: [
                { open: "{", close: "}" },
                { open: "<", close: ">" },
                { open: "[", close: "]" },
            ],                                                                  // Good value.
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     [ "''", "\"\"", "``" ],
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       [ { open: "(", close: ")" } ],
            deprWorkspaceFolderLanguageValue: [
                { open: "{", close: "}" },
                { open: "<", close: ">" },
                { open: "[", close: "]" },
            ],
            effectiveValue:                   "''\"\"``"
        }
    },
    {
        description: `P - Good everywhere except the default language and depr default language values. \
        No default language or depr default language values.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                  [ "()", "[]", "{}", "<>", "``", "''" ],    // Good value.
            workspaceValue:               [ "()", "[]", "{}", "<>", "``" ],          // Good value.
            workspaceFolderValue:         [ "()", "[]", "{}", "<>" ],                // Good value.
            globalLanguageValue:          [ "()", "[]", "{}" ],                      // Good value.
            workspaceLanguageValue:       [ "()", "[]" ],                            // Good value.
            workspaceFolderLanguageValue: [ "()" ],                                  // Good value.
            deprGlobalValue: [ 
                { open: "*", close: "*" },
                { open: "%", close: "%" },
                { open: "@", close: "@" },
                { open: "!", close: "!" },
                { open: "#", close: "#" },
                { open: "$", close: "$" },
                { open: "^", close: "^" },
            ],                                                                       // Good value.
            deprWorkspaceValue: [
                { open: "*", close: "*" },
                { open: "%", close: "%" },
                { open: "@", close: "@" },
                { open: "!", close: "!" },
                { open: "#", close: "#" },
                { open: "$", close: "$" },
            ],                                                                       // Good value.
            deprWorkspaceFolderValue: [
                { open: "*", close: "*" },
                { open: "%", close: "%" },
                { open: "@", close: "@" },
                { open: "!", close: "!" },
                { open: "#", close: "#" },
            ],                                                                       // Good value.
            deprGlobalLanguageValue: [
                { open: "*", close: "*" },
                { open: "%", close: "%" },
                { open: "@", close: "@" },
                { open: "!", close: "!" },
            ],                                                                       // Good value.
            deprWorkspaceLanguageValue: [
                { open: "*", close: "*" },
                { open: "%", close: "%" },
                { open: "@", close: "@" },
            ],                                                                       // Good value.
            deprWorkspaceFolderLanguageValue: [
                { open: "*", close: "*" },
                { open: "%", close: "%" },
            ]                                                                        // Good value.
        },
        expected: {
            defaultValue:                 expectedGoodDefaultValue,
            globalValue:                  [ "()", "[]", "{}", "<>", "``", "''" ],
            workspaceValue:               [ "()", "[]", "{}", "<>", "``" ],
            workspaceFolderValue:         [ "()", "[]", "{}", "<>" ],
            defaultLanguageValue:         undefined,
            globalLanguageValue:          [ "()", "[]", "{}" ],
            workspaceLanguageValue:       [ "()", "[]" ],
            workspaceFolderLanguageValue: [ "()" ],
            deprDefaultValue:             expectedGoodDeprDefaultValue,
            deprGlobalValue: [ 
                { open: "*", close: "*" },
                { open: "%", close: "%" },
                { open: "@", close: "@" },
                { open: "!", close: "!" },
                { open: "#", close: "#" },
                { open: "$", close: "$" },
                { open: "^", close: "^" },
            ],
            deprWorkspaceValue: [
                { open: "*", close: "*" },
                { open: "%", close: "%" },
                { open: "@", close: "@" },
                { open: "!", close: "!" },
                { open: "#", close: "#" },
                { open: "$", close: "$" },
            ],
            deprDefaultLanguageValue:     undefined,
            deprWorkspaceFolderValue: [
                { open: "*", close: "*" },
                { open: "%", close: "%" },
                { open: "@", close: "@" },
                { open: "!", close: "!" },
                { open: "#", close: "#" },
            ],
            deprGlobalLanguageValue: [
                { open: "*", close: "*" },
                { open: "%", close: "%" },
                { open: "@", close: "@" },
                { open: "!", close: "!" },
            ],
            deprWorkspaceLanguageValue: [
                { open: "*", close: "*" },
                { open: "%", close: "%" },
                { open: "@", close: "@" },
            ],
            deprWorkspaceFolderLanguageValue: [
                { open: "*", close: "*" },
                { open: "%", close: "%" },
            ],
            effectiveValue: "()"
        }
    },
    {
        description: `Q - Good default value. \
        Bad everywhere except the default language and depr default language values. \
        No default language and depr default language values.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprBadDefaultName,
        preconfigure: {
            globalValue:                      [ "()", "[[]]", "{}" ],           // Bad value.
            workspaceValue:                   {},                               // Bad value.
            workspaceFolderValue:             [ { open: "(", close: ")" } ],    // Bad value.
            globalLanguageValue:              "",                               // Bad value.
            workspaceLanguageValue:           11.3,                             // Bad value.
            workspaceFolderLanguageValue:     "() []",                          // Bad value.
            deprGlobalValue:                  "cat",                            // Bad value.
            deprWorkspaceValue:               [
                { open: "**", close: "**" },
                { open: "%",  close: "%"  },
                { open: "@",  close: "@"  },
            ],                                                                  // Bad value.
            deprWorkspaceFolderValue:         [ "()" , "[]" ],                  // Bad value.
            deprGlobalLanguageValue:          null,                             // Bad value.
            deprWorkspaceLanguageValue:       10.2,                             // Bad value.
            deprWorkspaceFolderLanguageValue: [
                { left: "[", right: "]" },
                { left: "(", right: ")" },
            ]                                                                   // Bad value.
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   transform(expectedGoodDefaultValue)
        }
    },
    {
        description: `R - Bad everywhere except the default language and depr default language values. \
        No default language and depr default language values.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     badDefaultName,
        deprName: deprBadDefaultName,
        preconfigure: {
            globalValue:                      [ "[[]]" ],                     // Bad value.
            workspaceValue:                   { open: "(", close: ")" },      // Bad value.
            workspaceFolderValue:             [ "(())", "[]", "<>" ],         // Bad value.
            globalLanguageValue:              -5.6,                           // Bad value.
            workspaceLanguageValue:           [ "(", ")", "'", "'" ],         // Bad value.
            workspaceFolderLanguageValue:     null,                           // Bad value.
            deprGlobalValue:                  "cat says meow",                // Bad value.
            deprWorkspaceValue:               [
                { open: "**", close: "**" },
                { open: "@",  close: "@"  },
            ],                                                                // Bad value.
            deprWorkspaceFolderValue:         [ "()" , "[]", "<>", null ],    // Bad value.
            deprGlobalLanguageValue:          [
                { openc: "[", close: "]" },
                { open:  "(", close: ")" },
                { open:  "<", close: ">" },
            ],                                                                // Bad value.
            deprWorkspaceLanguageValue:       null,                           // Bad value.
            deprWorkspaceFolderLanguageValue: [
                { open: "(", close: ")"  },
                { open: "<", close: ">"  },
                { open: "[", close: "]]" },
            ],                                                                // Bad value.
        },
        expected: {
            defaultValue:                     undefined,
            globalValue:                      undefined,
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   undefined,
        }
    },
    {
        description: `S - Good default, depr default, global and depr workspace values. \
        No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      [ "[]", "()" ],    // Good value.
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               [
                { open: "<", close: ">" },
                { open: "[", close: "]" },
            ],                                                   // Good value.
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      [ "[]", "()" ],
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               [
                { open: "<", close: ">" },
                { open: "[", close: "]" },
            ],
            deprWorkspaceFolderValue:         undefined,
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "<>[]",
        }
    },
    {
        description: `T - Good default, depr default, global and depr workspace folder values. \
        No values elsewhere.`,
        scope, validate, transform, deprValidate, deprTransform,
        name:     goodDefaultName,
        deprName: deprGoodDefaultName,
        preconfigure: {
            globalValue:                      [ "()" ],    // Good value.
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         [
                { open: "<", close: ">" },
                { open: "[", close: "]" },
                { open: "{", close: "}" },
                { open: "'", close: "'" },
                { open: "`", close: "`" },
            ],
            deprGlobalLanguageValue:          undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined
        },
        expected: {
            defaultValue:                     expectedGoodDefaultValue,
            globalValue:                      [ "()" ],
            workspaceValue:                   undefined,
            workspaceFolderValue:             undefined,
            defaultLanguageValue:             undefined,
            globalLanguageValue:              undefined,
            workspaceLanguageValue:           undefined,
            workspaceFolderLanguageValue:     undefined,
            deprDefaultValue:                 expectedGoodDeprDefaultValue,
            deprGlobalValue:                  undefined,
            deprWorkspaceValue:               undefined,
            deprWorkspaceFolderValue:         [
                { open: "<", close: ">" },
                { open: "[", close: "]" },
                { open: "{", close: "}" },
                { open: "'", close: "'" },
                { open: "`", close: "`" },
            ],
            deprGlobalLanguageValue:          undefined,
            deprDefaultLanguageValue:         undefined,
            deprWorkspaceLanguageValue:       undefined,
            deprWorkspaceFolderLanguageValue: undefined,
            effectiveValue:                   "<>[]{}''``",
        }
    }
];

// Test entry point.
//
// To test this package, we will be running this package as a vscode extension to see if the readers
// defined in this package can correctly read the configuration values. We will also be using the
// vscode API to modify configuration values along the way in order to perform more comprehensive 
// tests.
describe('`validated-configuration-reader` Tests', function () {

    describe('VCReader', function() {

        for (const spec of vcReaderTests) {
            it(spec.description, async function () {
                await testVCReader(spec);
            });
        }
        describe('# Constructor safety checks', function () {

            // We use dummy callbacks because we just want to know whether the constructor throws 
            // after checking the name. The callbacks aren't used at all in the constructor so 
            // anything will do really.
            const validate  = (t: unknown): t is number => typeof t === 'number';
            const transform = (t: number) => t;

            it('Throw when name empty.', function () {
                assert.throws(function () {
                    new VCReader<number, number>({ 
                        name: '', 
                        validate, 
                        transform 
                    });
                });
            });
        
            it('Throw when name is whitespace only.', function () {
                assert.throws(function () {
                    new VCReader<number, number>({ 
                        name: '              ', 
                        validate, 
                        transform 
                    });
                });
            });

        });

    });

    describe('VCDualReader', function() {

        for (const spec of vcDualReaderTests) {
            it(spec.description, async function () {
                await testVCDualReader(spec);
            });
        }

        describe('# Constructor safety checks', function () {

            // We use dummy callbacks because we just want to know whether the constructor throws 
            // after checking the names. The callbacks aren't used at all in the constructor so 
            // anything will do really.
            const validate      = (t: unknown): t is number => typeof t === 'number';
            const deprValidate  = (d: unknown): d is string => typeof d === 'string';
            const transform     = (t: number) => t;
            const deprTransform = (_: string) => 10;

            it(`Throw when new configuration's name is empty.`, function () {
                assert.throws(function () {
                    new VCDualReader({ 
                        name: '', 
                        validate, 
                        transform, 
                        deprName: 'dummy',
                        deprValidate, 
                        deprTransform });
                });
            });

            it(`Throw when new configuration's name is whitespace only`, function () {
                assert.throws(function () {
                    new VCDualReader({ 
                        name: '              ', 
                        validate, 
                        transform, 
                        deprName: 'dummy',
                        deprValidate, 
                        deprTransform });
                });
            });

            it(`Throw when deprecated configuration's name is empty.`, function () {
                assert.throws(function () {
                    new VCDualReader({ 
                        name: 'dummy', 
                        validate, 
                        transform, 
                        deprName: '',
                        deprValidate, 
                        deprTransform });
                });
            });

            it(`Throw when deprecated configuration's name is whitespace only`, function () {
                assert.throws(function () {
                    new VCDualReader({ 
                        name: 'dummy', 
                        validate, 
                        transform, 
                        deprName: '                   ',
                        deprValidate, 
                        deprTransform });
                });
            });

        });
    });

    describe('Utilities', function() {
        
        it('setConfiguration', async function () {

            // Set the configuration reserved for this test to arbitrary values in all user definable
            // scopes.
            await setConfiguration(`${section}.forTestSetConfiguration`, await scope, {
                globalValue:                  2,
                workspaceValue:               3,
                workspaceFolderValue:         4,
                globalLanguageValue:          5,
                workspaceLanguageValue:       6,
                workspaceFolderLanguageValue: 7
            });
        
            // Check by reading back using the raw extension API.
            const inspect = workspace.getConfiguration(section, await scope).inspect('forTestSetConfiguration');
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

        it('clearConfiguration', async function () {

            // Set the configuration reserved for this test to arbitrary values in all user definable
            // scopes.
            await setConfiguration(`${section}.forTestSetConfiguration`, await scope, {
                globalValue:                  4,
                workspaceValue:               "hello world",
                workspaceFolderValue:         2,
                globalLanguageValue:          [],
                workspaceLanguageValue:       { hello: "world" },
                workspaceFolderLanguageValue: [ "hello", "world" ]
            });

            // Clear all the values we just set, then check by reading back using the raw extension
            // API.
            await clearConfiguration(`${section}.forTestSetConfiguration`, await scope);
            const inspect = workspace.getConfiguration(section, await scope).inspect('forTestSetConfiguration');
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

    });

    describe('Epilogue', function () {

        it('Cleanup all test configuration values', async function () {
            await clearConfiguration(goodDefaultName,     await scope);
            await clearConfiguration(badDefaultName,      await scope);
            await clearConfiguration(deprGoodDefaultName, await scope);
            await clearConfiguration(deprBadDefaultName,  await scope);
            await clearConfiguration(`${section}.forTestSetConfiguration`, await scope);
        });

    });

});

