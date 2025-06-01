import { RecordContainer, type RepositoryConfig } from "./common";
import type { AbstractRecord } from "./record";

export class Repository<T, R extends AbstractRecord<T>> {
    constructor(
        protected config: RepositoryConfig<T, R>,
    ) {}

    public createEphemeral(name: string, value: T): R {
        const container = new RecordContainer(name, this.config);
        return container.getRecord(value, true);
    }

    public async create(name: string, value: T): Promise<R> {
        const record = this.createEphemeral(name, value);
        await record.save();
        return record;
    }

    public async get(name: string): Promise<R|undefined>;
    public async get(name: string, defaultValue: T, keepDefaultEphemeral: boolean): Promise<R>;
    public async get(name: string, defaultValue?: T, keepDefaultEphemeral: boolean = false): Promise<R|undefined> {
        const cached = this.config.cacheHandler?.get(name);
        if (cached) {
            return cached;
        }
        const container = new RecordContainer(name, this.config);
        const persist = container.getPersist();
        const value = await persist.get();
        if (typeof value !== 'undefined') {
            return container.getRecord(value, false);
        }
        if (typeof defaultValue !== 'undefined') {
            const record = container.getRecord(defaultValue, true);
            if (!keepDefaultEphemeral) {
                await record.save();
            }
            return record;
        }
    }

    public async getOrFail(name: string): Promise<R> {
        const record = await this.get(name);
        if (!record) {
            throw new Error(`${this.config.recordClass.name}('${name}') not found`);
        }
        return record;
    }
}
