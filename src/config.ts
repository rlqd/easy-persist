import type { AbstractStorageFactory } from "./storage/common";

export interface Config {
    storageFactory: AbstractStorageFactory,
    validateGet: boolean,
    validateSet: boolean,
    defaultName: string,
}

export interface InstanceConfig<T> extends Config {
    validator?: (value: unknown) => T,
    onChange?: (value: T|undefined) => void,
}
