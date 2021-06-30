export class NoEffectiveValueError extends Error {
    public constructor(msg: string) {
        super(msg);
        this.name = 'NoEffectiveValueError';
    }
}

export class ConfigurationNameEmptyError extends Error {
    public constructor(msg: string) {
        super(msg);
        this.name = 'ConfigurationNameEmptyError';
    }
}