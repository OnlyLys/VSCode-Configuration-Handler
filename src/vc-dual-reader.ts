import { VCReader, VCReaderParams } from './vc-reader';
import { ConfigurationScope } from 'vscode';
import { Inspect } from './inspect';


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
        this.newReader  = new VCReader(args);
        this.deprReader = new VCReader({
            name:      args.deprName,
            validate:  args.deprValidate,
            transform: args.deprTransform
        });
    }

    /** 
     * Get the effective validated value between the new and deprecated configurations.
     * 
     * The effective value is determined by taking the following list of values returned by the
     * `inspect` and `deprInspect` methods:
     * 
     *   - `defaultValue`                 from `deprInspect`
     *   - `defaultValue`                 from `inspect`
     *   - `globalValue`                  from `deprInspect`
     *   - `globalValue`                  from `inspect`
     *   - `workspaceValue`               from `deprInspect`
     *   - `workspaceValue`               from `inspect`
     *   - `workspaceFolderValue`         from `deprInspect`
     *   - `workspaceFolderValue`         from `inspect`
     *   - `defaultLanguageValue`         from `deprInspect`
     *   - `defaultLanguageValue`         from `inspect`
     *   - `globalLanguageValue`          from `deprInspect`
     *   - `globalLanguageValue`          from `inspect`
     *   - `workspaceLanguageValue`       from `deprInspect`
     *   - `workspaceLanguageValue`       from `inspect`
     *   - `workspaceFolderLanguageValue` from `deprInspect`
     *   - `workspaceFolderLanguageValue` from `inspect`
     * 
     * and finding the last value in the list (i.e. first from the bottom) that is not `undefined`.
     * 
     * Before it is returned, the effective value is transformed with either the `transform` or
     * `deprTransform` callback specified in the constructor of this class, depending on whether the
     * effective value comes from the new or deprecated configuration. 
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
     * @throws `Error` if an effective value cannot be obtained. 
     */
    public read(scope?: ConfigurationScope): E {
        const newInspect    = this.newReader.inspect(scope);
        const deprInspect   = this.deprReader.inspect(scope);
        const newTransform  = this.args.transform;
        const deprTransform = this.args.deprTransform;
        let effectiveValue: E;
        if (newInspect.workspaceFolderLanguageValue !== undefined) {
            effectiveValue = newTransform(newInspect.workspaceFolderLanguageValue);
        } else if (deprInspect.workspaceFolderLanguageValue !== undefined) {
            effectiveValue = deprTransform(deprInspect.workspaceFolderLanguageValue);
        } else if (newInspect.workspaceLanguageValue !== undefined) {
            effectiveValue = newTransform(newInspect.workspaceLanguageValue);
        } else if (deprInspect.workspaceLanguageValue !== undefined) {
            effectiveValue = deprTransform(deprInspect.workspaceLanguageValue);
        } else if (newInspect.globalLanguageValue !== undefined) {
            effectiveValue = newTransform(newInspect.globalLanguageValue);
        } else if (deprInspect.globalLanguageValue !== undefined) {
            effectiveValue = deprTransform(deprInspect.globalLanguageValue);
        } else if (newInspect.defaultLanguageValue !== undefined) {
            effectiveValue = newTransform(newInspect.defaultLanguageValue);
        } else if (deprInspect.defaultLanguageValue !== undefined) {
            effectiveValue = deprTransform(deprInspect.defaultLanguageValue);
        } else if (newInspect.workspaceFolderValue !== undefined) {
            effectiveValue = newTransform(newInspect.workspaceFolderValue);
        } else if (deprInspect.workspaceFolderValue !== undefined) {
            effectiveValue = deprTransform(deprInspect.workspaceFolderValue);
        } else if (newInspect.workspaceValue !== undefined) {
            effectiveValue = newTransform(newInspect.workspaceValue);
        } else if (deprInspect.workspaceValue !== undefined) {
            effectiveValue = deprTransform(deprInspect.workspaceValue);
        } else if (newInspect.globalValue !== undefined) {
            effectiveValue = newTransform(newInspect.globalValue);
        } else if (deprInspect.globalValue !== undefined) {
            effectiveValue = deprTransform(deprInspect.globalValue);
        } else if (newInspect.defaultValue !== undefined) {
            effectiveValue = newTransform(newInspect.defaultValue);
        } else if (deprInspect.defaultValue !== undefined) {
            effectiveValue = deprTransform(deprInspect.defaultValue);
        } else {
            throw new Error(`No effective value between ${this.args.name} and ${this.args.deprName}.`);
        }

        return effectiveValue;
    }

    /** 
     * Get the validated values of the new configuration in the following scopes:
     * 
     *   - Default                            (`defaultValue`)
     *   - Global                             (`globalValue`)
     *   - Workspace                          (`workspaceValue`) 
     *   - Workspace Folder                   (`workspaceFolderValue`)
     *   - Language Specific Default          (`defaultLanguageValue`) 
     *   - Language Specific Global           (`globalLanguageValue`) 
     *   - Language Specific Workspace        (`workspaceLanguageValue`)
     *   - Language Specific Workspace Folder (`workspaceFolderLanguageValue`)
     * 
     * The meaning of each value is explained [here]. Each configuration value is validated with
     * the `validate` callback specified in the constructor of this class. Values which fail 
     * validation or are not defined are returned as `undefined`.
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
     */
    public inspect(scope?: ConfigurationScope): Inspect<T> {
        return this.newReader.inspect(scope);
    }

    /** 
     * Get the validated values of the deprecated configuration in the following scopes:
     * 
     *   - Default                            (`defaultValue`)
     *   - Global                             (`globalValue`)
     *   - Workspace                          (`workspaceValue`) 
     *   - Workspace Folder                   (`workspaceFolderValue`)
     *   - Language Specific Default          (`defaultLanguageValue`) 
     *   - Language Specific Global           (`globalLanguageValue`) 
     *   - Language Specific Workspace        (`workspaceLanguageValue`)
     *   - Language Specific Workspace Folder (`workspaceFolderLanguageValue`)
     * 
     * The meaning of each value is explained [here]. Each configuration value is validated with
     * the `deprValidate` callback specified in the constructor of this class. Values which fail 
     * validation or are not defined are returned as `undefined`.
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
     */
    public deprInspect(scope?: ConfigurationScope): Inspect<D> {
        return this.deprReader.inspect(scope);
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
