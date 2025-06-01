import { RecordContainer } from './common';
import type { CacheHandler, RepositoryConfig, RecordFilter } from "./common";
import type { AbstractRecord } from "./record";

/**
 * Repository, that holds all persisted records in memory.
 * This allows getting them and iterative over them synchronously.
 */
export class CachedRepository<T, R extends AbstractRecord<T>> {
    private constructor(
        protected config: RepositoryConfig<T, R>,
        protected cache: CacheHandler<R> = config.cacheHandler!,
    ) {}

    public static async preload<T, R extends AbstractRecord<T>>(config: RepositoryConfig<T, R>): Promise<CachedRepository<T, R>> {
        const repoConfig = {...config};
        if (!repoConfig.cacheHandler) {
            repoConfig.cacheHandler = new Map();
        }
        const repo = new this(repoConfig);
        const names = await repoConfig.storageFactory.listNames();
        for (const name of names) {
            const container = new RecordContainer(name, repoConfig);
            const persist = container.getPersist();
            const value = await persist.get();
            if (typeof value !== 'undefined') {
                const record = container.getRecord(value, false);
                repo.cache.set(name, record);
            }
        }
        return repo;
    }

    public createEphemeral(name: string, value: T): R {
        const container = new RecordContainer(name, this.config);
        return container.getRecord(value, true);
    }

    public async create(name: string, value: T): Promise<R> {
        const record = this.createEphemeral(name, value);
        await record.save();
        return record;
    }

    public get(name: string): R|undefined {
        return this.cache.get(name);
    }

    public getOrFail(name: string): R {
        const record = this.get(name);
        if (!record) {
            throw new Error(`${this.config.recordClass.name}('${name}') not found`);
        }
        return record;
    }

    public entries() {
        return this.cache.entries();
    }

    public find(filter: RecordFilter<T>): R|undefined {
        for (const [name, record] of this.cache.entries()) {
            if (filter(record.value, name)) {
                return record;
            }
        }
    }

    public filter(filter: RecordFilter<T>): R[] {
        const result = [];
        for (const [name, record] of this.cache.entries()) {
            if (filter(record.value, name)) {
                result.push(record);
            }
        }
        return result;
    }
}
