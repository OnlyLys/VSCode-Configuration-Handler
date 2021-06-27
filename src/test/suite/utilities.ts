import * as assert from 'assert';
import { ConfigurationTarget, ConfigurationScope, workspace } from 'vscode';
import { splitName, VCReader } from '../../vc-reader';
import { Values, DualValues } from '../../values';
import { VCDualReader } from '../../vc-dual-reader';

/** We can input values which are intentionally invalid by tagging `valid` with `false`. */
type Input<T> = { valid: true;  value: T } | { valid: false; value: unknown };

interface UserDefinable<T> {
    global:                   Input<T>;
    workspace:                Input<T>;
    workspaceFolder:          Input<T>;
    globalLanguage:           Input<T>;
    workspaceLanguage:        Input<T>;
    workspaceFolderLanguage:  Input<T>;
}

function unwrapAssert<T>(actualValue: T | undefined, input: Input<T>): void {
    assert.deepStrictEqual(actualValue, input.valid ? input.value : undefined);
}

function assertValues<T>(actual: Values<T>, spec: VCReaderTestSpec<T>): void {
    assert.deepStrictEqual(actual.defaultValue,         spec.expected.defaultValue);
    assert.deepStrictEqual(actual.defaultLanguageValue, spec.expected.defaultLanguageValue);
    assert.deepStrictEqual(actual.effectiveValue,       spec.expected.effectiveValue);
    unwrapAssert(actual.globalValue,                    spec.userDefinable.global);
    unwrapAssert(actual.workspaceValue,                 spec.userDefinable.workspace);
    unwrapAssert(actual.workspaceFolderValue,           spec.userDefinable.workspaceFolder);
    unwrapAssert(actual.globalLanguageValue,            spec.userDefinable.globalLanguage);
    unwrapAssert(actual.workspaceLanguageValue,         spec.userDefinable.workspaceLanguage);
    unwrapAssert(actual.workspaceFolderLanguageValue,   spec.userDefinable.workspaceFolderLanguage);
}

function assertDualValues<T, D>(actual: DualValues<T, D>, spec: VCDualReaderTestSpec<T, D>): void {

    // Assert all values of the new configuration and the effective value.
    assertValues(actual, spec);

    // Assert the values of the deprecated configuration.
    assert.deepStrictEqual(actual.deprDefaultValue,         spec.deprExpected.defaultValue);
    assert.deepStrictEqual(actual.deprDefaultLanguageValue, spec.deprExpected.defaultLanguageValue);
    unwrapAssert(actual.deprGlobalValue,                    spec.deprUserDefinable.global);
    unwrapAssert(actual.deprWorkspaceValue,                 spec.deprUserDefinable.workspace);
    unwrapAssert(actual.deprWorkspaceFolderValue,           spec.deprUserDefinable.workspaceFolder);
    unwrapAssert(actual.deprGlobalLanguageValue,            spec.deprUserDefinable.globalLanguage);
    unwrapAssert(actual.deprWorkspaceLanguageValue,         spec.deprUserDefinable.workspaceLanguage);
    unwrapAssert(actual.deprWorkspaceFolderLanguageValue,   spec.deprUserDefinable.workspaceFolderLanguage);
}

// -------------------------------------------------------------------------------------
// Utilities to test `VCReader`.
 
/**
 * Specifies a test for the `testVCReader` function.
 */
interface VCReaderTestSpec<T> {
    name: string;
    scope: ConfigurationScope;
    validate: (t: unknown) => t is T;
    expected: {
        defaultValue: T | undefined;

        /**
         * Note that the `defaultLanguageValue` can only be `undefined` because there is no way for 
         * a third party extension to specify language based defaults for its configurations. In 
         * other words, there is no way for us here to specify a language based default for any of 
         * the dummy configurations we use for our tests. Therefore we can't expect any value other 
         * than `undefined`.
         *
         * However, this property will still be left here in case vscode does allow that to happen 
         * in the future.
         */
        defaultLanguageValue: undefined;
        effectiveValue: T | undefined;
    }

    /** 
     * Values which we set then read back via `VCReader`. 
     */
    userDefinable: UserDefinable<T>;
}

export async function testVCReader<T>(spec: VCReaderTestSpec<T>): Promise<void> {
    const reader = new VCReader(spec);
    await setConfiguration(spec.name, spec.scope, spec.userDefinable);

    // If we expect that an effective value can't be found, then we expect `read` to throw.
    if (spec.expected.effectiveValue === undefined) {
        assert.throws(function () {
            reader.read(spec.scope);
        });
    } else {
        assertValues<T>(reader.read(spec.scope), spec);
    }
}

// -------------------------------------------------------------------------------------
// Utilities to test `VCDualReader`.

/**
 * Specifies a test for the `testVCDualReader` function.
 */
interface VCDualReaderTestSpec<T, D> extends VCReaderTestSpec<T> {
    deprName: string;
    deprValidate: (d: unknown) => d is D;
    normalize: (d: D) => T;
    deprExpected: {
        defaultValue: D | undefined;

        /** 
         * See `VCReaderTestSpec` for why this is `undefined`. 
         */
        defaultLanguageValue: undefined;
    }

    /** 
     * For the deprecated configuration. 
     */
    deprUserDefinable: UserDefinable<D>;
}

export async function testVCDualReader<T, D>(spec: VCDualReaderTestSpec<T, D>): Promise<void> {
    const reader = new VCDualReader(spec);
    await setConfiguration(spec.name,     spec.scope, spec.userDefinable);
    await setConfiguration(spec.deprName, spec.scope, spec.deprUserDefinable);
    
    // If we expect that an effective value can't be found, then we expect `read` to throw.
    if (spec.expected.effectiveValue === undefined) {
        assert.throws(function () {
            reader.read(spec.scope);
        });
    } else {
        assertDualValues<T, D>(reader.read(spec.scope), spec);
    }
}

// -------------------------------------------------------------------------------------
// Utilities to set and clear configuration values.

export async function setConfiguration<T>(
    name: string,
    scope: ConfigurationScope,
    input: UserDefinable<T>
): Promise<void> 
{
    const { section, child } = splitName(name);
    const c = workspace.getConfiguration(section, scope);
    await c.update(child, input.global.value,                  ConfigurationTarget.Global,          false);
    await c.update(child, input.workspace.value,               ConfigurationTarget.Workspace,       false);
    await c.update(child, input.workspaceFolder.value,         ConfigurationTarget.WorkspaceFolder, false);
    await c.update(child, input.globalLanguage.value,          ConfigurationTarget.Global,          true);
    await c.update(child, input.workspaceLanguage.value,       ConfigurationTarget.Workspace,       true);
    await c.update(child, input.workspaceFolderLanguage.value, ConfigurationTarget.WorkspaceFolder, true);
}

/** 
 * Test the `setConfiguration` function. 
 */
export async function testSetConfiguration(name: string, scope: ConfigurationScope): Promise<void> {

    const { section, child } = splitName(name);

    // Set to arbitrary values.
    await setConfiguration(name, scope, {
        global:                  { valid: true, value: 2 },
        workspace:               { valid: true, value: 3 },
        workspaceFolder:         { valid: true, value: 4 },
        globalLanguage:          { valid: true, value: 5 },
        workspaceLanguage:       { valid: true, value: 6 },
        workspaceFolderLanguage: { valid: true, value: 7 }
    });

    // Check by reading back using the raw extension API then comparing against expected values.
    const inspect = workspace.getConfiguration(section, scope).inspect(child);
    if (inspect === undefined) {
        throw new Error('`Inspect` is unexpectedly `undefined`!');
    }
    assert.deepStrictEqual(inspect.globalValue,                  2);
    assert.deepStrictEqual(inspect.workspaceValue,               3);
    assert.deepStrictEqual(inspect.workspaceFolderValue,         4);
    assert.deepStrictEqual(inspect.globalLanguageValue,          5);
    assert.deepStrictEqual(inspect.workspaceLanguageValue,       6);
    assert.deepStrictEqual(inspect.workspaceFolderLanguageValue, 7);

};

export async function clearConfiguration(name: string, scope: ConfigurationScope): Promise<void> {
    return setConfiguration(name, scope, {
        global:                  { valid: false, value: undefined },
        workspace:               { valid: false, value: undefined },
        workspaceFolder:         { valid: false, value: undefined },
        globalLanguage:          { valid: false, value: undefined },
        workspaceLanguage:       { valid: false, value: undefined },
        workspaceFolderLanguage: { valid: false, value: undefined }
    });
}

/** 
 * Test the `clearConfiguration` function.
 */
export async function testClearConfiguration(name: string, scope: ConfigurationScope): Promise<void> {

    const { section, child } = splitName(name);

    // Set to arbitrary values which we will then erase. 
    await setConfiguration(name, scope, {
        global:                  { valid: true, value: 2 },
        workspace:               { valid: true, value: 3 },
        workspaceFolder:         { valid: true, value: 4 },
        globalLanguage:          { valid: true, value: 5 },
        workspaceLanguage:       { valid: true, value: 6 },
        workspaceFolderLanguage: { valid: true, value: 7 }
    });
    await clearConfiguration(name, scope);
    const inspect = workspace.getConfiguration(section, scope).inspect(child);
    if (inspect === undefined) {
        throw new Error('`Inspect` is unexpectedly `undefined`!');
    }
    assert.deepStrictEqual(inspect.globalValue,                  undefined);
    assert.deepStrictEqual(inspect.workspaceValue,               undefined);
    assert.deepStrictEqual(inspect.workspaceFolderValue,         undefined);
    assert.deepStrictEqual(inspect.globalLanguageValue,          undefined);
    assert.deepStrictEqual(inspect.workspaceLanguageValue,       undefined);
    assert.deepStrictEqual(inspect.workspaceFolderLanguageValue, undefined);
};

/** 
 * Construct a `VCReader` and assert that the constructor throws.
 * 
 * A dummy `validate` callback is passed to the constructor.
 */
export function assertVCReaderCtorThrows(name: string): void {

    // We use a dummy callback because we just want to know whether the constructor throws. This
    // callbacks isn't used at all in the constructor so anything will do.
    const validate = (t: any): t is number => typeof t === 'number';

    assert.throws(
        function () {
            new VCReader({
                name,
                validate
            });
        }
    );
}

/**
 * Construct a `VCDualReader` and assert that the constructor throws.
 * 
 * Dummy `validate`, `deprValidate` and `normalize` callbacks are passed to the constructor.
 */
export function assertVCDualReaderCtorThrows(name: string, deprName: string): void {
    
    // We use dummy callbacks because we just want to know whether the constructor throws. These 
    // callbacks aren't used at all in the constructor so anything will do.
    const validate     = (t: any): t is number => typeof t === 'number';
    const deprValidate = (d: any): d is string => typeof d === 'string';
    const normalize    = () => 10;

    assert.throws(
        function () {
            new VCDualReader({
                name,
                validate,
                deprName,
                deprValidate,
                normalize
            });
        }
    );
}