import { ConfigurationHandler } from './configuration-handler';
import { ConfigurationBadDefaultError } from './errors';
import { ValuesCompat, ValuesCompatUnsafe } from './values';

/**
 * An extension of the `ConfigurationHandler` class to further handle a deprecated configuration.
 * 
 * The goal of this class is to handle situations where a configuration is superseded by a new one 
 * but we still want to read values of the deprecated one when values for it are present. 
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
     * Get the values in the following scopes for both the new and deprecated configurations:
     * 
     * 1. **Default** (default value in extension manifest; will throw if typecheck fails)
     * 2. **Global** (value in the user's global 'User Settings' file)
     * 3. **Workspace** (value in the `.vscode/settings.json` file in a single workspace environment
     *    or the workspace global value in a multi-root workspace. For more info see: 
     *    https://code.visualstudio.com/docs/editor/multi-root-workspaces)
     * 
     * **Note that as of VS Code 1.32, workspace folder scoped values are not yet supported for 
     * third party extensions so there's no support for it here.** 
     * 
     * Values for the deprecated configuration are prefixed with `depr`. For instance, the global
     * value of the deprecated configuration is `deprGlobalValue`.
     * 
     * Furthermore, the `effectiveValue` is also returned. This value is calculated by merging the 
     * views of the new and deprecated configurations then applying shadowing rules. More specifically, 
     * the heirarchy for shadowing is as follows:
     * 
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
     * of the new configuration must be defined and pass typecheck, otherwise this method will throw.
     * 
     * @throws `ConfigurationBadDefaultError` if the new configuration is missing a default value or 
     *         fails typecheck.
     */
    public get(): ValuesCompat<T, D> {
        const {
            defaultValue,
            globalValue,
            workspaceValue,
            deprDefaultValue,
            deprGlobalValue,
            deprWorkspaceValue,
        } = this.getUnsafe();
        if (defaultValue === undefined) {
            throw new ConfigurationBadDefaultError(this.args2.name);
        }
        /* Since the default value of the new configuration is defined, we can confidently calculate
        the effective value. */
        const effectiveValue = (() => {
            if (workspaceValue !== undefined) {
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
            deprDefaultValue,
            deprGlobalValue,
            deprWorkspaceValue,
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
     */
    public getUnsafe(): ValuesCompatUnsafe<T, D> {
        const {
            defaultValue,
            globalValue,
            workspaceValue,
        } = super.getUnsafe();
        // Get the (pre-converted) values of the deprecated configuration from the delegated instance
        const {
            defaultValue:         deprDefaultValue,
            globalValue:          deprGlobalValue,
            workspaceValue:       deprWorkspaceValue,
        } = this.handlerToDepr.getUnsafe();
        return {
            defaultValue,
            globalValue,
            workspaceValue,
            deprDefaultValue,
            deprGlobalValue,
            deprWorkspaceValue,
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
     * Register a handler that simultaneously handles a new and deprecated configuration.
     * 
     * @param name Full name of the configuration as defined in the extension manifest.
     * @param typecheck Callback for type validation for each value of the configuration. 
     * @param deprName Full name of the deprecated configuration as defined in the extension manifest.
     * @param deprTypecheck Callback for type validation for each value of the deprecated configuration.
     * @param normalize Callback to normalize values of the deprecated configuration to the format of 
     *                  the new one when returning the `effectiveValue`. Furthermore, this callback
     *                  is used when migrating values from the deprecated configuration to the new one.
     * 
     * @throws `ConfigurationNameEmptyError` if either `name` or `deprName` is empty.
     */
    public constructor(private readonly args2: {
        name:          string,
        typecheck:     (t: any) => t is T,
        deprName:      string,
        deprTypecheck: (d: any) => d is D,
        normalize:     (d: D) => T
    }) {
        // The super class handles that of the new configuration
        super({
            name:      args2.name,
            typecheck: args2.typecheck
        });
        // We delegate the handling of the deprecated configuration to another `ConfigurationHandler`
        this.handlerToDepr = new ConfigurationHandler({
            name:      args2.deprName,
            typecheck: args2.deprTypecheck
        });
    }

    /** 
     * Check if there are user defined values for the deprecated configuration. 
     * 
     * More specifically, this function returns `true` if either one of the following is defined:
     * - deprGlobalValue
     * - deprWorkspaceValue
     * 
     * @throws In the same circumstances as `get()`.
     */
    public hasUserDefinedDeprValues(): boolean {
        const { deprGlobalValue, deprWorkspaceValue } = this.get();
        return deprGlobalValue !== undefined  || deprWorkspaceValue !== undefined;
    }

} 

