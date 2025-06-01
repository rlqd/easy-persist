import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { randomUUID } from 'node:crypto';

import { GenericRecord } from '../../src/repository/record';
import Persist from '../../src';

describe('Record', () => {
    beforeEach(() => Persist.restoreBuiltInDefaults());

    it('exposes property getters correctly', async () => {
        const p = new Persist<{text:string}>('record-test');
        const r = new GenericRecord(p, {text: 'Hi'}, true);
        assert.equal(r.name, 'record-test');
        assert.equal(r.ephemeral, true);
        assert.deepEqual(r.value, {text: 'Hi'});
    });

    it('can do CRUD operations', async () => {
        const name = randomUUID();
        const p = new Persist<{text:string}>(name);
        const r = new GenericRecord(p, {text: 'example'}, true);

        await r.save();
        assert.equal(r.ephemeral, false);
        assert.deepEqual(await p.get(), {text: 'example'});

        await r.set({text: 'something else'});
        assert.equal(r.ephemeral, false);
        assert.deepEqual(await p.get(), {text: 'something else'});

        await r.delete();
        assert.equal(r.ephemeral, true);
        assert.equal(await p.get(), undefined);
    });

    it('can reload to get external change', async () => {
        const name = randomUUID();
        const p = new Persist<{text:string}>(name);
        const r = new GenericRecord(p, {text: 'example'}, true);

        await p.set({text: 'hello'});
        await r.reload();
        assert.equal(r.ephemeral, false);
        assert.deepEqual(await p.get(), {text: 'hello'});
    });

    it('can partially update', async () => {
        const name = randomUUID();
        const p = new Persist<{text: string, number: number}>(name);
        const r = new GenericRecord(p, {text: 'example', number: 42}, true);
        await r.save();

        await r.update({number: 123});
        assert.deepEqual(r.value, {text: 'example', number: 123});
        assert.deepEqual(await p.get(), {text: 'example', number: 123});
    });
});
