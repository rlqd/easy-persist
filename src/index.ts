import type { AbstractStorage, AbstractStorageFactory, StorageFactoryInterface } from "./storage";
import { FileStorageFactory } from "./storage/file-storage";

export interface Config {
    storageFactory: AbstractStorageFactory,
    validateGet: boolean,
    validateSet: boolean,
    defaultName: string,
}

export interface InstanceConfig<T> extends Config {
    validator?: (value: unknown) => T,
}

const builtInDefaults: Config = {
    storageFactory: new FileStorageFactory('data'),
    validateGet: true,
    validateSet: false,
    defaultName: 'default',
};

export default class Persist<T> {
    private static defaultConfig: Config = {...builtInDefaults};
    private static defaultInstance?: Persist<any>;

    public static setDefaults(config: Partial<Config>) {
        this.defaultConfig = {...this.defaultConfig, ...config};
        this.defaultInstance = undefined;
    }

    public static restoreBuiltInDefaults() {
        this.defaultConfig = {...builtInDefaults};
        this.defaultInstance = undefined;
    }

    public static getDefaultInstance<T>(): Persist<T> {
        if (!this.defaultInstance) {
            this.defaultInstance = new Persist<T>(this.defaultConfig.defaultName);
        }
        return this.defaultInstance as Persist<T>;
    }

    public static getDefaultFactory(): StorageFactoryInterface {
        return this.defaultConfig.storageFactory;
    }

    private config: InstanceConfig<T> = Persist.defaultConfig;
    private storage: AbstractStorage;

    constructor(
        name: string,
        config: Partial<InstanceConfig<T>> = {},
    ) {
        this.config = {...this.config, ...config};
        this.storage = this.config.storageFactory.create(name);
    }

    public getFactory(): StorageFactoryInterface {
        return this.config.storageFactory;
    }

    public async get(): Promise<T|undefined> {
        const value = await this.storage.get();
        if (typeof value === 'undefined') {
            return undefined;
        }
        if (this.config.validateGet && this.config.validator) {
            return this.config.validator(value as T);
        }
        return value as T;
    }

    public async set(value?: T): Promise<void> {
        if (this.config.validateSet && this.config.validator && typeof value !== 'undefined') {
            value = this.config.validator(value);
        }
        return await this.storage.set(value);
    }
}


// Default instance one-line helpers

export async function persist<T>(value?: T): Promise<void> {
    return await Persist.getDefaultInstance<T>().set(value);
}

export async function obtain<T>(validator?: (value: unknown) => T): Promise<T|undefined> {
    const value = await Persist.getDefaultInstance<T>().get();
    if (validator && typeof value !== 'undefined') {
        return validator(value);
    }
    return value;
}


// Built-in storage factories

export { FileStorageFactory } from "./storage/file-storage";
export { MemoryStorageFactory } from "./storage/memory-storage";
