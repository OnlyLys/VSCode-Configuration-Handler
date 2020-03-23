import { VCReader } from './vc-reader';
import { ValuesCompat } from './values';
import { ConfigurationScope } from 'vscode';

/**
 * An extension of the `VCReader` class to further yield values from a deprecated configuration.
 * 
 * The goal of this class is to handle situations where a configuration is superseded by a newer one 
 * but we still want to read values of the deprecated one as well. 
 * 
 * Just like in the base `VCReader` class, values obtained from the deprecated configuration will
 * also be validated first.
 */
export class VCReaderCompat<T, D> extends VCReader<T> {
    
    /** Instance pointing to the deprecated configuration. */
    private readonly deprReader: VCReader<D>;

    /** 
     * Get the validated configuration values for both the newer and deprecated configurations. In
     * specific the following values are returned:
     * 
     *   1.  **Deprecated** Default                            (`deprDefaultValue`)
     *   2.  Default                                           (`defaultValue`)
     *   3.  **Deprecated** Global                             (`deprGlobalValue`)
     *   4.  Global                                            (`globalValue`)
     *   5.  **Deprecated** Workspace                          (`deprWorkspaceValue`) 
     *   6.  Workspace                                         (`workspaceValue`) 
     *   7.  **Deprecated** Workspace Folder                   (`deprWorkspaceFolderValue`)
     *   8.  Workspace Folder                                  (`workspaceFolderValue`)
     *   9.  **Deprecated** Language Specific Default          (`deprDefaultLanguageValue`)
     *   10. Language Specific Default                         (`defaultLanguageValue`)
     *   11. **Deprecated** Language Specific Global           (`deprGlobalLanguageValue`) 
     *   12. Language Specific Global                          (`globalLanguageValue`) 
     *   13. **Deprecated** Language Specific Workspace        (`deprWorkspaceLanguageValue`)
     *   14. Language Specific Workspace                       (`workspaceLanguageValue`)
     *   15. **Deprecated** Language Specific Workspace Folder (`deprWorkspaceFolderLanguageValue`)
     *   16. Language Specific Workspace Folder                (`workspaceFolderLanguageValue`)
     * 
     * All values will be validated by their respective validation callbacks as provided in the
     * constructor of this class.
     * 
     * Similar to the `read` method in the base class, an effective value will be calculated. Here
     * the effective value is the last value in the list above that both exists and is valid. If 
     * a deprecated configuration value is the effective value, it will be converted to the type of 
     * the newer configuration via the `normalize` callback provided in the constructor. 
     * 
     * Just like in the base class, it is possible for the `effectiveValue` to be `undefined` if an
     * effective value cannot be obtained.
     * 
     * For more information (including an explanation on what the `scope` parameter is) please see 
     * the `read` method of the base `VCReader` class.
     */
    public read(scope?: ConfigurationScope): ValuesCompat<T, D> {
        const newer = super._read(scope);
        const depr  = this.deprReader._read(scope);
        let effectiveValue: T | undefined;
        // The newer configuration always takes precedence in situations where the scopes are tied.
        if (newer.effectiveScope >= depr.effectiveScope) {
            effectiveValue = newer.effectiveValue;
        } else if (depr.effectiveValue !== undefined) {
            effectiveValue = this.args2.normalize(depr.effectiveValue);
        } else {
            // This branch is unreachable because the minimum value for `EffectiveScope` is `NONE`.
            // Thus if `depr.effectiveScope` is greater than `newer.effectiveScope`, then its 
            // minimum possible value would be `DEFAULT`. This implies that there is a valid value
            // for the deprecated configuration in some scope. Thus `depr.effectiveValue` cannot be 
            // `undefined`.
            throw new Error("Unreachable!");
        }
        return {
            ...newer,
            deprDefaultValue:                 depr.defaultValue,
            deprGlobalValue:                  depr.globalValue,
            deprWorkspaceValue:               depr.workspaceValue,
            deprWorkspaceFolderValue:         depr.workspaceFolderValue,
            deprDefaultLanguageValue:         depr.defaultLanguageValue,
            deprGlobalLanguageValue:          depr.globalLanguageValue,
            deprWorkspaceLanguageValue:       depr.workspaceLanguageValue,
            deprWorkspaceFolderLanguageValue: depr.workspaceFolderLanguageValue,
            effectiveValue
        };
    }

    /**
     * Register a validated reader that simultaneously reads values from a newer and a deprecated 
     * configuration.
     * 
     * @param name  Full name of the newer configuration.
     * @param validate Callback used to validate values of the newer configuration.
     * @param deprName Full name of the deprecated configuration.
     * @param deprValidate Callback used to validate values of the deprecated configuration.
     * @param normalize Callback to transform values of the deprecated configuration to the type of 
     *                  the newer one when calculating the `effectiveValue`. This is done so that
     *                  using the effective value is much more convenient. 
     * 
     * @throws `ConfigurationNameEmptyError` if either `name` or `deprName` is empty.
     */
    public constructor(private readonly args2: {
        name:         string,
        validate:     (t: unknown) => t is T,
        deprName:     string,
        deprValidate: (d: unknown) => d is D,
        normalize:    (d: D) => T
    }) {
        // Super class instance handles the newer configuration.
        super({
            name:     args2.name,
            validate: args2.validate
        });
        // Deprecated configuration is handled by a delegated instance.
        this.deprReader = new VCReader({
            name:     args2.deprName,
            validate: args2.deprValidate
        });
    }

} 

