/** Error that is thrown if the configuration has a missing or invalid default value. */
export class ConfigurationBadDefaultError extends Error {
    public constructor(fullName: string) {
        super(`Invalid or missing default value: ${fullName} (Check the default value in the extension manifest)`);
        this.name = 'ConfigurationBadDefaultError';
    }
}

/** Error that is thrown if an empty configuration name is provided in the constructor. */
export class ConfigurationNameEmptyError extends Error {
    public constructor() {
        super(`Cannot create handle with empty configuration name.`);
        this.name = 'ConfigurationNameEmptyError';
    }
}