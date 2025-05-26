
export interface StorageFactoryInterface {
    listNames(): Promise<string[]>;
}

export abstract class AbstractStorageFactory implements StorageFactoryInterface {
    public abstract create<T>(name: string): AbstractStorage<T>;
    public abstract listNames(): Promise<string[]>;
}

export abstract class AbstractStorage<T> {
    public abstract get(): Promise<T|undefined>;
    public abstract set(value: T|undefined): Promise<void>;
}
