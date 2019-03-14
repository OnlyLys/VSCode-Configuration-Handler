import * as assert from 'assert';
import { ConfigurationHandler } from '../configuration-handler';
import { ConfigurationNameEmptyError, ConfigurationBadDefaultError } from '../errors';
import { ConfigurationHandlerCompat } from '../configuration-handler-compat';
import { workspace, ConfigurationTarget } from 'vscode';

/* Note that VS Code only runs tests on files that are suffixed with `test.ts`. This explains the 
naming of this file. */

// ------------------------------------------------------------------
// CONFIGURATION HANDLER

/** Full name of the test configuration. */
const name = `@onlylys/vscode-configuration-handler.config`;

/** 
 * This represents the type of the test configuration that we use when testing the handlers. This
 * configuration was taken from `leaper.detectedPairs`. Each element within this array should only
 * have an exact length of 2.
 */
type TestConfigurationFormat = string[];

/** Type guard for `TestConfigurationFormat`. */
function typeCheck(value: any): value is TestConfigurationFormat {
    return Array.isArray(value) && value.every((elem: any) => typeof elem === 'string' && elem.length === 2);
}

/** Hanlder to our test configuration. */
const testHandler = new ConfigurationHandler({
    name,
    typeCheck
});

const expectedDefaultValue: TestConfigurationFormat = [ "()", "[]", "{}", "<>", "``", "''", "\"\"" ];

/** Global value that we set and would expect to get from `testHandler.get()` */
const testGlobalValue: TestConfigurationFormat = [ "()" ];

/** Workspace value that we set and would expect to get from `testHandler.get()` */
const testWorkspaceValue: TestConfigurationFormat = [ "[]" ];

describe('ConfigurationHandler Tests', function () {

    describe('# Set and get various combinations of values', function () {

        describe('1: default only', function() {
            setGet({
                globalValue:    undefined,
                workspaceValue: undefined
            });
        });

        describe('2: default + global', function () {
            setGet({
                globalValue:    testGlobalValue,
                workspaceValue: undefined
            });
        });
    
        describe('3: default + workspace', function () {
            setGet({
                globalValue:    undefined,
                workspaceValue: testWorkspaceValue
            });
        });
    
        describe('4: default + global + workspace', function () {
            setGet({
                globalValue:    testGlobalValue,
                workspaceValue: testWorkspaceValue
            });
        });

        /** 
         * Set to values in `args` then check the values obtained from `testHandler.get()`. The get and
         * set steps are run as MochaJS tests so the diagnostics appear in the debug console. 
         */
        function setGet(args: {
            globalValue:    TestConfigurationFormat | undefined,
            workspaceValue: TestConfigurationFormat | undefined,
        }): void {
            const { globalValue, workspaceValue } = args;
            it('Set', async function () {
                await testHandler.setGlobalValue(globalValue);
                await testHandler.setWorkspaceValue(workspaceValue);
            });
            it('Get', function () {
                assert.deepStrictEqual(testHandler.get(), {
                    defaultValue: expectedDefaultValue,
                    globalValue,
                    workspaceValue,
                    effectiveValue: (() => {
                        if (workspaceValue !== undefined) {
                            return workspaceValue;
                        } else if (globalValue !== undefined) {
                            return globalValue;
                        } else {
                            return expectedDefaultValue;
                        }
                    })()
                });
            });
        }

    }); 

    describe('# Safeguard checking', function () {

        it(`Disallow empty 'name' field in constructor`, function () {
            assert.throws(function () {
                // @ts-ignore Ignore the 'unused variable' warning
                const badInstance = new ConfigurationHandler<TestConfigurationFormat>({
                    name: '',
                    typeCheck
                });
            }, new ConfigurationNameEmptyError());
        });

        it('Throw when bad default value', function () {
            assert.throws(function () {
                const badInstance = new ConfigurationHandler<TestConfigurationFormat>({
                    name: `${name}BadDefaultValue`,
                    typeCheck
                });
                // This call should throw
                badInstance.get();
            }, new ConfigurationBadDefaultError(`${name}BadDefaultValue`));
        });

        it('Throw when bad typecheck callback', function () {
            function badTypeCheck(value: any): value is TestConfigurationFormat {
                return Array.isArray(value) 
                    && value.every((elem: any) => typeof elem === 'string' && elem.length === 1);
            }
            assert.throws(function () {
                const badInstance = new ConfigurationHandler<TestConfigurationFormat>({
                    name,
                    typeCheck: badTypeCheck
                });
                // This call should throw
                badInstance.get();
            }, new ConfigurationBadDefaultError(name));
        });

        it('Wrongly typed values filtered out by typechecking', async function () {
            const section = workspace.getConfiguration('@onlylys/vscode-configuration-handler');
            // Intentionally set the wrong type for the configuration 
            await section.update('config', [ 10 ], ConfigurationTarget.Global);
            await section.update('config', { foo: "bar" }, ConfigurationTarget.Workspace);
            const {
                defaultValue,
                globalValue,
                workspaceValue
            } = testHandler.get();
            assert.deepStrictEqual(defaultValue,   expectedDefaultValue);
            assert.deepStrictEqual(globalValue,    undefined);
            assert.deepStrictEqual(workspaceValue, undefined);
        });

    });

    describe('# Cleanup', function() {
        it('Clear user defined values', async function () {
            await testHandler.setGlobalValue(undefined);
            await testHandler.setWorkspaceValue(undefined);
        });
    });

});

// ------------------------------------------------------------------
// CONFIGURATION HANDLER COMPAT

/** Full name of the deprecated test configuration. */
const deprName = `@onlylys/vscode-configuration-handler.deprConfig`;

/** 
 * This represents the type of the deprecated configuration that we use when testing the compat handler. 
 * This configuration was taken from `leaper.additionalTriggerPairs`. Each `open` or `close` element 
 * within this array should only have an exact length of 1.
 */
type TestDeprConfigurationFormat = { open: string, close: string }[];

/** Type guard for `DeprConfigurationFormat`. */
function deprTypeCheck(value: any): value is TestDeprConfigurationFormat {
    return Array.isArray(value) && value.every((elem: any) => {
        if (typeof elem !== 'object' || Reflect.ownKeys(elem).length !== 2) {
            return false;
        }
        const { open, close } = elem;
        return typeof open  === 'string' 
            && typeof close === 'string'
            && open.length  === 1
            && close.length === 1;
    });
}

/** Callback to transform from the old format to the new one. */
function normalize(deprConfig: TestDeprConfigurationFormat): TestConfigurationFormat { 
    return deprConfig.map(({ open, close }) => `${open}${close}`);
}

/** Backwards compatible handler to our test configuration and another deprecated one. */
const testHandlerCompat = new ConfigurationHandlerCompat({
    name,
    typeCheck,
    deprName,
    deprTypeCheck,
    normalize
});

const expectedDeprDefaultValue: TestDeprConfigurationFormat = [
    { open: "(",  close: ")" }, 
    { open: "[",  close: "]" }, 
    { open: "{",  close: "}" }, 
    { open: "<",  close: ">" }, 
    { open: "`",  close: "`" }, 
    { open: "'",  close: "'" }, 
    { open: "\"", close: "\"" }
];

/** Deprecated global value that we set and would expect to get from `testHandlerCompat.get()` */
const testDeprGlobalValue: TestDeprConfigurationFormat = [
    { open: "{", close: "}" }
];

/** Deprecated workspace value that we set and would expect to get from `testHandlerCompat.get()` */
const testDeprWorkspaceValue: TestDeprConfigurationFormat = [ 
    { open: "<", close: ">" }
];

describe('ConfigurationHandlerCompat Tests', function () {

    describe('# Set and get various combinations of values', function () {

        describe('1: default only', function() {
            setGet({
                globalValue:        undefined,
                workspaceValue:     undefined,
                deprGlobalValue:    undefined,
                deprWorkspaceValue: undefined
            });
        });

        describe('2: default + global', function () {
            setGet({
                globalValue:        testGlobalValue,
                workspaceValue:     undefined,
                deprGlobalValue:    undefined,
                deprWorkspaceValue: undefined
            });
        });

        describe('3: default + workspace', function () {
            setGet({
                globalValue:        undefined,
                workspaceValue:     testWorkspaceValue,
                deprGlobalValue:    undefined,
                deprWorkspaceValue: undefined
            });
        });

        describe('4: default + deprecated global', function () {
            setGet({
                globalValue:        undefined,
                workspaceValue:     undefined,
                deprGlobalValue:    testDeprGlobalValue,
                deprWorkspaceValue: undefined
            });
        });

        describe('5: default + deprecated workspace', function () {
            setGet({
                globalValue:        undefined,
                workspaceValue:     undefined,
                deprGlobalValue:    undefined,
                deprWorkspaceValue: testDeprWorkspaceValue
            });
        });

        describe('6: default + global + workspace', function () {
            setGet({
                globalValue:        testGlobalValue,
                workspaceValue:     testWorkspaceValue,
                deprGlobalValue:    undefined,
                deprWorkspaceValue: undefined
            });
        });

        describe('7: default + global + deprecated global', function () {
            setGet({
                globalValue:        testGlobalValue,
                workspaceValue:     undefined,
                deprGlobalValue:    testDeprGlobalValue,
                deprWorkspaceValue: undefined
            });
        });

        describe('8: default + global + deprecated workspace', function () {
            setGet({
                globalValue:        testGlobalValue,
                workspaceValue:     undefined,
                deprGlobalValue:    undefined,
                deprWorkspaceValue: testDeprWorkspaceValue
            });
        });

        describe('9: default + workspace + deprecated global', function () {
            setGet({
                globalValue:        undefined,
                workspaceValue:     testWorkspaceValue,
                deprGlobalValue:    testDeprGlobalValue,
                deprWorkspaceValue: undefined
            });
        });

        describe('10: default + workspace + deprecated workspace', function () {
            setGet({
                globalValue:        undefined,
                workspaceValue:     testWorkspaceValue,
                deprGlobalValue:    undefined,
                deprWorkspaceValue: testDeprWorkspaceValue
            });
        });

        describe('11: default + deprecated global + deprecated workspace', function () {
            setGet({
                globalValue:        undefined,
                workspaceValue:     undefined,
                deprGlobalValue:    testDeprGlobalValue,
                deprWorkspaceValue: testDeprWorkspaceValue
            });
        });

        describe('12: default + global + workspace + deprecated global', function () {
            setGet({
                globalValue:        testGlobalValue,
                workspaceValue:     testWorkspaceValue,
                deprGlobalValue:    testDeprGlobalValue,
                deprWorkspaceValue: undefined
            });
        });

        describe('13: default + global + workspace + deprecated workspace', function () {
            setGet({
                globalValue:        testGlobalValue,
                workspaceValue:     testWorkspaceValue,
                deprGlobalValue:    undefined,
                deprWorkspaceValue: testDeprWorkspaceValue
            });
        });

        describe('14: default + global + deprecated global + deprecated workspace', function () {
            setGet({
                globalValue:        testGlobalValue,
                workspaceValue:     undefined,
                deprGlobalValue:    testDeprGlobalValue,
                deprWorkspaceValue: testDeprWorkspaceValue
            });
        });

        describe('15: default + workspace + deprecated global + deprecated workspace', function () {
            setGet({
                globalValue:        undefined,
                workspaceValue:     testWorkspaceValue,
                deprGlobalValue:    testDeprGlobalValue,
                deprWorkspaceValue: testDeprWorkspaceValue
            });
        });

        describe('16: default + global + workspace + deprecated global + deprecated workspace', function () {
            setGet({
                globalValue:        testGlobalValue,
                workspaceValue:     testWorkspaceValue,
                deprGlobalValue:    testDeprGlobalValue,
                deprWorkspaceValue: testDeprWorkspaceValue
            });
        });

        describe('Cleanup', function() {
            setGet({
                globalValue:        undefined,
                workspaceValue:     undefined,
                deprGlobalValue:    undefined,
                deprWorkspaceValue: undefined
            });
        });

        /** Set to values in `args` then check the values obtained from `testHandlerCompat.get()`. */
        function setGet(args: {
            globalValue:        TestConfigurationFormat | undefined,
            workspaceValue:     TestConfigurationFormat | undefined,
            deprGlobalValue:    TestDeprConfigurationFormat | undefined,
            deprWorkspaceValue: TestDeprConfigurationFormat | undefined
        }): void {
            const { globalValue, workspaceValue, deprGlobalValue, deprWorkspaceValue } = args;
            it('Set', async function () {
                await testHandlerCompat.setGlobalValue(globalValue);
                await testHandlerCompat.setWorkspaceValue(workspaceValue);
                await testHandlerCompat.setDeprGlobalValue(deprGlobalValue);
                await testHandlerCompat.setDeprWorkspaceValue(deprWorkspaceValue);
            });
            it('Get', function () {
                assert.deepStrictEqual(testHandlerCompat.get(), {
                    defaultValue: expectedDefaultValue,
                    globalValue,
                    workspaceValue,
                    deprDefaultValue: expectedDeprDefaultValue,
                    deprGlobalValue,
                    deprWorkspaceValue,
                    effectiveValue: (() => {
                        if (workspaceValue !== undefined) {
                            return workspaceValue;
                        } else if (deprWorkspaceValue !== undefined) {
                            return normalize(deprWorkspaceValue);
                        } else if (globalValue !== undefined) {
                            return globalValue;
                        } else if (deprGlobalValue !== undefined) {
                            return normalize(deprGlobalValue);
                        } else {
                            return expectedDefaultValue;
                        }
                    })()
                });
            });
        }

    });

    describe('# Safeguard checking', function () {

        it(`Disallow empty 'name' field in constructor`, function () {
            assert.throws(function () {
                // @ts-ignore Ignore the 'unused variable' warning
                const badInstance = new ConfigurationHandlerCompat({
                    name: '',
                    typeCheck,
                    deprName,
                    deprTypeCheck,
                    normalize
                });
            }, new ConfigurationNameEmptyError());
        });


        it(`Disallow empty 'deprName' field in constructor`, function () {
            assert.throws(function () {
                // @ts-ignore Ignore the 'unused variable' warning
                const badInstance = new ConfigurationHandlerCompat({
                    name,
                    typeCheck,
                    deprName: '',
                    deprTypeCheck,
                    normalize
                });
            }, new ConfigurationNameEmptyError());
        });

        it('Throw when bad default value for new config', function () {
            assert.throws(function () {
                const badInstance = new ConfigurationHandlerCompat({
                    name: `${name}BadDefaultValue`,
                    typeCheck,
                    deprName,
                    deprTypeCheck,
                    normalize
                });
                // This call should throw
                badInstance.get();
            }, new ConfigurationBadDefaultError(`${name}BadDefaultValue`));
        });

        /* We do not require the deprecated configuation to have a valid default value since we do
        not rely on it as a fallback value for the effective value. */
        it('Do not throw when bad default value for deprecated config', function () {
            assert.doesNotThrow(function () {
                const instance = new ConfigurationHandlerCompat({
                    name,
                    typeCheck,
                    deprName: `${deprName}BadDefaultValue`,
                    deprTypeCheck,
                    normalize
                });
                // This call should not throw
                instance.get();
            });
        });

        it('Throw when bad typecheck callback for new config', function () {
            function badTypeCheck(value: any): value is TestConfigurationFormat {
                return Array.isArray(value) 
                    && value.every((elem: any) => typeof elem === 'string' && elem.length === 1);
            }
            assert.throws(function () {
                const badInstance = new ConfigurationHandlerCompat({
                    name,
                    typeCheck: badTypeCheck,
                    deprName,
                    deprTypeCheck,
                    normalize
                });
                // This call should throw
                badInstance.get();
            }, new ConfigurationBadDefaultError(name));
        });

        it('Wrongly typed values filtered out by typechecking', async function () {
            const section = workspace.getConfiguration('@onlylys/vscode-configuration-handler');
            // Intentionally set the wrong type for the new configuration 
            await section.update('config', [ 10 ], ConfigurationTarget.Global);
            await section.update('config', { foo: "bar" }, ConfigurationTarget.Workspace);
            // Intentionally set the wrong type for the deprecated configuration
            await section.update('deprConfig', { open: 2, close: 4 }, ConfigurationTarget.Global);
            await section.update('deprConfig', null, ConfigurationTarget.Workspace);
            const {
                defaultValue,
                globalValue,
                workspaceValue,
                deprDefaultValue,
                deprGlobalValue,
                deprWorkspaceValue,
                effectiveValue
            } = testHandlerCompat.get();
            assert.deepStrictEqual(defaultValue,       expectedDefaultValue);
            assert.deepStrictEqual(globalValue,        undefined);
            assert.deepStrictEqual(workspaceValue,     undefined);
            assert.deepStrictEqual(deprDefaultValue,   expectedDeprDefaultValue);
            assert.deepStrictEqual(deprGlobalValue,    undefined);
            assert.deepStrictEqual(deprWorkspaceValue, undefined);
            assert.deepStrictEqual(effectiveValue,     expectedDefaultValue);
        });

    });

    describe('# Migration', function () {

        it('Correctly report the presence of user defined deprecated values', async function() {
            // Should be `false` when there are no user defined values
            await testHandlerCompat.setDeprGlobalValue(undefined);
            await testHandlerCompat.setDeprWorkspaceValue(undefined);
            assert.ok(!testHandlerCompat.hasUserDefinedDeprValues());
            // Should be `true` when there is only deprecated global value
            await testHandlerCompat.setDeprGlobalValue(testDeprGlobalValue);
            await testHandlerCompat.setDeprWorkspaceValue(undefined);
            assert.ok(testHandlerCompat.hasUserDefinedDeprValues());
            // Should be `true` when there is only deprecated workspace value
            await testHandlerCompat.setDeprGlobalValue(undefined);
            await testHandlerCompat.setDeprWorkspaceValue(testDeprWorkspaceValue);
            assert.ok(testHandlerCompat.hasUserDefinedDeprValues());
            // Should be `true` when there are both deprecated global and deprecated workspace values
            await testHandlerCompat.setDeprGlobalValue(testDeprGlobalValue);
            await testHandlerCompat.setDeprWorkspaceValue(testDeprWorkspaceValue);
            assert.ok(testHandlerCompat.hasUserDefinedDeprValues());
        });

        it('Successfully migrate values', async function () {
            await testHandlerCompat.setGlobalValue(undefined);
            await testHandlerCompat.setWorkspaceValue(undefined);
            await testHandlerCompat.setDeprGlobalValue(testDeprGlobalValue);
            await testHandlerCompat.setDeprWorkspaceValue(testDeprWorkspaceValue);
            await testHandlerCompat.migrate();
            assert.deepStrictEqual(testHandlerCompat.get(), {
                defaultValue:       expectedDefaultValue,
                globalValue:        normalize(testDeprGlobalValue),
                workspaceValue:     normalize(testDeprWorkspaceValue),
                deprDefaultValue:   expectedDeprDefaultValue,
                deprGlobalValue:    undefined,
                deprWorkspaceValue: undefined,
                effectiveValue:     normalize(testDeprWorkspaceValue)
            });
        });

    });

    describe('# Cleanup', function() {
        it('Clear user defined values', async function () {
            await testHandlerCompat.setGlobalValue(undefined);
            await testHandlerCompat.setWorkspaceValue(undefined);
            await testHandlerCompat.setDeprGlobalValue(undefined);
            await testHandlerCompat.setDeprWorkspaceValue(undefined);
        });
    });

});
