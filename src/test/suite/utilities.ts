import * as assert from 'assert';
import { ConfigurationTarget, ConfigurationScope, workspace } from 'vscode';
import { splitName, VCReader, VCReaderParams } from '../../vc-reader';
import { VCDualReader, VCDualReaderParams } from '../../vc-dual-reader';
import { Inspect } from '../../inspect';

/**
 * Scopes which can be configured by the user.
 */
interface UserConfigurable {
    globalValue:                  unknown;
    workspaceValue:               unknown;
    workspaceFolderValue:         unknown;
    globalLanguageValue:          unknown;
    workspaceLanguageValue:       unknown;
    workspaceFolderLanguageValue: unknown;
}

interface DualUserPreconfigurable extends UserConfigurable {
    deprGlobalValue:                  unknown;
    deprWorkspaceValue:               unknown;
    deprWorkspaceFolderValue:         unknown;
    deprGlobalLanguageValue:          unknown;
    deprWorkspaceLanguageValue:       unknown;
    deprWorkspaceFolderLanguageValue: unknown;
}

/**
 * Values that we expect a `VCReader` to yield.
 */
interface Expected<T, E> extends Inspect<T> {
    
    /**
     * We always expect `defaultLanguageValue` to be `undefined` for the configurations we are 
     * about to read, because there is no way for a third party extensions (such as this one) to 
     * specify language specific defaults for its own configurations. 
     */
    defaultLanguageValue: undefined;

    effectiveValue: E | undefined;
}

/**
 * Values that we expect a `DualVCReader` to yield.
 */
interface DualExpected<T, D, E> extends Expected<T, E> {

    /**
     * The validated default value of the deprecated configuration.
     */
    deprDefaultValue: D | undefined;

    /** 
     * The validated global value of the deprecated configuration.
     */
    deprGlobalValue: D | undefined;

    /**
     * The validated workspace value of the deprecated configuration.
     */
    deprWorkspaceValue: D | undefined;

    /**
     * We always expect `deprDefaultLanguageValue` to be `undefined` for the configurations we are 
     * about to read, because there is no way for a third party extensions (such as this one) to 
     * specify language specific defaults for its own configurations. 
     */
    deprDefaultLanguageValue: undefined;

    /**
     * The validated workspace folder value of the deprecated configuration.
     */
    deprWorkspaceFolderValue: D | undefined;
    
    /**
     * The validated language specific global value of the deprecated configuration.
     */
    deprGlobalLanguageValue: D | undefined;

    /**
     * The validated language specific workspace value of the deprecated configuration.
     */
    deprWorkspaceLanguageValue: D | undefined;

    /**
     * The validated language specific workspace folder value of the deprecated configuration.
     */
    deprWorkspaceFolderLanguageValue: D | undefined;

}

/**
 * Specifies a test for the `testVCReader` function.
 */
export interface VCReaderTestSpec<T, E> extends VCReaderParams<T, E>{

    /**
     * Description of the test that is printed into the terminal.
     */
    description: string;

    /** 
     * In which scope we conduct the tests in.
     */
    scope: Thenable<ConfigurationScope>;

    /**
     * Set the following values before executing the test.
     */
    preconfigure: UserConfigurable;

    /**
     * Values that we expect the reader to yield.
     */
    expected: Expected<T, E>;

}

/**
 * Specifies a test for the `testVCDualReader` function.
 */
 export interface VCDualReaderTestSpec<T, D, E> extends VCReaderTestSpec<T, E>, VCDualReaderParams<T, D, E> {

    /**
     * Set the following values for the deprecated configuration before executing the test.
     */
    preconfigure: DualUserPreconfigurable;

    /**
     * Values that we expect the reader to yield for the deprecated configuration.
     */
    expected: DualExpected<T, D, E>;

}

/**
 * Initialize a `VCReader`, set the configuration values in the `preconfigure` argument, then check 
 * that the `VCReader` we created yields the expected values.
 */ 
export async function testVCReader<T, E>(spec: VCReaderTestSpec<T, E>): Promise<void> {
    const { name, preconfigure, expected } = spec;
    const scope = await spec.scope;

    await setConfiguration(name, scope, preconfigure);
    
    const reader  = new VCReader(spec);
    const inspect = reader.inspect(scope);
    assert.deepStrictEqual(inspect.defaultValue,                 expected.defaultValue);
    assert.deepStrictEqual(inspect.globalValue,                  expected.globalValue);
    assert.deepStrictEqual(inspect.workspaceValue,               expected.workspaceValue);
    assert.deepStrictEqual(inspect.workspaceFolderValue,         expected.workspaceFolderValue);
    assert.deepStrictEqual(inspect.defaultLanguageValue,         expected.defaultLanguageValue);
    assert.deepStrictEqual(inspect.globalLanguageValue,          expected.globalLanguageValue);
    assert.deepStrictEqual(inspect.workspaceLanguageValue,       expected.workspaceLanguageValue);
    assert.deepStrictEqual(inspect.workspaceFolderLanguageValue, expected.workspaceFolderLanguageValue);
    if (expected.effectiveValue === undefined) {
        assert.throws(function () { reader.read(scope); });
    } else {
        assert.deepStrictEqual(reader.read(scope), expected.effectiveValue);
    }
}

/**
 * Initialize a `VCDualReader`, set the configuration values in the `preconfigure` argument, then 
 * check that the `VCDualReader` we created yields the expected values.
 * 
 * The `VCDualReader` is initialized with the `args` argument.
 */ 
export async function testVCDualReader<T, D, E>(spec: VCDualReaderTestSpec<T, D, E>): Promise<void> {
    const { name, deprName, preconfigure, expected } = spec;
    const scope = await spec.scope;
    
    await setConfiguration(name,     scope, preconfigure);
    await setConfiguration(deprName, scope, {
        globalValue:                    preconfigure.deprGlobalValue,
        workspaceValue:                 preconfigure.deprWorkspaceValue,
        workspaceFolderValue:           preconfigure.deprWorkspaceFolderValue,
        globalLanguageValue:            preconfigure.deprGlobalLanguageValue,
        workspaceLanguageValue:         preconfigure.deprWorkspaceLanguageValue,
        workspaceFolderLanguageValue:   preconfigure.deprWorkspaceFolderLanguageValue,
    });

    const reader      = new VCDualReader(spec);
    const newInspect  = reader.inspect(scope);
    const deprInspect = reader.deprInspect(scope);
    assert.deepStrictEqual(newInspect.defaultValue,                 expected.defaultValue);
    assert.deepStrictEqual(newInspect.globalValue,                  expected.globalValue);
    assert.deepStrictEqual(newInspect.workspaceValue,               expected.workspaceValue);
    assert.deepStrictEqual(newInspect.workspaceFolderValue,         expected.workspaceFolderValue);
    assert.deepStrictEqual(newInspect.defaultLanguageValue,         expected.defaultLanguageValue);
    assert.deepStrictEqual(newInspect.globalLanguageValue,          expected.globalLanguageValue);
    assert.deepStrictEqual(newInspect.workspaceLanguageValue,       expected.workspaceLanguageValue);
    assert.deepStrictEqual(newInspect.workspaceFolderLanguageValue, expected.workspaceFolderLanguageValue);
    assert.deepStrictEqual(deprInspect.defaultValue,                 expected.deprDefaultValue);
    assert.deepStrictEqual(deprInspect.globalValue,                  expected.deprGlobalValue);
    assert.deepStrictEqual(deprInspect.workspaceValue,               expected.deprWorkspaceValue);
    assert.deepStrictEqual(deprInspect.workspaceFolderValue,         expected.deprWorkspaceFolderValue);
    assert.deepStrictEqual(deprInspect.defaultLanguageValue,         expected.deprDefaultLanguageValue);
    assert.deepStrictEqual(deprInspect.globalLanguageValue,          expected.deprGlobalLanguageValue);
    assert.deepStrictEqual(deprInspect.workspaceLanguageValue,       expected.deprWorkspaceLanguageValue);
    assert.deepStrictEqual(deprInspect.workspaceFolderLanguageValue, expected.deprWorkspaceFolderLanguageValue);
    if (expected.effectiveValue === undefined) {
        assert.throws(function () { reader.read(scope); });
    } else {
        assert.deepStrictEqual(reader.read(scope), expected.effectiveValue);
    }
}

export async function setConfiguration(
    name:   string,
    scope:  ConfigurationScope,
    values: UserConfigurable
): Promise<void>  {
    const { section, child } = splitName(name);
    const c = workspace.getConfiguration(section, scope);
    await c.update(child, values.globalValue,                  ConfigurationTarget.Global,          false);
    await c.update(child, values.workspaceValue,               ConfigurationTarget.Workspace,       false);
    await c.update(child, values.workspaceFolderValue,         ConfigurationTarget.WorkspaceFolder, false);
    await c.update(child, values.globalLanguageValue,          ConfigurationTarget.Global,          true);
    await c.update(child, values.workspaceLanguageValue,       ConfigurationTarget.Workspace,       true);
    await c.update(child, values.workspaceFolderLanguageValue, ConfigurationTarget.WorkspaceFolder, true);
}

export async function clearConfiguration(
    name: string, 
    scope: ConfigurationScope
): Promise<void> {
    return setConfiguration(name, scope, {
        globalValue:                  undefined,
        workspaceValue:               undefined,
        workspaceFolderValue:         undefined,
        globalLanguageValue:          undefined,
        workspaceLanguageValue:       undefined,
        workspaceFolderLanguageValue: undefined
    });
}
