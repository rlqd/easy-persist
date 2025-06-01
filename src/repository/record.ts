import assert from "assert";
import type Persist from "..";

export type AbstractRecordConstructor<T, R extends AbstractRecord<T>>
    = new (persist: Persist<T>, value: T, ephemeral: boolean) => R;

export abstract class AbstractRecord<T> {
    constructor(
        private persist: Persist<T>,
        private _value: T,
        private _ephemeral: boolean,
    ) {}

    public get name(): string {
        return this.persist.getName();
    }

    public get value(): T {
        return this._value;
    }

    public get ephemeral(): boolean {
        return this._ephemeral;
    }

    public async save(): Promise<void> {
        await this.persist.set(this.value);
        this._ephemeral = false;
    }

    public async delete(): Promise<void> {
        await this.persist.set(undefined);
        this._ephemeral = true;
    }

    public async set(newValue: T): Promise<void> {
        await this.persist.set(newValue);
        this._value = newValue;
    }

    public async reload(): Promise<void> {
        const newValue = await this.persist.get();
        if (typeof newValue === 'undefined') {
            this._ephemeral = true;
        } else {
            this._value = newValue;
            this._ephemeral = false;
        }
    }

    public async update(partial: Partial<T>): Promise<void> {
        assert(
            typeof this.value === 'object' && this.value !== null,
            'Can only update records, which value contain an object',
        );
        const newValue = {...this.value, ...partial};
        await this.set(newValue);
    }
}

export class GenericRecord<T> extends AbstractRecord<T> {}
