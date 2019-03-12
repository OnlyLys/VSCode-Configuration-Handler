/* This file contains type aliases for structs that contain the return values from the configuration
handler `get()` and `getUnsafe()` methods. */

export interface Values<T> {
    defaultValue:         T;
    globalValue:          T | undefined;
    workspaceValue:       T | undefined;
    effectiveValue:       T;
}

export interface ValuesUnsafe<T> {
    defaultValue:         T | undefined;
    globalValue:          T | undefined;
    workspaceValue:       T | undefined;
}

export interface ValuesCompat<T, D> extends Values<T> {
    defaultValue:             T;
    globalValue:              T | undefined;
    workspaceValue:           T | undefined;
    deprDefaultValue:         D | undefined;
    deprGlobalValue:          D | undefined;
    deprWorkspaceValue:       D | undefined;
    effectiveValue:           T;
}

export interface ValuesCompatUnsafe<T, D> extends ValuesUnsafe<T> {
    defaultValue:             T | undefined;
    globalValue:              T | undefined;
    workspaceValue:           T | undefined;
    deprDefaultValue:         D | undefined;
    deprGlobalValue:          D | undefined;
    deprWorkspaceValue:       D | undefined;
}
