import * as assert from 'assert';
import { ConfigurationTarget, ConfigurationScope, workspace } from 'vscode';
import { splitName, ValuesPartial, VCReader, VCReaderParams } from '../../vc-reader';
import { DualValuesPartial, VCDualReader, VCDualReaderParams } from '../../vc-dual-reader';

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
interface Expected<T, E> extends ValuesPartial<T> {
    
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
interface DualExpected<T, D, E> extends DualValuesPartial<T, D> {
    
    /**
     * We always expect `defaultLanguageValue` to be `undefined` for the configurations we are about 
     * to read, because there is no way for a third party extensions (such as this one) to specify 
     * language specific defaults for its own configurations. 
     */
    defaultLanguageValue: undefined;

    /**
     * We always expect `deprDefaultLanguageValue` to be `undefined` for the configurations we are 
     * about to read, because there is no way for a third party extensions (such as this one) to 
     * specify language specific defaults for its own configurations. 
     */
    deprDefaultLanguageValue: undefined;

    effectiveValue: E | undefined;
}

function assertValuesPartial<T>(actual: ValuesPartial<T>, expected: ValuesPartial<T>) {
    assert.deepStrictEqual(actual.defaultValue,                 expected.defaultValue);
    assert.deepStrictEqual(actual.globalValue,                  expected.globalValue);
    assert.deepStrictEqual(actual.workspaceValue,               expected.workspaceValue);
    assert.deepStrictEqual(actual.workspaceFolderValue,         expected.workspaceFolderValue);
    assert.deepStrictEqual(actual.defaultLanguageValue,         expected.defaultLanguageValue);
    assert.deepStrictEqual(actual.globalLanguageValue,          expected.globalLanguageValue);
    assert.deepStrictEqual(actual.workspaceLanguageValue,       expected.workspaceLanguageValue);
    assert.deepStrictEqual(actual.workspaceFolderLanguageValue, expected.workspaceFolderLanguageValue);
}

function assertDualValuesPartial<T, D>(actual: DualValuesPartial<T, D>, expected: DualValuesPartial<T, D>) {
    assertValuesPartial(actual, expected);
    assert.deepStrictEqual(actual.deprDefaultValue,                 expected.deprDefaultValue);
    assert.deepStrictEqual(actual.deprGlobalValue,                  expected.deprGlobalValue);
    assert.deepStrictEqual(actual.deprWorkspaceValue,               expected.deprWorkspaceValue);
    assert.deepStrictEqual(actual.deprWorkspaceFolderValue,         expected.deprWorkspaceFolderValue);
    assert.deepStrictEqual(actual.deprDefaultLanguageValue,         expected.deprDefaultLanguageValue);
    assert.deepStrictEqual(actual.deprGlobalLanguageValue,          expected.deprGlobalLanguageValue);
    assert.deepStrictEqual(actual.deprWorkspaceLanguageValue,       expected.deprWorkspaceLanguageValue);
    assert.deepStrictEqual(actual.deprWorkspaceFolderLanguageValue, expected.deprWorkspaceFolderLanguageValue);
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
 * Initialize a `VCReader`, set the configuration values in the `preconfigure` argument, then check 
 * that the `VCReader` we created yields the expected values.
 */ 
export async function testVCReader<T, E>(spec: VCReaderTestSpec<T, E>): Promise<void> {
    const scope  = await spec.scope;
    const reader = new VCReader(spec);
    await setConfiguration(spec.name, scope, spec.preconfigure);
    if (spec.expected.effectiveValue === undefined) {

        // If we expect that an effective value can't be found, then we expect this call to throw.
        assert.throws(function () { reader.read(scope); });

        // We check the rest of the values using the internal function.
        assertValuesPartial(reader._read(scope), spec.expected);
    } else {
        const actual = reader.read(scope);
        assertValuesPartial(actual, spec.expected);
        assert.deepStrictEqual(actual.effectiveValue, spec.expected.effectiveValue);
    }
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
 * Initialize a `VCDualReader`, set the configuration values in the `preconfigure` argument, then 
 * check that the `VCDualReader` we created yields the expected values.
 * 
 * The `VCDualReader` is initialized with the `args` argument.
 */ 
export async function testVCDualReader<T, D, E>(spec: VCDualReaderTestSpec<T, D, E>): Promise<void> {
    const reader = new VCDualReader(spec);
    const scope  = await spec.scope;
    await setConfiguration(spec.name,     scope, spec.preconfigure);
    await setConfiguration(spec.deprName, scope, {
        globalValue:                    spec.preconfigure.deprGlobalValue,
        workspaceValue:                 spec.preconfigure.deprWorkspaceValue,
        workspaceFolderValue:           spec.preconfigure.deprWorkspaceFolderValue,
        globalLanguageValue:            spec.preconfigure.deprGlobalLanguageValue,
        workspaceLanguageValue:         spec.preconfigure.deprWorkspaceLanguageValue,
        workspaceFolderLanguageValue:   spec.preconfigure.deprWorkspaceFolderLanguageValue,
    });

    if (spec.expected.effectiveValue === undefined) {
        
        // If we expect that an effective value can't be found, then we expect this call to throw.
        assert.throws(function () { reader.read(scope); });

        // We check the rest of the values using the internal function.
        assertDualValuesPartial(reader._read(scope), spec.expected);
    } else {
        const actual = reader.read(scope);
        assertDualValuesPartial(actual, spec.expected);
        assert.deepStrictEqual(actual.effectiveValue, spec.expected.effectiveValue);
    }
}

export async function setConfiguration(
    name: string,
    scope: ConfigurationScope,
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
