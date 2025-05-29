import { AbstractStorage, AbstractStorageFactory } from ".";

/**
 * Doesn't persist and keeps everything in memory, which is separate per each factory.
 * Can be useful for testing.
 */
export class MemoryStorageFactory extends AbstractStorageFactory {
    private storage: Map<string, unknown> = new Map();

    public create(name: string): AbstractStorage {
        return new MemoryStorage(name, this.storage);
    }

    public async listNames(): Promise<string[]> {
        return Array.from(this.storage.keys());
    }
}

export class MemoryStorage extends AbstractStorage {
    constructor(
        private name: string,
        private storage: Map<string, unknown>,
    ) {
        super();
    }

    public async get(): Promise<unknown> {
        return this.storage.get(this.name);
    }

    public async set(value: unknown): Promise<void> {
        this.storage.set(this.name, value);
    }
}
