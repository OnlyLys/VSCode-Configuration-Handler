import * as assert from 'assert';
import { ConfigurationHandler } from "../configuration-handler";
import { ConfigurationHandlerCompat } from "../configuration-handler-compat";
import { Values, ValuesCompat } from '../values';
import { workspace, window, Uri } from 'vscode';

/* Note that VS Code only runs tests on files that are suff with `test.ts`. This explains the naming 
of this file. */

// TODO: Tests
// 1. Create many test cases
// 2. Test that empty name throws
// 3. Test that unrecognized name throws

// ------------------------------------------------------------------
// CONFIGURATION HANDLER

/** Full name of the test configuration. */
const name = '@onlylys/vscode-configuration-handler.config';

/** This represents the type of the test configuration that we use when testing the handlers. */
type ConfigurationFormat = string[];

/** Type guard for `ConfigurationFormat`. */
function typeCheck(value: any): value is ConfigurationFormat {
    return Array.isArray(value) && value.every((elem: any) => typeof elem === 'string');
}

/** Standard handler to our test configuration. */
const testHandler = new ConfigurationHandler<ConfigurationFormat>({
    name,
    typeCheck
});

/** Compare the values of `expected` to that of `testHandler.get()` */
function assertValues<T>(actual: Values<T>, expected: Values<T>): void {
    assert.deepStrictEqual(actual, expected);
}

/** Default value that we would expect to get.  */
const expectedDefaultValue = [ "()", "[]", "{}", "<>", "``", "''", "\"\"" ];

/** Global value that we set and would expect to get from `testHandler.get()` */
const testGlobalValue = [ "()" ];

/** Workspace value that we set and would expect to get from `testHandler.get()` */
const testWorkspaceValue = [ "[]" ];

/** Workspace folder value that we set and would expect to get from `testHandler.get()` */
const testWorkspaceFolderValue = [ "{}" ];

describe('ConfigurationHandler', function () {

    // Open the text file `text.md` within the first workspace
    before('Open test workspace 1', async function () {
        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders) {
            const textFilePath = workspaceFolders[0].uri.path + '/text.md';
            await window.showTextDocument(Uri.file((textFilePath)));
        } else {
            throw new Error('Unable to open test workspace!');
        }
    });

    describe('# Get and set various combinations of values', function () {

        describe('1: default only', function () {
            it('get', function () {
                assertValues(testHandler.get(), {
                    defaultValue:         expectedDefaultValue,
                    globalValue:          undefined,
                    workspaceValue:       undefined,
                    workspaceFolderValue: undefined,
                    effectiveValue:       expectedDefaultValue
                });
            });
        });

        describe('2: default + global', function () {
            it('set', async function () {
                await testHandler.setGlobalValue(testGlobalValue);
                await testHandler.setWorkspaceValue(undefined);
                await testHandler.setWorkspaceFolderValue(undefined);
            });
            it('get', function () {
                assertValues(testHandler.get(), {
                    defaultValue:         expectedDefaultValue,
                    globalValue:          testGlobalValue,
                    workspaceValue:       undefined,
                    workspaceFolderValue: undefined,
                    effectiveValue:       testGlobalValue
                });
            });
        });
    
        describe('3: default + workspace', function () {
            it('set', async function () {
                await testHandler.setGlobalValue(undefined);
                await testHandler.setWorkspaceValue(testWorkspaceValue);
                await testHandler.setWorkspaceFolderValue(undefined);
            });
            it('get', function () {
                assertValues(testHandler.get(), {
                    defaultValue:         expectedDefaultValue,
                    globalValue:          undefined,
                    workspaceValue:       testWorkspaceValue,
                    workspaceFolderValue: undefined,
                    effectiveValue:       testWorkspaceValue
                });
            });
        });
    
        describe('4: default + workspace folder', function () {
            it('set', async function () {
                await testHandler.setGlobalValue(undefined);
                await testHandler.setWorkspaceValue(undefined);
                await testHandler.setWorkspaceFolderValue(testWorkspaceFolderValue);
            });
            it('get', function () {
                assertValues(testHandler.get(), {
                    defaultValue:         expectedDefaultValue,
                    globalValue:          undefined,
                    workspaceValue:       undefined,
                    workspaceFolderValue: testWorkspaceFolderValue,
                    effectiveValue:       testWorkspaceFolderValue
                });
            });
        });

        describe('5: default + global + workspace', function () {
            it('set', async function () {
                await testHandler.setGlobalValue(testGlobalValue);
                await testHandler.setWorkspaceValue(testWorkspaceValue);
                await testHandler.setWorkspaceFolderValue(undefined);
            });
            it('get', function () {
                assertValues(testHandler.get(), {
                    defaultValue:         expectedDefaultValue,
                    globalValue:          testGlobalValue,
                    workspaceValue:       testWorkspaceValue,
                    workspaceFolderValue: undefined,
                    effectiveValue:       testWorkspaceValue
                });
            });
        });
    
        describe('6: default + global + workspace folder', function () {
            it('set', async function () {
                await testHandler.setGlobalValue(testGlobalValue);
                await testHandler.setWorkspaceValue(undefined);
                await testHandler.setWorkspaceFolderValue(testWorkspaceFolderValue);
            });
            it('get', function () {
                assertValues(testHandler.get(), {
                    defaultValue:         expectedDefaultValue,
                    globalValue:          testGlobalValue,
                    workspaceValue:       undefined,
                    workspaceFolderValue: testWorkspaceFolderValue,
                    effectiveValue:       testWorkspaceFolderValue
                });
            });
        });
    
        describe('7: default + workspace + workspace folder', function () {
            it('set', async function () {
                await testHandler.setGlobalValue(undefined);
                await testHandler.setWorkspaceValue(testWorkspaceValue);
                await testHandler.setWorkspaceFolderValue(testWorkspaceFolderValue);
            });
            it('get', function () {
                assertValues(testHandler.get(), {
                    defaultValue:         expectedDefaultValue,
                    globalValue:          undefined,
                    workspaceValue:       testWorkspaceValue,
                    workspaceFolderValue: testWorkspaceFolderValue,
                    effectiveValue:       testWorkspaceFolderValue
                });
            });
        });
    
        describe('8: default + global + workspace + workspace folder', function () {
            it('set', async function () {
                await testHandler.setGlobalValue(testGlobalValue);
                await testHandler.setWorkspaceValue(undefined);
                await testHandler.setWorkspaceFolderValue(undefined);
            });
            it('get', function () {
                assertValues(testHandler.get(), {
                    defaultValue:         expectedDefaultValue,
                    globalValue:          testGlobalValue,
                    workspaceValue:       testWorkspaceValue,
                    workspaceFolderValue: testWorkspaceFolderValue,
                    effectiveValue:       testWorkspaceFolderValue
                });
            });
        });

    }); 

    describe('Switch between two workspaces that have different values', function () {

        //TODO: Set `workspace-2`
        // TODO: Get `workspace-2`
        // TODO: Set `workspace-3`
        // TODO: Get `workspace-3`
        // TODO: Switch and realise things change

    });

    describe('Restore to initial default state', function() {
        it('set', async function () {
            await testHandler.setGlobalValue(undefined);
            await testHandler.setWorkspaceValue(undefined);
            await testHandler.setWorkspaceFolderValue(undefined);
        });
        it('get', function () {
            assertValues(testHandler.get(), {
                defaultValue:         expectedDefaultValue,
                globalValue:          undefined,
                workspaceValue:       undefined,
                workspaceFolderValue: undefined,
                effectiveValue:       expectedDefaultValue
            });
        });
    });

});



// ------------------------------------------------------------------
// CONFIGURATION HANDLER COMPAT

/** Full name of the deprecated test configuration. */
const deprName = '@onlylys/vscode-configuration-handler.deprConfig';

/** This represents the type of the deprecated configuration that we use when testing the compat handler. */
type DeprConfigurationFormat = { open: string, close: string }[];

/** Type guard for `DeprConfigurationFormat`. */
function deprTypeCheck(value: any): value is DeprConfigurationFormat {
    return Array.isArray(value) && value.every((elem: any) => {
        if (typeof elem !== 'object') {
            return false;
        }
        const keys = Reflect.ownKeys(elem);
        const [ key1, key2 ] = keys;
        return keys.length === 2
            && typeof key1 === 'string'
            && typeof key2 === 'string'
            && ((key1 === 'open' && key2 === 'close') || (key1 === 'close' && key2 === 'open'));
    });
}

/** Callback to transform from the old format to the new one. */
function normalize(deprConfig: DeprConfigurationFormat): ConfigurationFormat { 
    return deprConfig.map(({ open, close }) => `${open}${close}`);
}

function assertValuesCompat<T, D>(actual: ValuesCompat<T, D>, expected: ValuesCompat<T, D>): void {
    assert.deepStrictEqual(actual, expected);
}

/** Backwards compatible handler to our test configuration and another deprecated one. */
const testHandlerCompat = new ConfigurationHandlerCompat<ConfigurationFormat, DeprConfigurationFormat>({
    name,
    typeCheck,
    deprName,
    deprTypeCheck,
    normalize
});


/** 
 * Generate binary representation of numbers from `start` to `end`, where `end` is NOT inclusive. 
 * Due to limitations in JS itself, behavior is undefined if either `start` or `end` is beyond the 
 * range of 32-bit signed numbers. The leading `0`s in the output is omitted.
 * 
 * Floats will be rounded down.
 * 
 * */
// function* genBinary(start: number, end: number): string {
//     if ()



// }

describe('ConfigurationHandlerCompat Tests', function () {

    it('Read initial default state', function () {
        /* Note that after normalization of values in `ConfigurationHandlerCompat`, the default
        value of the deprecated configuration is expected to have this value. */
        const expectedDefaultValue = [ "()", "[]", "{}", "<>", "``", "''", "\"\"" ];
        const expectedDeprDefaultValue = [
            { open: "(",  close: ")" }, 
            { open: "[",  close: "]" }, 
            { open: "{",  close: "}" }, 
            { open: "<",  close: ">" }, 
            { open: "`",  close: "`" }, 
            { open: "'",  close: "'" }, 
            { open: "\"", close: "\"" }
        ];
        assertValuesCompat({
            defaultValue:             expectedDefaultValue,
            globalValue:              undefined,
            workspaceValue:           undefined,
            workspaceFolderValue:     undefined,
            deprDefaultValue:         expectedDeprDefaultValue,
            deprGlobalValue:          undefined,
            deprWorkspaceValue:       undefined,
            deprWorkspaceFolderValue: undefined,
            effectiveValue:           expectedDefaultValue
        }, testHandlerCompat.get());
    });
    

});




