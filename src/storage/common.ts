
export interface StorageFactoryInterface {
    listNames(): Promise<string[]>;
}

export abstract class AbstractStorageFactory implements StorageFactoryInterface {
    public abstract create(name: string): AbstractStorage;
    public abstract listNames(): Promise<string[]>;
}

export abstract class AbstractStorage {
    public abstract get(): Promise<unknown>;
    public abstract set(value: unknown): Promise<void>;
}
