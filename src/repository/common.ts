import Persist from "..";
import type { InstanceConfig } from "../config";
import type { AbstractRecord, AbstractRecordConstructor } from './record';

export type CacheHandler<T extends AbstractRecord<any>> = {
    get: (name: string) => T|undefined;
    entries: () => Iterable<[string, T]>;
} & (
    {
        set: (name: string, value: T|undefined) => void;
    } | {
        set: (name: string, value: T) => void;
        delete: (name: string) => void,
    }
);

export interface RepositoryConfig<T, R extends AbstractRecord<T>> extends InstanceConfig<T> {
    recordClass: AbstractRecordConstructor<T, R>;
    cacheHandler?: CacheHandler<R>;
}

export type RecordFilter<T> = (value: T, name: string) => boolean;

/** Common code for record management in repositories */
export class RecordContainer<T, R extends AbstractRecord<T>> {
    private record!: R;
    private persist: Persist<T>;

    constructor(
        private name: string,
        private config: RepositoryConfig<T, R>,
    ) {
        const instanceConfig = {...config};
        if (this.config.cacheHandler) {
            // Replace onChange handler if we need to manage cache
            instanceConfig.onChange = this.onChange.bind(this);
        }
        this.persist = new Persist(name, instanceConfig);
    }

    private onChange(value?: T) {
        // Move the record in and out of cache when it's persistent state changes
        if (this.config.cacheHandler) {
            if (typeof value === 'undefined') {
                if ('delete' in this.config.cacheHandler) {
                    this.config.cacheHandler.delete(this.name);
                } else {
                    this.config.cacheHandler?.set(this.name, undefined);
                }
            } else {
                this.config.cacheHandler?.set(this.name, this.record);
            }
        }

        // Call external handler if exists
        this.config.onChange && this.config.onChange(value);
    }

    public getPersist(): Persist<T> {
        return this.persist;
    }

    public getRecord(value: T, ephemeral: boolean): R {
        const record = new this.config.recordClass(this.persist, value, ephemeral);
        this.record = record;
        return record;
    }
}
