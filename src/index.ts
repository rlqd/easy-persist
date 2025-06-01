import type { Config, InstanceConfig } from './config';
import type { AbstractStorage, StorageFactoryInterface } from "./storage/common";
import { FileStorageFactory } from "./storage/file-storage";
import { Repository } from './repository/repository';
import { CachedRepository } from './repository/cached-repository';
import type { RepositoryConfig } from './repository/common';
import { GenericRecord, type AbstractRecord, type AbstractRecordConstructor } from './repository/record';

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

    public static getRepo<T, R extends AbstractRecord<T> = GenericRecord<T>>(
        config: Partial<RepositoryConfig<T, R>> = {},
    ): Repository<T, R> {
        return new Repository<T, R>({
            ...this.defaultConfig,
            ...config,
            recordClass: config.recordClass ?? (GenericRecord as AbstractRecordConstructor<T,R>),
        });
    }

    public static async preloadRepo<T, R extends AbstractRecord<T> = GenericRecord<T>>(
        config: Partial<RepositoryConfig<T, R>> = {},
    ): Promise<CachedRepository<T, R>> {
        return await CachedRepository.preload({
            ...this.defaultConfig,
            ...config,
            recordClass: config.recordClass ?? (GenericRecord as AbstractRecordConstructor<T,R>),
        });
    }

    private config: InstanceConfig<T> = Persist.defaultConfig;
    private storage: AbstractStorage;

    constructor(
        private name: string,
        config: Partial<InstanceConfig<T>> = {},
    ) {
        this.config = {...this.config, ...config};
        this.storage = this.config.storageFactory.create(name);
    }

    public getFactory(): StorageFactoryInterface {
        return this.config.storageFactory;
    }

    public getName(): string {
        return this.name;
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
        await this.storage.set(value);
        this.config.onChange && this.config.onChange(value);
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
