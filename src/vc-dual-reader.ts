import { VCReader } from './vc-reader';
import { DualValues } from './values';
import { ConfigurationScope } from 'vscode';
import { NoGuaranteedEffectiveValueError } from './errors';

/**
 * Configuration reader that reads and validates values from a new and deprecated configuration.
 * 
 * This class is used to handle situations where a configuration has been superseded but we still 
 * want to read the deprecated configuration as well. See also the base `VCReader` class for why we
 * prefer to read configuration values through this class instead of just using the raw vscode API.
 */
export class VCDualReader<T, D> extends VCReader<T> {
    
    /** 
     * Reader for the deprecated configuration. 
     */
    private readonly deprReader: VCReader<D>;

    /** 
     * Get the following validated configuration values for the new and deprecated configurations:
     * 
     *   1.  Default of Deprecated                            (`deprDefaultValue`)
     *   2.  Default                                          (`defaultValue`)
     *   3.  Global of Deprecated                             (`deprGlobalValue`)
     *   4.  Global                                           (`globalValue`)
     *   5.  Workspace of Deprecated                          (`deprWorkspaceValue`) 
     *   6.  Workspace                                        (`workspaceValue`) 
     *   7.  Workspace Folder of Deprecated                   (`deprWorkspaceFolderValue`)
     *   8.  Workspace Folder                                 (`workspaceFolderValue`)
     *   9.  Language Specific Default of Deprecated          (`deprDefaultLanguageValue`)
     *   10. Language Specific Default                        (`defaultLanguageValue`)
     *   11. Language Specific Global of Deprecated           (`deprGlobalLanguageValue`) 
     *   12. Language Specific Global                         (`globalLanguageValue`) 
     *   13. Language Specific Workspace of Deprecated        (`deprWorkspaceLanguageValue`)
     *   14. Language Specific Workspace                      (`workspaceLanguageValue`)
     *   15. Language Specific Workspace Folder of Deprecated (`deprWorkspaceFolderLanguageValue`)
     *   16. Language Specific Workspace Folder               (`workspaceFolderLanguageValue`)
     * 
     * The meaning of each value is explained [here]. Values whose names are suffixed with 'of 
     * Deprecated' are configuration values of the deprecated configuration. The configuration values 
     * of the new and deprecated configurations are respectively validated with the `validate` and 
     * `deprValidate` callbacks specified in the constructor. Values which fail validation or are 
     * not defined are returned as `undefined`.
     * 
     * Along with the various configuration values listed above, the `effectiveValue` is also 
     * returned. The effective value is the last in the list above that is defined and valid. The 
     * effective value is guaranteed to be a valid value, otherwise an error will be thrown.
     * 
     * [here]: https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration
     * 
     * @param scope This parameter determines from which perspective the configuration is read from.
     *              For instance, in a multi-root workspace, providing a `scope` argument to a
     *              workspace X will cause this method to return configuration values relative to 
     *              workspace X only.
     * 
     *              If no `scope` value is provided, the default scope will be used, which is usually 
     *              the active text editor. When there is no active text editor, the default scope 
     *              will be the workspace in a single workspace environment or the root workspace in 
     *              a multi-root workspace. However, the exact way the default scope is determined 
     *              is not really made clear by vscode's API.
     * 
     * @throws `NoGuaranteedEffectiveValue` if an effective value cannot be calcualted. 
     */
    public read(scope?: ConfigurationScope): DualValues<T, D> {
        const newer = super._read(scope);
        const depr  = this.deprReader._read(scope);
        let effectiveValue: T | undefined;
        
        // The newer configuration always takes precedence in situations where the scopes are tied.
        if (newer.effectiveScope >= depr.effectiveScope) {
            effectiveValue = newer.effectiveValue;
        } else if (depr.effectiveValue !== undefined) {
            effectiveValue = this.args2.normalize(depr.effectiveValue);
        } else {

            // To get here, it must be true that:
            //  
            //   1. `newer.effectiveScope` < `depr.effectiveScope`.
            //   2. `depr.effectiveValue` is `undefined`.
            //
            // But 1 implies that `depr.effectiveScope` > `EffectiveScope.NONE`, which then implies 
            // that `depr.effectiveValue` is defined. That contradicts 2, thus this branch is 
            // unreachable.
            throw new Error("Unreachable!");
        }
        if (effectiveValue === undefined) {
            throw new NoGuaranteedEffectiveValueError(
                'Unable to obtain a guaranteed effective value from the merged view of'
                + ` ${this.args2.name} and ${this.args2.deprName}`
            );
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
     * Register a validating reader that simultaneously reads values from a new and a deprecated 
     * configuration.
     * 
     * @param name  Full name of the new configuration.
     * @param validate Callback used to validate values of the new configuration.
     * @param deprName Full name of the deprecated configuration.
     * @param deprValidate Callback used to validate values of the deprecated configuration.
     * @param normalize Callback to transform values of the deprecated configuration to the type of 
     *                  the new configuration.
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

        // Super class instance handles the new configuration.
        super({
            name:     args2.name,
            validate: args2.validate
        });

        // Another reader handles the deprecated configuration.
        this.deprReader = new VCReader({
            name:     args2.deprName,
            validate: args2.deprValidate
        });
    }

} 

