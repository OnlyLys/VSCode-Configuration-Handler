import { workspace, ConfigurationScope } from 'vscode';
import { ConfigurationNameEmptyError, NoGuaranteedEffectiveValueError } from './errors';
import { Values, ValuesInternal, EffectiveScope } from './values';

/** 
 * Configuration reader that validates values before yielding them.
 * 
 * The vscode api provides methods to obtain configuration values for an extension, however the 
 * values obtained are not validated (i.e. it was not checked to have the correct expected form). 
 * This class aims to solve that problem. 
 */
export class VCReader<T> {

    /** 
     * Get the following validated configuration values:
     * 
     * 1. Default                         (`defaultValue`)
     * 2. Global                          (`globalValue`)
     * 3. Workspace                       (`workspaceValue`) 
     * 4. Workspace Folder                (`workspaceFolderValue`)
     * 5. **(⚠️ Untested)** Language Based Default (`defaultLanguageValue`) 
     * 6. Language Based Global           (`globalLanguageValue`) 
     * 7. Language Based Workspace        (`workspaceLanguageValue`)
     * 8. Language Based Workspace Folder (`workspaceFolderLanguageValue`)
     * 
     * The meaning of each value is explained here: 
     * https://code.visualstudio.com/docs/getstarted/settings
     * 
     * *Note on 'Language Based Default' value:* because vscode doesn't allow third party extensions 
     * to set language based default configuration values (it seems only vscode itself can do so for
     * its first party configurations), there is currently no way to test that `defaultLanguageValue` 
     * is 100% correct.
     * 
     * All values will be validated once obtained from the editor. Values which fail validation or 
     * are missing are returned as `undefined` and do not participate in shadowing. 
     * 
     * Along with the various configuration values listed above, the `effectiveValue` is also 
     * returned. The effective value is the value that is in effect after shadowing is applied. In 
     * other words, the effective value is the last in the list above that both exists and is valid. 
     * This is consistent with the shadowing applied by vscode's extension API:
     * https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration
     *
     * The effective value is guaranteed to be a valid value. Otherwise an error will be thrown.
     * 
     * @param scope The `scope` parameter of this method determines where the configurations will be 
     *              obtained from. For instance, in a multi-root workspace, providing a `scope` 
     *              argument to the workspace 'X' will yield the configurations of workspace 'X', 
     *              but not that of workspace 'Y'. Or for instance, providing a `scope` argument to
     *              the currently active text editor's document will provide the configuration of 
     *              the text document that is currently being edited, this includes the settings of
     *              the workspace it is in, the global settings and the settings of the language of 
     *              the text document etc.
     * 
     *              For more information see: 
     *              https://code.visualstudio.com/api/references/vscode-api#ConfigurationScope
     * 
     *              And furthermore see the `getConfiguration` method of:
     *              https://code.visualstudio.com/api/references/vscode-api#workspace
     * 
     *              If no `scope` value is provided, `scope` will default to `undefined`, which 
     *              usually yields the current workspace's configuration in a single workspace 
     *              environment, or yields the root workspace's configuration in a multi-root 
     *              workspace. However the exact behavior has yet to be clarified by vscode's 
     *              extension API at least as of 1.42.1.
     * 
     * @throws Will throw a `NoGuaranteedEffectiveValue` error if an effective value can't be found. 
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

    /** **For internal use only.** */
    public _read(scope: ConfigurationScope | undefined): ValuesInternal<T> {
        const inspect = workspace.getConfiguration(this.section, scope).inspect<unknown>(this.child);
        // I have yet to encounter circumstances that cause `inspect` to be `undefined`. However I 
        // I will still throw a generic error here if it ever happens.
        if (!inspect) {
            throw new Error(`Unexpected error: Inspecting ${this.args.name} yields 'undefined'.`);
        }
        const validate = (value: unknown) => this.args.validate(value) ? value : undefined;
        const defaultValue                 = validate(inspect.defaultValue);
        const globalValue                  = validate(inspect.globalValue);
        const workspaceValue               = validate(inspect.workspaceValue);
        const workspaceFolderValue         = validate(inspect.workspaceFolderValue);
        const defaultLanguageValue         = validate(inspect.defaultLanguageValue);
        const globalLanguageValue          = validate(inspect.globalLanguageValue);
        const workspaceLanguageValue       = validate(inspect.workspaceLanguageValue);
        const workspaceFolderLanguageValue = validate(inspect.workspaceFolderLanguageValue);
        let effectiveValue: T | undefined;
        let effectiveScope: EffectiveScope;
        // Calculate the effective value and scope by applying shadowing rules.
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
     * Name of the section that the configuration belongs in. We use the same definition as defined 
     * by the VS Code API's `workspace.getConfiguration()` method.
     * 
     * The `child` name follows it.
     */
    private readonly section: string;
    
    /** 
     * The final 'part' of the configuration name, which is whatever follows the last period in the 
     * name.
     * 
     * The `section` name preceeds it.
     */
    private readonly child: string;

    /** 
     * Register a configuration reader that validates values.
     * 
     * @param name Full name of the configuration as defined in the extension manifest. This name
     *             will subsequently be broken down into two portions, the section name and the
     *             child name.
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
 * For instance, if our full configuration name is `a.b.c` then the split will yield a 
 * section name of `a.b` and a child name of `c`. 
 * 
 * If there is no `.` in the full configuration name then the section name will be empty 
 * while the child name will equal the full configuration name. 
 */
export function splitName(name: string): { section: string, child: string } {
    const lastPeriodIndex = name.lastIndexOf('.');
    return {
        section: name.slice(0, lastPeriodIndex),
        child:   name.slice(lastPeriodIndex + 1)
    };
}