export interface Values<T> {
    defaultValue:                          T | undefined;
    globalValue:                           T | undefined;
    workspaceValue:                        T | undefined;
    workspaceFolderValue:                  T | undefined;
    defaultLanguageValue:                  T | undefined;
    globalLanguageValue:                   T | undefined;
    workspaceLanguageValue:                T | undefined;
    workspaceFolderLanguageValue:          T | undefined;
    effectiveValue:                        T | undefined;
    readonly guaranteedEffectiveValue:     T;
}

export interface ValuesWithEffectiveScope<T> extends Values<T> {
    effectiveScope: EffectiveScope;
}

export interface ValuesCompat<T, D> extends Values<T> {
    deprDefaultValue:                 D | undefined;
    deprGlobalValue:                  D | undefined;
    deprWorkspaceValue:               D | undefined;
    deprWorkspaceFolderValue:         D | undefined;
    deprDefaultLanguageValue:         D | undefined;
    deprGlobalLanguageValue:          D | undefined;
    deprWorkspaceLanguageValue:       D | undefined;
    deprWorkspaceFolderLanguageValue: D | undefined;
}

/** Constants representing which scope the effective value of a configuration comes from. */
export enum EffectiveScope {
    NONE                      = 0,
    DEFAULT                   = 1,
    GLOBAL                    = 2,
    WORKSPACE                 = 3,
    WORKSPACE_FOLDER          = 4,
    DEFAULT_LANGUAGE          = 5,
    GLOBAL_LANGAUGE           = 6,
    WORKSPACE_LANGUAGE        = 7,
    WORKSPACE_FOLDER_LANGUAGE = 8,
};
