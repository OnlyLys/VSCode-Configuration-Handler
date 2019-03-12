import { ConfigurationTarget, workspace, window, TextEditor } from 'vscode';
import { ConfigurationBadDefaultError, ConfigurationNotRecognizedError, ConfigurationNameEmptyError } from './errors';
import { Values, ValuesUnsafe } from './values';

/** 
 * A handler to an extension's configuration. 
 * 
 * This class is essentially a wrapper around the various `workspace` methods provided by the VS 
 * Code API to get and set configuration values. 
 * 
 * The key benefit of using this class is that there is typechecking to ensure that the values we get 
 * have the correct types. Furthermore, it cuts down on the verbosity when it comes to setting values.
 */
export class ConfigurationHandler<T> {

    /** 
     * Get the configuration value in the following scopes:
     * 
     * 1. **Default** (default value in extension manifest; will throw if typecheck fails)
     * 2. **Global** (value in the user's global 'User Settings' file)
     * 3. **Workspace** (value in the `.vscode/settings.json` file in a single workspace environment
     *    or the workspace global value in a multi-root workspace. For more info see: 
     *    https://code.visualstudio.com/docs/editor/multi-root-workspaces)
     * 4. **Workspace Folder** (value in the `.vscode/settings.json` file for a workspace within a 
     *    multi-root workspace, however not used in a single workspace environment)
     * 
     * Furthermore, the `effectiveValue` is also returned. This value is the value that is in effect
     * after all shadowing rules are considered. The heirarchy for shadowing is as follows:
     * 
     * * `workspaceFolderValue`
     * * `workspaceValue`
     * * `globalValue`
     * * `defaultValue`
     * 
     * Where higher values shadow the lower ones. These rules follow that of the VS Code API:
     * https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration
     * 
     * All values will be typechecked before being returned. Values which fail typecheck or are not 
     * present are returned as `undefined`. However, as mentioned above, the default value must be 
     * defined and pass typecheck, otherwise this method will throw.
     * 
     * @throws 
     *  1. `ConfigurationNotRecognizedError` if the editor does not recognize the configuraiton we are 
     *     trying to access. Please check that the correct `name` was provided in the constructor of
     *     this configuration handler.
     *  2. `ConfigurationBadDefaultError` if the configuration is missing a default value or fails
     *     typecheck.
     */
    public get(): Values<T>  {
        const {
            defaultValue,
            globalValue,
            workspaceValue,
            workspaceFolderValue
        } = this.getUnsafe();
        if (defaultValue === undefined) {
            throw new ConfigurationBadDefaultError(this.args.name);
        }
        // Since the default value is defined, we can confidently calculate the effective value 
        const effectiveValue = (() => { 
            if (workspaceFolderValue !== undefined) {
                return workspaceFolderValue;
            } else if (workspaceValue !== undefined) {
                return workspaceValue;
            } else if (globalValue !== undefined) {
                return globalValue;
            } else {
                return defaultValue;
            }
        })();
        return {
            defaultValue,
            globalValue,
            workspaceValue,
            workspaceFolderValue,
            effectiveValue
        };
    }

    /** 
     * Perform similar function as `get()` method with two differences:
     * 
     * 1. This method doesn't throw when the default value is `undefined`.
     * 2. As a result of (1), no effective value is returned as there is no guaranteed default value 
     *    to fallback to.
     *
     * For the above reasons, unless special need arises, `get()` is the method that you should be
     * using. 
     *
     * @throws `ConfigurationNotRecognizedError` if the editor does not recognize the configuration 
     *         we are trying to access. Please check that the correct `name` was provided in the 
     *         constructor of this configuration handler.
     */
    public getUnsafe(): ValuesUnsafe<T> {
        // Get the values of the configuration using VS Code's API
        const section = workspace.getConfiguration(this.sectionName);
        const inspect = section.inspect<any>(this.childName);
        // Throw if `inspect` is `undefined`, that means the editor does not recognize this configuration
        if (!inspect) {
            throw new ConfigurationNotRecognizedError(this.args.name);
        }
        // Typecheck the values
        const check = (value?: T) => this.args.typeCheck(value) ? value : undefined;
        const defaultValue         = check(inspect.defaultValue);
        const globalValue          = check(inspect.globalValue);
        const workspaceValue       = check(inspect.workspaceValue);
        const workspaceFolderValue = check(inspect.workspaceFolderValue);
        return {
            defaultValue,
            globalValue,
            workspaceValue,
            workspaceFolderValue
        };
    }

    /**
     * Set the value of the configuration globally. This value will be stored in the user's global 
     * 'User Settings' file. 
     * 
     * To disable it, set to `undefined`.
     * 
     * @return A promise that resolves when the update is complete.
     */
    public async setGlobalValue(value: T | undefined): Promise<void> {
        const section = workspace.getConfiguration(this.sectionName);
        return section.update(this.childName, value, ConfigurationTarget.Global);
    }

    /**
     * Set the value of the configuration in the current workspace in a single workspace environment,
     * or in the `.code_workspace` workspace global file in a multi-root workspace environment. 
     * 
     * To disable it, set to `undefined`.
     * 
     * @return A promise that resolves when the update is complete.
     * 
     * @throws If there is no workspace currently opened, VS Code will throw an error of unspecified
     *         type.
     */
    public async setWorkspaceValue(value: T | undefined): Promise<void> {
        const section = workspace.getConfiguration(this.sectionName);
        return section.update(this.childName, value, ConfigurationTarget.Workspace);
    }

    /**
     * Set the value of the configuration in the current workspace within a multi-root workspace 
     * environment.
     * 
     * To disable it, set to `undefined`.
     * 
     * @return A promise that resolves when the update is complete.
     * 
     * @throws If there is no workspace currently opened OR if we are not in a multi-root workspace
     *         environment, VS Code will throw an error of unspecified type.
     */
    public async setWorkspaceFolderValue(value: T | undefined): Promise<void> {
        const section = workspace.getConfiguration(this.sectionName, (window.activeTextEditor as TextEditor).document.uri);
        return section.update(this.childName, value, ConfigurationTarget.WorkspaceFolder);
    }

    /**
     * Name of the section that the configuration belongs in. We use the same definition as defined 
     * by the VS Code API's `workspace.getConfiguration()` method.
     * 
     * The `childName` follows it.
     */
    private readonly sectionName: string;
    
    /** 
     * The final 'part' of the configuration name, which is whatever follows the last period in the 
     * name.
     * 
     * The `sectionName` preceeds it.
     */
    private readonly childName: string;

    /** 
     * Register a handler to a configuration. 
     * 
     * @param name Full name of the configuration as defined in the extension manifest.
     * @param typeCheck Callback for type validation for each value of the configuration. 
     * 
     * @throws `ConfigurationNameEmptyError` if `name` is empty.
     */
    public constructor(private readonly args: {
        name:      string,
        typeCheck: (t: any) => t is T
    }) {
        if (args.name.length === 0) {
            throw new ConfigurationNameEmptyError();
        }
        // We need to split the name to make it easier to access the configuration
        const { sectionName, childName } = splitName(args.name);
        this.sectionName = sectionName;
        this.childName   = childName;
    }

}

/** 
 * Split a full configuration name into a section name and a child name. We use the same definition 
 * of 'section name' as VS Code does in `workspace.getConfiguration()`.
 * 
 * For instance, if our full configuration name is `a.b.c` then the split will yield a section name 
 * of `a.b` and a child name of `c`. 
 * 
 * If there is no `.` in the full configuration name then the section name will be empty while the 
 * child name will equal the full configuration name. This is equivalent to taking the configuration
 * of the entire editor as the section.
 */
function splitName(fullName: string): { sectionName: string, childName: string } {
    const lastPeriod = fullName.lastIndexOf('.');
    return {
        sectionName: fullName.slice(0, lastPeriod),
        childName:   fullName.slice(lastPeriod + 1)
    };
}
