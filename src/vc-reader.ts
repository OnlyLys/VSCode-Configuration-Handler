import { workspace, ConfigurationScope } from 'vscode';

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
     * Get the following validated configuration values:
     * 
     * 1. Default                         (`defaultValue`)
     * 2. Global                          (`globalValue`)
     * 3. Workspace                       (`workspaceValue`) 
     * 4. Workspace Folder                (`workspaceFolderValue`)
     * 5. Language Based Default          (`defaultLanguageValue`) 
     * 6. Language Based Global           (`globalLanguageValue`) 
     * 7. Language Based Workspace        (`workspaceLanguageValue`)
     * 8. Language Based Workspace Folder (`workspaceFolderLanguageValue`)
     * 
     * The meaning of each value is explained [here]. The configuration values are validated with
     * the `validate` callback specified in the constructor. Values which fail validation or are not 
     * defined are returned as `undefined`.
     * 
     * Along with the various configuration values listed above, the `effectiveValue` is also 
     * returned. The effective value is the lowest value in the list above that is defined and valid. 
     * The effective value is transformed by the `transform` callback provided in the constructor
     * before it is returned, and it is guaranteed to be a defined value, otherwise this method will 
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
     * @throws `Error` if an effective value cannot be calculated. 
     */
    public read(scope?: ConfigurationScope): Values<T, E> {
        const values = this._read(scope);

        // Calculate the effective value and scope by applying shadowing rules.
        let effectiveValue: E;
        if (values.workspaceFolderLanguageValue !== undefined) {
            effectiveValue = this.args.transform(values.workspaceFolderLanguageValue);
        } else if (values.workspaceLanguageValue !== undefined) {
            effectiveValue = this.args.transform(values.workspaceLanguageValue);
        } else if (values.globalLanguageValue !== undefined) {
            effectiveValue = this.args.transform(values.globalLanguageValue);
        } else if (values.defaultLanguageValue !== undefined) {
            effectiveValue = this.args.transform(values.defaultLanguageValue);
        } else if (values.workspaceFolderValue !== undefined) {
            effectiveValue = this.args.transform(values.workspaceFolderValue);
        } else if (values.workspaceValue !== undefined) {
            effectiveValue = this.args.transform(values.workspaceValue);
        } else if (values.globalValue !== undefined) {
            effectiveValue = this.args.transform(values.globalValue);
        } else if (values.defaultValue !== undefined) {
            effectiveValue = this.args.transform(values.defaultValue);
        } else {
            throw new Error(`No effective value for ${this.name}.`);
        }

        return { ...values, effectiveValue };
    }

    /** @internal */
    public _read(scope: ConfigurationScope | undefined): ValuesPartial<T> {
        const inspect = workspace.getConfiguration(this.section, scope).inspect<unknown>(this.child);

        // I have yet to encounter circumstances that cause `inspect` to be `undefined`. But better
        // to be safe than sorry and do this check.
        if (!inspect) {
            throw new Error(`Unexpected error: Inspecting ${this.name} yields 'undefined'.`);
        }

        // Validate the configuration values in every scope.
        const validate = (value: unknown) => this.args.validate(value) ? value : undefined;
        const defaultValue                 = validate(inspect.defaultValue);
        const globalValue                  = validate(inspect.globalValue);
        const workspaceValue               = validate(inspect.workspaceValue);
        const workspaceFolderValue         = validate(inspect.workspaceFolderValue);
        const defaultLanguageValue         = validate(inspect.defaultLanguageValue);
        const globalLanguageValue          = validate(inspect.globalLanguageValue);
        const workspaceLanguageValue       = validate(inspect.workspaceLanguageValue);
        const workspaceFolderLanguageValue = validate(inspect.workspaceFolderLanguageValue);
        
        return {
            defaultValue,
            globalValue,
            workspaceValue,
            workspaceFolderValue,
            defaultLanguageValue,
            globalLanguageValue,
            workspaceLanguageValue,
            workspaceFolderLanguageValue
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
 * The validated values of the configuration.
 */
export interface ValuesPartial<T> {

    /** 
     * The validated default value of the configuration. 
     */
    defaultValue: T | undefined;

    /** 
     * The validated global value of the configuration.
     */
    globalValue: T | undefined;

    /**
     * The validated workspace value of the configuration.
     */
    workspaceValue: T | undefined;

    /**
     * The validated workspace folder value of the configuration.
     */
    workspaceFolderValue: T | undefined;

    /** 
     * The validated language specific default value of the configuration.
     */
    defaultLanguageValue: T | undefined;

    /**
     * The validated language specific global value of the configuration.
     */
    globalLanguageValue: T | undefined;

    /**
     * The validated language specific workspace value of the configuration.
     */
    workspaceLanguageValue: T | undefined;

    /**
     * The validated language specific workspace folder value of the configuration.
     */
    workspaceFolderLanguageValue: T | undefined;

}

/**
 * The validated values of the configuration along with the transformed effective value.
 */
export interface Values<T, E> extends ValuesPartial<T> {

    /**
     * The transformed effective value.
     */
    effectiveValue: E;

}

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
