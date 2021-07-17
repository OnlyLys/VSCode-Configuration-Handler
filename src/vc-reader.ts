import { workspace, ConfigurationScope } from 'vscode';
import { Inspect } from './inspect';

/** 
 * Configuration reader that validates values before yielding them.
 * 
 * This class exists because the vscode api provides methods to read configuration values, but the 
 * values obtained will not have been validated by vscode. Thus we often have to manually validate 
 * configuration values obtained from vscode by checking that their types are correct, that they 
 * have the correct constraints etc. This class aims to make all of that easier by providing a 
 * simpler API to read configuration values.
 */
export class VCReader<T, E> {

    /** 
     * Full name of the configuration. 
     */
    public get name(): string {
        return this.args.name;
    }

    /**
     * Name of the section that the configuration belongs to.
     * 
     * The `child` name follows it.
     * 
     * For more info: https://code.visualstudio.com/api/references/vscode-api#workspace.getConfiguration
     */
    private readonly section: string;

    /** 
     * The final 'part' of the configuration name, which is whatever follows the last period in the 
     * full name.
     * 
     * The `section` name precedes it.
     * 
     * For more info: https://code.visualstudio.com/api/references/vscode-api#workspace.getConfiguration
     */
    private readonly child: string;

    /** 
     * Register a validating reader that reads configuration values.
     * 
     * @throws `Error` if `name` is empty.
     */
    public constructor(private readonly args: VCReaderParams<T, E>) {
        if (args.name.trim().length === 0) {
            throw new Error(`Name cannot be empty!`);
        }
        const { section, child } = splitName(args.name);
        this.section = section;
        this.child   = child;
    }

    /** 
     * Get the effective validated value of the configuration.
     * 
     * The effective value is determined by taking the following list of values returned by the 
     * `inspect` method:
     * 
     *   - `defaultValue`
     *   - `globalValue`
     *   - `workspaceValue`
     *   - `workspaceFolderValue`
     *   - `defaultLanguageValue`
     *   - `globalLanguageValue`
     *   - `workspaceLanguageValue`
     *   - `workspaceFolderLanguageValue`
     * 
     * and finding the last value in the list (i.e. first from the bottom) that is not `undefined`.
     * 
     * Before it is returned, the effective value is transformed with the `transform` callback 
     * specified in the constructor of this class. 
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
        let effectiveValue: E;
        const inspect   = this.inspect(scope);
        const transform = this.args.transform;
        if (inspect.workspaceFolderLanguageValue !== undefined) {
            effectiveValue = transform(inspect.workspaceFolderLanguageValue);
        } else if (inspect.workspaceLanguageValue !== undefined) {
            effectiveValue = transform(inspect.workspaceLanguageValue);
        } else if (inspect.globalLanguageValue !== undefined) {
            effectiveValue = transform(inspect.globalLanguageValue);
        } else if (inspect.defaultLanguageValue !== undefined) {
            effectiveValue = transform(inspect.defaultLanguageValue);
        } else if (inspect.workspaceFolderValue !== undefined) {
            effectiveValue = transform(inspect.workspaceFolderValue);
        } else if (inspect.workspaceValue !== undefined) {
            effectiveValue = transform(inspect.workspaceValue);
        } else if (inspect.globalValue !== undefined) {
            effectiveValue = transform(inspect.globalValue);
        } else if (inspect.defaultValue !== undefined) {
            effectiveValue = transform(inspect.defaultValue);
        } else {
            throw new Error(`No effective value for ${this.name}.`);
        }

        return effectiveValue;
    }

    /** 
     * Get the validated values of the configuration in the following scopes:
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
        const inspect = workspace.getConfiguration(this.section, scope).inspect<unknown>(this.child);

        // I have yet to encounter circumstances that cause `inspect` to be `undefined`. But better
        // to be safe and do this check.
        if (!inspect) {
            throw new Error(`Unexpected error: Inspecting ${this.name} yields 'undefined'.`);
        }

        const validate = (value: unknown) => this.args.validate(value) ? value : undefined;
        return {
            defaultValue:                 validate(inspect.defaultValue),
            globalValue:                  validate(inspect.globalValue),
            workspaceValue:               validate(inspect.workspaceValue),
            workspaceFolderValue:         validate(inspect.workspaceFolderValue),
            defaultLanguageValue:         validate(inspect.defaultLanguageValue),
            globalLanguageValue:          validate(inspect.globalLanguageValue),
            workspaceLanguageValue:       validate(inspect.workspaceLanguageValue),
            workspaceFolderLanguageValue: validate(inspect.workspaceFolderLanguageValue)
        };
    }

}

export interface VCReaderParams<T, E>  {
    
    /** 
     * Full name of the configuration. 
     */
    readonly name: string;
    
    /** 
     * Callback used to validate values of the configuration.
     */
    readonly validate: (t: unknown) => t is T;
    
    /**  
     * Callback used to transform the effective value.
     */
    readonly transform: (t: T) => E;
    
};

/**
 * Split a full configuration name into a [section name] and a child name. 
 * 
 * For instance, if our full configuration name is `a.b.c` then the split will yield a section name 
 * of `a.b` and a child name of `c`. 
 * 
 * If there is no `.` in the full configuration name then the section name will be empty while the 
 * child name will equal the full configuration name. 
 * 
 * [section name]: https://code.visualstudio.com/api/references/vscode-api#workspace.getConfiguration
 */
export function splitName(name: string): { section: string, child: string } {
    const lastPeriodIndex = name.lastIndexOf('.');
    return {
        section: name.slice(0, lastPeriodIndex),
        child:   name.slice(lastPeriodIndex + 1)
    };
}
