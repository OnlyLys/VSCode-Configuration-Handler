import * as assert from 'assert';
import { ConfigurationTarget, ConfigurationScope, workspace } from 'vscode';
import { splitName } from '../../vc-reader';
import { Values, ValuesCompat } from '../../values';

export interface GoodBad<T> { 
    
    /** A configuration value which we know to be valid. */
    good: T;

    /** A configuration value that is intentionally invalid. */
    bad: unknown;

};

export interface UserDefinable<T> {
    global:                   T;
    workspace:                T;
    workspaceFolder:          T;
    globalLanguage:           T;
    workspaceLanguage:        T;
    workspaceFolderLanguage:  T;
}

/** We can input values which are intentionally invalid by tagging `valid` with `false`. */
export type Input<T> = { valid: true;  value: T } 
                     | { valid: false; value: unknown };

function unwrapAssert<T>(actualValue: T | undefined, input: Input<T>): void {
    assert.deepStrictEqual(actualValue, input.valid ? input.value : undefined);
}

interface VCReaderTestSpec<T> {

    /** String that would be printed in the debug console describing the test. */
    description: string;

    name: string;
    
    scope: Thenable<ConfigurationScope>;

    validate: (t: unknown) => t is T;

    expectedDefaultValue: T | undefined;

    /**
     * Note that the `defaultLanguageValue` can only be `undefined` because there is no way for a 
     * third party extension to specify language based defaults for its configurations. In other 
     * words, there is no way for us here to specify a language based default for any of the dummy 
     * configurations we use for our tests. Therefore we can't expect any value other than 
     * `undefined`.
     * 
     * However, this property will still be left here in case vscode does allow that to happen in 
     * the future.
     */
    expectedDefaultLanguageValue: undefined;

}

export interface VCReaderAutomatedTestSpec<T> extends VCReaderTestSpec<T> {

    /** 
     * Both good and bad configuration values for all the user definable scopes, for use in 
     * automated testing.
     */
    userDefinable: UserDefinable<GoodBad<T>>;

}

export interface VCReaderHardcodedTestSpec<T> extends VCReaderTestSpec<T> {

    expectedEffectiveValue: T | undefined;

    /** Values which we set then read back via `VCReader`. */
    userDefinable: UserDefinable<Input<T>>;

}

export function assertValuesExpected<T>(
    actual: Values<T>, 
    expected: {
        defaultValue:         T | undefined,
        defaultLanguageValue: T | undefined,
        effectiveValue:       T | undefined,
        userDefinable:        UserDefinable<Input<T>>
    }
): void {
    assert.deepStrictEqual(actual.defaultValue,         expected.defaultValue);
    assert.deepStrictEqual(actual.defaultLanguageValue, expected.defaultLanguageValue);
    assert.deepStrictEqual(actual.effectiveValue,       expected.effectiveValue);
    unwrapAssert(actual.globalValue,                    expected.userDefinable.global);
    unwrapAssert(actual.workspaceValue,                 expected.userDefinable.workspace);
    unwrapAssert(actual.workspaceFolderValue,           expected.userDefinable.workspaceFolder);
    unwrapAssert(actual.globalLanguageValue,            expected.userDefinable.globalLanguage);
    unwrapAssert(actual.workspaceLanguageValue,         expected.userDefinable.workspaceLanguage);
    unwrapAssert(actual.workspaceFolderLanguageValue,   expected.userDefinable.workspaceFolderLanguage);

    // Make sure that `guaranteedEffectiveValue` getter of `Values` throws if the effective value is 
    // expected not to be valid.
    if (expected.effectiveValue === undefined) {
        assert.throws(function () {
            actual.guaranteedEffectiveValue;
        });
    } else {
        assert.deepStrictEqual(actual.guaranteedEffectiveValue, expected.effectiveValue);
    }
}

export async function setConfiguration<T>(
    name: string,
    scope: ConfigurationScope,
    input: UserDefinable<Input<T>>
): Promise<void> 
{
    const { section, child } = splitName(name);
    const c = workspace.getConfiguration(section, scope);
    await c.update(child, input.global.value,                  ConfigurationTarget.Global);
    await c.update(child, input.workspace.value,               ConfigurationTarget.Workspace);
    await c.update(child, input.workspaceFolder.value,         ConfigurationTarget.WorkspaceFolder);
    await c.update(child, input.globalLanguage.value,          ConfigurationTarget.Global,          true);
    await c.update(child, input.workspaceLanguage.value,       ConfigurationTarget.Workspace,       true);
    await c.update(child, input.workspaceFolderLanguage.value, ConfigurationTarget.WorkspaceFolder, true);
}

export async function clearConfiguration(name: string, scope: ConfigurationScope): Promise<void> {
    return await setConfiguration(name, scope, {
        global:                  { valid: false, value: undefined },
        workspace:               { valid: false, value: undefined },
        workspaceFolder:         { valid: false, value: undefined },
        globalLanguage:          { valid: false, value: undefined },
        workspaceLanguage:       { valid: false, value: undefined },
        workspaceFolderLanguage: { valid: false, value: undefined }
    });
}

/** 
 * For the exhaustive automated test we have to generate the entire range of inputs which we can 
 * pass to the `setConfiguration` function.
 * 
 * To achieve this, we take good values, bad values and the value `undefined` (to simulate the
 * configuration being turned off at a particular scope), then create all possible inputs for the
 * scopes which can have user definable values.
 */
export function* genInputs<T>(userDefinable: UserDefinable<GoodBad<T>>)
    : Generator<UserDefinable<Input<T>>> {
    const x: Input<T>[][] = [
        [
            { valid: true,  value: userDefinable.global.good },
            { valid: false, value: undefined },
            { valid: false, value: userDefinable.global.bad },    
        ],
        [
            { valid: true,  value: userDefinable.workspace.good },
            { valid: false, value: undefined },
            { valid: false, value: userDefinable.workspace.bad },    
        ],
        [
            { valid: true,  value: userDefinable.workspaceFolder.good },
            { valid: false, value: undefined },
            { valid: false, value: userDefinable.workspaceFolder.bad },    
        ],
        [
            { valid: true,  value: userDefinable.globalLanguage.good },
            { valid: false, value: undefined },
            { valid: false, value: userDefinable.globalLanguage.bad },    
        ],
        [
            { valid: true,  value: userDefinable.workspaceLanguage.good },
            { valid: false, value: undefined },
            { valid: false, value: userDefinable.workspaceLanguage.bad },    
        ],
        [
            { valid: true,  value: userDefinable.workspaceFolderLanguage.good },
            { valid: false, value: undefined },
            { valid: false, value: userDefinable.workspaceFolderLanguage.bad },    
        ]
    ];
    // The cartesian product of all the arrays in 'x' will yield a collection of all possible
    // input values that we can use.
    for (const c of genCartesianProduct(...x)) {
        // Since the cartesian product generator respects the order of the input arrays, we can 
        // immediately assign them back to their respective scopes here then return.
        yield {
            global:                  c[0],
            workspace:               c[1],
            workspaceFolder:         c[2],
            globalLanguage:          c[3],
            workspaceLanguage:       c[4],
            workspaceFolderLanguage: c[5]
        };
    }
}

/** 
 * Take n arrays of the same length then perform n-fold cartesian product of them. Cartesian product 
 * is performed in order of the arrays in `input`. 
 * 
 * @throws Will throw if 
 *         1. `input` has less than two arrays.
 *         2. All arrays within `input` don't have the same length.
 */        
export function* genCartesianProduct<T>(...input: T[][]): Generator<T[]> {

    const l = input.length;
    if (l < 2) {
        throw new Error("Cannot obtain cartesian product of less than two input arrays");
    }

    const n = input[0].length;
    for (const array of input) {
        if (array.length !== n) {
            throw new Error("Cartesian product can only be performed on arrays of equal length");
        }
    }

    // Let the number of input arrays be l and the length of each array within `input` be n.
    //
    // One way to generate all possible inputs is to use an integer counter, then interpret it as a
    // zero-padded base n number of length l. 
    //
    // Then starting from the least significant digit, for each digit i at position k, fill in the 
    // kth index of the return array with the ith value of the kth input array. 
    for (let counter = 0; counter < (n ** l); ++counter) {
        const temp: T[] = [];
        // Iterate through the digits of the counter, filling in the return array in the process.
        let currCounter = counter;
        for (let k = 0; k < l; ++k) { 
            const i = currCounter % n;
            temp.push(input[k][i]);
            // Dividing an integer of base n by n drops the least significant digit.
            currCounter = Math.floor(currCounter / n);
        }
        yield temp;
    }

}

// -------------------------------------------------------------------------------------
// UTILITIES FOR VC READER COMPAT

interface VCReaderCompatTestSpec<T, D> extends VCReaderTestSpec<T> {

    deprName: string;

    deprValidate: (d: unknown) => d is D;

    normalize: (d: D) => T;

    expectedDeprDefaultValue: D | undefined;

    /** 
     * This is `undefined` because vscode does not allow third party extensions to define any 
     * configurations with language based default values.
     * 
     * For more information, see `expectedDefaultLanguageValue` of `VCReaderTestBaseSpec`.
     */
    expectedDeprDefaultLanguageValue: undefined;

}

export interface VCReaderCompatAutomatedTestSpec<T, D> extends VCReaderCompatTestSpec<T, D> {

    /** For the newer configuration. */
    userDefinable: UserDefinable<GoodBad<T>>;

    /** For the deprecated configuration. */
    deprUserDefinable: UserDefinable<GoodBad<D>>;

}

export interface VCReaderCompatHardcodedTestSpec<T, D> extends VCReaderCompatTestSpec<T, D> {

    expectedEffectiveValue: T;

    /** For the newer configuration. */
    userDefinable: UserDefinable<Input<T>>;

    /** For the deprecated configuration. */
    deprUserDefinable: UserDefinable<Input<D>>;

}

export function assertValuesCompatExpected<T, D>(
    actual: ValuesCompat<T, D>, 
    expected: {
        defaultValue:             T | undefined,
        defaultLanguageValue:     T | undefined,
        effectiveValue:           T | undefined,
        userDefinable:            UserDefinable<Input<T>>,
        deprDefaultValue:         D | undefined,
        deprDefaultLanguageValue: D | undefined,
        deprUserDefinable:        UserDefinable<Input<D>>
    }
): void {

    // This call settles the assertion of all values of the newer configuration, including
    // `effectiveValue` and `guaranteedEffectiveValue`. 
    assertValuesExpected(actual, expected);

    // What's left is to check the values of the deprecated configuration.
    assert.deepStrictEqual(actual.deprDefaultValue,         expected.defaultValue);
    assert.deepStrictEqual(actual.deprDefaultLanguageValue, expected.defaultLanguageValue);
    unwrapAssert(actual.deprGlobalValue,                    expected.deprUserDefinable.global);
    unwrapAssert(actual.deprWorkspaceValue,                 expected.deprUserDefinable.workspace);
    unwrapAssert(actual.deprWorkspaceFolderValue,           expected.deprUserDefinable.workspaceFolder);
    unwrapAssert(actual.deprGlobalLanguageValue,            expected.deprUserDefinable.globalLanguage);
    unwrapAssert(actual.deprWorkspaceLanguageValue,         expected.deprUserDefinable.workspaceLanguage);
    unwrapAssert(actual.deprWorkspaceFolderLanguageValue,   expected.deprUserDefinable.workspaceFolderLanguage);

}