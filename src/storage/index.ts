
export abstract class AbstractStorageFactory {
    public abstract create<T>(entityName: string): AbstractStorage<T>;
}

export abstract class AbstractStorage<T> {
    public abstract get(): Promise<T|undefined>;
    public abstract set(value: T|undefined): Promise<void>;
}
