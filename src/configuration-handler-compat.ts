import { ConfigurationHandler } from './configuration-handler';
import { ConfigurationBadDefaultError } from './errors';
import { ValuesCompat, ValuesCompatUnsafe } from './values';

/**
 * An extension of the `ConfigurationHandler` class to additionally handle a deprecated configuration.
 * 
 * The goal of this class is to handle the situations where a configuration is superseded by a new
 * one but we still want to read values of the deprecated one when values for it are present. 
 * 
 * This class also can help move values from the deprecated configuration over to the new one via the
 * `migrate()` method.
 * 
 * Furthermore, in the constructor of this class, a `normalize()` callback must be provided to convert 
 * values of the deprecated configuration to the new format. This callback is used when calculating 
 * the `effectiveValue` (so that whenever we get the effective value we get a definite type. The
 * `normalize()` callback is also used when migrating values via `migrate()`.
 * 
 * Much like setting values in the base class, the deprecated configuration can also be set by the 
 * various methods prefixed with `setDepr`.
 * 
 * Typechecking is done for both the new and deprecated configurations.
 */
export class ConfigurationHandlerCompat<T, D> extends ConfigurationHandler<T> {
    
    /** `ConfigurationHandler` pointing to the deprecated configuration. */
    private readonly handlerToDepr: ConfigurationHandler<D>;

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
     * For both the new configuration and the deprecated configuration. Values for the deprecated 
     * configuration are prefixed with `depr`. For instance, its global value is `deprGlobalValue`.
     * 
     * Furthermore, the `effectiveValue` is also returned. This value is calculated by merging the 
     * views of the new and deprecated configurations then applying shadowing rules. More specifically, 
     * the heirarchy for shadowing is as follows:
     * 
     * * `workspaceFolderValue`
     * * `deprWorkspaceFolderValue`
     * * `workspaceValue`
     * * `deprWorkspaceValue`
     * * `globalValue`
     * * `deprGlobalValue`
     * * `defaultValue`
     *
     * Where higher values shadow the lower ones. 
     * 
     * Notice that the default value of the deprecated configuration is not fallbacked on, as the 
     * deprecated configuration should not be in use when there are no user defined values for it.
     * 
     * All values will be typechecked before being returned. Values which fail typecheck or are not 
     * present are returned as `undefined`. However, just like in the base class, the default value 
     * of the new configuration be defined and pass typecheck, otherwise this method will throw.
     * 
     * @throws 
     *  1. `ConfigurationNotRecognizedError` if the editor does not recognize either configurations
     *     we are trying to access. Please check that the correct `name` and `deprName` were provided 
     *     in the constructor of this configuration handler.
     *  2. `ConfigurationBadDefaultError` if the new configuration is missing a default value or fails
     *     typecheck.
     */
    public get(): ValuesCompat<T, D> {
        const {
            defaultValue,
            globalValue,
            workspaceValue,
            workspaceFolderValue,
            deprDefaultValue,
            deprGlobalValue,
            deprWorkspaceValue,
            deprWorkspaceFolderValue
        } = this.getUnsafe();
        if (defaultValue === undefined) {
            throw new ConfigurationBadDefaultError(this.args2.name);
        }
        /* Since the default value of the new configuration is defined, we can confidently calculate
        the effective value. */
        const effectiveValue = (() => {
            if (workspaceFolderValue !== undefined) {
                return workspaceFolderValue;
            } else if (deprWorkspaceFolderValue !== undefined) {
                return this.args2.normalize(deprWorkspaceFolderValue);
            } else if (workspaceValue !== undefined) {
                return workspaceValue;
            } else if (deprWorkspaceValue !== undefined) {
                return this.args2.normalize(deprWorkspaceValue);
            } else if (globalValue !== undefined) {
                return globalValue;
            } else if (deprGlobalValue !== undefined) {
                return this.args2.normalize(deprGlobalValue);
            } else {
                return defaultValue;
            }
        })();
        return {
            defaultValue,
            globalValue,
            workspaceValue,
            workspaceFolderValue,
            deprDefaultValue,
            deprGlobalValue,
            deprWorkspaceValue,
            deprWorkspaceFolderValue,
            effectiveValue
        };
    }

    /** 
     * Perform similar function as `get()` method with two differences:
     * 
     * 1. The method doesn't throw when the default value of the new configuration is `undefined`.
     * 2. As a result of (1), no effective value is returned as there is no guaranteed default value 
     *    to fallback to.
     * 
     * For the above reasons, unless special need arises, `get()` is the method that you should be
     * using.
     * 
     * @throws `ConfigurationNotRecognizedError` if the editor does not recognize either configurations
     *         we are trying to access. Please check that the correct `name` and `deprName` were 
     *         provided in the constructor of this configuration handler.
     */
    public getUnsafe(): ValuesCompatUnsafe<T, D> {
        const {
            defaultValue,
            globalValue,
            workspaceValue,
            workspaceFolderValue
        } = super.getUnsafe();
        // Get the (pre-converted) values of the deprecated configuration from the delegated instance
        const {
            defaultValue:         deprDefaultValue,
            globalValue:          deprGlobalValue,
            workspaceValue:       deprWorkspaceValue,
            workspaceFolderValue: deprWorkspaceFolderValue
        } = this.handlerToDepr.getUnsafe();
        return {
            defaultValue,
            globalValue,
            workspaceValue,
            workspaceFolderValue,
            deprDefaultValue,
            deprGlobalValue,
            deprWorkspaceValue,
            deprWorkspaceFolderValue,
        };
    }

    /**
     * Set the value of the new configuration globally. This value will be stored in the user's global 
     * 'User Settings' file. 
     * 
     * To disable it, set to `undefined`.
     * 
     * @return A promise that resolves when the update is complete.
     */
    public async setGlobalValue(value: T | undefined): Promise<void> {
        return super.setGlobalValue(value);
    }

    /**
     * Set the value of the new configuration in the current workspace in a single workspace environment,
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
        return super.setWorkspaceValue(value);
    }

    /**
     * Set the value of the new configuration in the current workspace within a multi-root workspace 
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
        return super.setWorkspaceFolderValue(value);
    }

    /**
     * Set the value of the deprecated configuration globally. This value will be stored in the user's 
     * global 'User Settings' file. 
     * 
     * To disable it, set to `undefined`.
     * 
     * @return A promise that resolves when the update is complete.
     */
    public async setDeprGlobalValue(value: D | undefined): Promise<void> {
        return this.handlerToDepr.setGlobalValue(value);
    }

    /**
     * Set the value of the deprecated configuration in the current workspace in a single workspace 
     * environment, or in the `.code_workspace` workspace global file in a multi-root workspace 
     * environment. 
     * 
     * To disable it, set to `undefined`.
     * 
     * @return A promise that resolves when the update is complete.
     * 
     * @throws If there is no workspace currently opened, VS Code will throw an error of unspecified
     *         type.
     */
    public async setDeprWorkspaceValue(value: D | undefined): Promise<void> {
        return this.handlerToDepr.setWorkspaceValue(value);
    }

    /**
     * Set the value of the deprecated configuration in the current workspace within a multi-root 
     * workspace environment.
     * 
     * To disable it, set to `undefined`.
     * 
     * @return A promise that resolves when the update is complete.
     * 
     * @throws If there is no workspace currently opened OR if we are not in a multi-root workspace
     *         environment, VS Code will throw an error of unspecified type.
     */
    public async setDeprWorkspaceFolderValue(value: D | undefined): Promise<void> {
        return this.handlerToDepr.setWorkspaceFolderValue(value);
    }

    /**
     * Register a handler that simultaneously handles a new and deprecated configuration.
     * 
     * @param name Full name of the configuration as defined in the extension manifest.
     * @param typeCheck Callback for type validation for each value of the configuration. 
     * @param deprName Full name of the deprecated configuration as defined in the extension manifest.
     * @param deprTypeCheck Callback for type validation for each value of the deprecated configuration.
     * @param normalize Callback to normalize values of the deprecated configuration to the format of 
     *                  the new one when returning the `effectiveValue`. Furthermore, this callback
     *                  is used when migrating values from the deprecated configuration to the new one.
     * 
     * @throws `ConfigurationNameEmptyError` if either `name` or `deprName` is empty.
     */
    public constructor(private readonly args2: {
        name:          string,
        typeCheck:     (t: any) => t is T,
        deprName:      string,
        deprTypeCheck: (d: any) => d is D,
        normalize:     (d: D) => T
    }) {
        // The super class handles that of the new configuration
        super({
            name:      args2.name,
            typeCheck: args2.typeCheck
        });
        // We delegate the handling of the deprecated configuration to another `ConfigurationHandler`
        this.handlerToDepr = new ConfigurationHandler({
            name:      args2.deprName,
            typeCheck: args2.deprTypeCheck
        });
    }

    /**
     * Migrate the global, workspace or the workspace folder values of the deprecated configuration 
     * over to the new one, but only ones which pass type checking.
     * 
     * Each value that passes type checking will be converted to the new format on move, with the
     * conversion defined by the `normalize` callback provided in the constructor. After being moved, 
     * the value will be `undefined` in its former site.
     * 
     * @return A promise that resolves when the migration is complete.
     */
    public async migrate(): Promise<void> {
        // Get the (pre-normalized) values of the deprecated configuration from the delegated instance
        const {
            globalValue:          deprGlobalValuePre,
            workspaceValue:       deprWorkspaceValuePre,
            workspaceFolderValue: deprWorkspaceFolderValuePre
        } = this.handlerToDepr.getUnsafe();
        if (deprGlobalValuePre !== undefined) {
            await this.setGlobalValue(this.args2.normalize(deprGlobalValuePre));
            await this.setDeprGlobalValue(undefined);
        }
        if (deprWorkspaceValuePre !== undefined) {
            await this.setWorkspaceValue(this.args2.normalize(deprWorkspaceValuePre));
            await this.setDeprWorkspaceValue(undefined);
        }
        if (deprWorkspaceFolderValuePre !== undefined) {
            await this.setWorkspaceFolderValue(this.args2.normalize(deprWorkspaceFolderValuePre));
            await this.setDeprWorkspaceFolderValue(undefined);
        }
    }

    /** 
     * Check if there are user defined values for the deprecated configuration. 
     * 
     * More specifically, this function returns `true` if either one of the following is defined:
     * - deprGlobalValue
     * - deprWorkspaceValue
     * - deprWorkspaceFolderValue
     * 
     * @throws In the same circumstances as `get()`.
     */
    public hasUserDefinedDeprValues(): boolean {
        const { deprGlobalValue, deprWorkspaceValue, deprWorkspaceFolderValue } = this.get();
        return deprGlobalValue          !== undefined 
            || deprWorkspaceValue       !== undefined 
            || deprWorkspaceFolderValue !== undefined;
    }

} 

