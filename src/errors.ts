export class NoGuaranteedEffectiveValueError extends Error {
    public constructor(msg: string) {
        super(msg);
        this.name = 'NoGuaranteedEffectiveValueError';
    }
}

export class ConfigurationNameEmptyError extends Error {
    public constructor(msg: string) {
        super(msg);
        this.name = 'ConfigurationNameEmptyError';
    }
}