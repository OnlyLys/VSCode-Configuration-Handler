export class NoGuaranteedEffectiveValueError extends Error {
    public constructor(fullName: string) {
        super(`Unable to obtain a guaranteed effective value for ${fullName}.`);
        this.name = 'NoGuaranteedEffectiveValueError';
    }
}

export class ConfigurationNameEmptyError extends Error {
    public constructor() {
        super('Cannot create `VCReader` with empty configuration name.');
        this.name = 'ConfigurationNameEmptyError';
    }
}