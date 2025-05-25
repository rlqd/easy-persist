import type { AbstractStorage, AbstractStorageFactory } from "./storage";
import FileStorageFactory from "./storage/file-storage";

export interface Config {
    storageFactory: AbstractStorageFactory,
    validateGet: boolean,
    validateSet: boolean,
    defaultName: string,
}

export default class Persist<T> {
    private static defaultConfig: Config = {
        storageFactory: new FileStorageFactory('data'),
        validateGet: true,
        validateSet: false,
        defaultName: 'default',
    }

    public static setDefaults(config: Partial<Config>) {
        Persist.defaultConfig = {...Persist.defaultConfig, ...config};
    }

    private static defaultInstance?: Persist<any>;
    public static getDefaultInstance<T>(): Persist<T> {
        if (!Persist.defaultInstance) {
            Persist.defaultInstance = new Persist<T>(this.defaultConfig.defaultName);
        }
        return Persist.defaultInstance as Persist<T>;
    }

    private config: Config = Persist.defaultConfig;
    private storage: AbstractStorage<T>;

    constructor(
        name: string,
        private validator?: (value: T) => T,
        config: Partial<Config> = {},
    ) {
        this.config = {...this.config, ...config};
        this.storage = this.config.storageFactory.create(name);
    }

    public async get(): Promise<T|undefined> {
        const value = await this.storage.get();
        if (this.config.validateGet && this.validator && typeof value !== 'undefined') {
            return this.validator(value);
        }
        return value;
    }

    public async set(value?: T): Promise<void> {
        if (this.config.validateSet && this.validator && typeof value !== 'undefined') {
            value = this.validator(value);
        }
        return await this.storage.set(value);
    }
}

export async function persist<T>(value?: T): Promise<void> {
    return await Persist.getDefaultInstance<T>().set(value);
}

export async function obtain<T>(validator?: (value: T) => T): Promise<T|undefined> {
    const value = await Persist.getDefaultInstance<T>().get();
    if (validator && typeof value !== 'undefined') {
        return validator(value);
    }
    return value;
}
