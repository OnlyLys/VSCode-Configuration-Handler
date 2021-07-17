/**
 * The validated values of a configuration.
 */
export interface Inspect<T> {

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