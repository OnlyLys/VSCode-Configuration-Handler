import { workspace, ConfigurationScope } from 'vscode';
import { ConfigurationNameEmptyError, NoGuaranteedEffectiveValueError } from './errors';
import { Values, ValuesInternal, EffectiveScope } from './values';

/** 
 * Configuration reader that validates values before yielding them.
 * 
 * This class exists because the vscode api provides methods to read configuration values, but the 
 * values obtained will not have been validated by vscode. Thus we often have to manually validate 
 * configuration values obtained from vscode by checking that their types are correct, that they 
 * have the correct constraints etc. This class aims to make all of that easier by providing a 
 * simpler API to read configuration values.
 */
export class VCReader<T> {

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
    public read(scope?: ConfigurationScope): Values<T> {
        const _values = this._read(scope);
        if (_values.effectiveValue === undefined) {
            throw new NoGuaranteedEffectiveValueError(
                `Unable to obtain a guaranteed effective value for ${this.args.name}`
            );
        }
        return _values as Values<T>;
    }

    /** @internal */
    public _read(scope: ConfigurationScope | undefined): ValuesInternal<T> {
        const inspect = workspace.getConfiguration(this.section, scope).inspect<unknown>(this.child);

        // I have yet to encounter circumstances that cause `inspect` to be `undefined`. But better
        // to be safe than sorry and do this check.
        if (!inspect) {
            throw new Error(`Unexpected error: Inspecting ${this.args.name} yields 'undefined'.`);
        }

        // Validate the configuration values.
        const validate = (value: unknown) => this.args.validate(value) ? value : undefined;
        const defaultValue                 = validate(inspect.defaultValue);
        const globalValue                  = validate(inspect.globalValue);
        const workspaceValue               = validate(inspect.workspaceValue);
        const workspaceFolderValue         = validate(inspect.workspaceFolderValue);
        const defaultLanguageValue         = validate(inspect.defaultLanguageValue);
        const globalLanguageValue          = validate(inspect.globalLanguageValue);
        const workspaceLanguageValue       = validate(inspect.workspaceLanguageValue);
        const workspaceFolderLanguageValue = validate(inspect.workspaceFolderLanguageValue);
        
        // Calculate the effective value and scope by applying shadowing rules.
        let effectiveValue: T | undefined;
        let effectiveScope: EffectiveScope;
        if (workspaceFolderLanguageValue !== undefined) {
            effectiveValue = workspaceFolderLanguageValue;
            effectiveScope = EffectiveScope.WORKSPACE_FOLDER_LANGUAGE;
        } else if (workspaceLanguageValue !== undefined) {
            effectiveValue = workspaceLanguageValue;
            effectiveScope = EffectiveScope.WORKSPACE_LANGUAGE;
        } else if (globalLanguageValue !== undefined) {
            effectiveValue = globalLanguageValue;
            effectiveScope = EffectiveScope.GLOBAL_LANGAUGE;
        } else if (defaultLanguageValue !== undefined) {
            effectiveValue = defaultLanguageValue;
            effectiveScope = EffectiveScope.DEFAULT_LANGUAGE;
        } else if (workspaceFolderValue !== undefined) {
            effectiveValue = workspaceFolderValue;
            effectiveScope = EffectiveScope.WORKSPACE_FOLDER;
        } else if (workspaceValue !== undefined) {
            effectiveValue = workspaceValue;
            effectiveScope = EffectiveScope.WORKSPACE;
        } else if (globalValue !== undefined) {
            effectiveValue = globalValue;
            effectiveScope = EffectiveScope.GLOBAL;
        } else if (defaultValue !== undefined) {
            effectiveValue = defaultValue;
            effectiveScope = EffectiveScope.DEFAULT;
        } else {
            effectiveValue = undefined;
            effectiveScope = EffectiveScope.NONE;
        }
        
        return {
            defaultValue,
            globalValue,
            workspaceValue,
            workspaceFolderValue,
            defaultLanguageValue,
            globalLanguageValue,
            workspaceLanguageValue,
            workspaceFolderLanguageValue,
            effectiveValue,
            effectiveScope
        };
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
     * @param name Full name of the configuration.
     * @param validate Callback used to validate values of the configuration. 
     * 
     * @throws `ConfigurationNameEmptyError` if `name` is empty.
     */
    public constructor(private readonly args: {
        name: string,
        validate: (t: unknown) => t is T
    }) {
        if (args.name.trim().length === 0) {
            throw new ConfigurationNameEmptyError(
                `Must specify a non-empty name when intiailizing a reader`
            );
        }
        const { section, child } = splitName(args.name);
        this.section = section;
        this.child   = child;
    }

}

/**
 * Split a full configuration name into a section name and a child name. 
 * 
 * For instance, if our full configuration name is `a.b.c` then the split will yield a section name 
 * of `a.b` and a child name of `c`. 
 * 
 * If there is no `.` in the full configuration name then the section name will be empty while the 
 * child name will equal the full configuration name. 
 */
export function splitName(name: string): { section: string, child: string } {
    const lastPeriodIndex = name.lastIndexOf('.');
    return {
        section: name.slice(0, lastPeriodIndex),
        child:   name.slice(lastPeriodIndex + 1)
    };
}