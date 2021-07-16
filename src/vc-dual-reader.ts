import { VCReader, ValuesPartial, VCReaderParams, Values } from './vc-reader';
import { ConfigurationScope } from 'vscode';
import { NoEffectiveValueError } from './errors';

/**
 * Configuration reader that reads and validates values from a new and deprecated configuration.
 * 
 * This class is used to handle situations where a configuration has been superseded but we still 
 * want to read the deprecated configuration as well. See also the base `VCReader` class for why we
 * prefer to read configuration values through this class instead of just using the raw vscode API.
 */
export class VCDualReader<T, D, E> {

    /** 
     * Full name of the new configuration. 
     */
    public get name(): string {
        return this.args.name;
    }

    /**
     * Full name of the deprecated configuration.
     */
    public get deprName(): string {
        return this.args.deprName;
    }

    /**
     * Reader for the new configuration.
     */
    private readonly newReader: VCReader<T, E>;

    /** 
     * Reader for the deprecated configuration. 
     */
    private readonly deprReader: VCReader<D, E>;

    /**
     * Register a validating reader that simultaneously reads values from a new and a deprecated 
     * configuration.
     * 
     * @throws `ConfigurationNameEmptyError` if either `name` or `deprName` is empty.
     */
    public constructor(private readonly args: VCDualReaderParams<T, D, E>) {
        this.newReader  = new VCReader({ ...args });
        this.deprReader = new VCReader({
            name:      args.deprName,
            validate:  args.deprValidate,
            transform: args.deprTransform
        });
    }

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
     * returned. The effective value is the lowest value in the list above that is defined and valid. 
     * If the effective value is from the new configuration, it will be transformed with the `transform`
     * callback provided in the constructor before being returned. On the other hand, if the effective 
     * value is from the deprecated configuration, it will be transformed with `deprTransform` before
     * being returned. The effective value is guaranteed to be defined, otherwise this method will 
     * throw an error.
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
     * @throws `NoEffectiveValueError` if an effective value cannot be calculated. 
     */
    public read(scope?: ConfigurationScope): DualValues<T, D, E> {
        const values = this._read(scope);

        // Calculate the effective value and scope by applying shadowing rules.
        let effectiveValue: E;
        if (values.workspaceFolderLanguageValue !== undefined) {
            effectiveValue = this.args.transform(values.workspaceFolderLanguageValue);
        } else if (values.deprWorkspaceFolderLanguageValue !== undefined) {
            effectiveValue = this.args.deprTransform(values.deprWorkspaceFolderLanguageValue);
        } else if (values.workspaceLanguageValue !== undefined) {
            effectiveValue = this.args.transform(values.workspaceLanguageValue);
        } else if (values.deprWorkspaceLanguageValue !== undefined) {
            effectiveValue = this.args.deprTransform(values.deprWorkspaceLanguageValue);
        } else if (values.globalLanguageValue !== undefined) {
            effectiveValue = this.args.transform(values.globalLanguageValue);
        } else if (values.deprGlobalLanguageValue !== undefined) {
            effectiveValue = this.args.deprTransform(values.deprGlobalLanguageValue);
        } else if (values.defaultLanguageValue !== undefined) {
            effectiveValue = this.args.transform(values.defaultLanguageValue);
        } else if (values.deprDefaultLanguageValue !== undefined) {
            effectiveValue = this.args.deprTransform(values.deprDefaultLanguageValue);
        } else if (values.workspaceFolderValue !== undefined) {
            effectiveValue = this.args.transform(values.workspaceFolderValue);
        } else if (values.deprWorkspaceFolderValue !== undefined) {
            effectiveValue = this.args.deprTransform(values.deprWorkspaceFolderValue);
        } else if (values.workspaceValue !== undefined) {
            effectiveValue = this.args.transform(values.workspaceValue);
        } else if (values.deprWorkspaceValue !== undefined) {
            effectiveValue = this.args.deprTransform(values.deprWorkspaceValue);
        } else if (values.globalValue !== undefined) {
            effectiveValue = this.args.transform(values.globalValue);
        } else if (values.deprGlobalValue !== undefined) {
            effectiveValue = this.args.deprTransform(values.deprGlobalValue);
        } else if (values.defaultValue !== undefined) {
            effectiveValue = this.args.transform(values.defaultValue);
        } else if (values.deprDefaultValue !== undefined) {
            effectiveValue = this.args.deprTransform(values.deprDefaultValue);
        } else {
            throw new NoEffectiveValueError(`No effective value between ${this.args.name} and ${this.args.deprName}.`);
        }

        return { ...values, effectiveValue };
    }

    /** @internal */
    public _read(scope: ConfigurationScope | undefined): DualValuesPartial<T, D> {
        const newValues  = this.newReader._read(scope);
        const deprValues = this.deprReader._read(scope);
        return {
            ...newValues,
            deprDefaultValue:                 deprValues.defaultValue,
            deprGlobalValue:                  deprValues.globalValue,
            deprWorkspaceValue:               deprValues.workspaceValue,
            deprWorkspaceFolderValue:         deprValues.workspaceFolderValue,
            deprDefaultLanguageValue:         deprValues.defaultLanguageValue,
            deprGlobalLanguageValue:          deprValues.globalLanguageValue,
            deprWorkspaceLanguageValue:       deprValues.workspaceLanguageValue,
            deprWorkspaceFolderLanguageValue: deprValues.workspaceFolderLanguageValue,
        };
    }

} 

export interface VCDualReaderParams<T, D, E> extends VCReaderParams<T, E> {
    
    /**
     * Full name of the deprecated configuration.
     */
    readonly deprName: string

    /**
     * Callback used to validate values of the deprecated configuration.
     */
    readonly deprValidate: (d: unknown) => d is D;

    /**
     * Callback used to transform the effective value if the effective value is from the deprecated 
     * configuration.
     */
    readonly deprTransform: (d: D) => E;
    
}

/**
 * The validated values of both the new and deprecated configurations.
 */
export interface DualValuesPartial<T, D> extends ValuesPartial<T> {

    /** 
     * The validated default value of the new configuration. 
     */
    defaultValue: T | undefined;

    /** 
     * The validated global value of the new configuration.
     */
    globalValue: T | undefined;

    /**
     * The validated workspace value of the new configuration.
     */
    workspaceValue: T | undefined;

    /**
     * The validated workspace folder value of the new configuration.
     */
    workspaceFolderValue: T | undefined;

    /** 
     * The validated language specific default value of the new configuration.
     */
    defaultLanguageValue: T | undefined;

    /**
     * The validated language specific global value of the new configuration.
     */
    globalLanguageValue: T | undefined;

    /**
     * The validated language specific workspace value of the new configuration.
     */
    workspaceLanguageValue: T | undefined;

    /**
     * The validated language specific workspace folder value of the new configuration.
     */
    workspaceFolderLanguageValue: T | undefined;

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
     * The validated workspace folder value of the deprecated configuration.
     */
    deprWorkspaceFolderValue: D | undefined;
    
    /**
     * The validated language specific default value of the deprecated configuration.
     */
    deprDefaultLanguageValue: D | undefined;

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
 * The validated values of both the new and deprecated configurations along with the transformed
 * effective value.
 */
export interface DualValues<T, D, E> extends DualValuesPartial<T, D>, Values<T, E> {}
