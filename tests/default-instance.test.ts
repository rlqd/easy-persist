import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';

import Persist, { persist, obtain, record } from '../src';
import { FileStorageFactory } from '../src/storage';

describe('Default Persist Instance', () => {
    beforeEach(() => Persist.restoreBuiltInDefaults());

    it('saves and loads data to/from file', async () => {
        await persist({text: 'Hello, World!'});

        const fileContent = await fs.readFile('data/default.json', 'utf-8');
        assert.equal(fileContent, JSON.stringify({text: 'Hello, World!'}));

        const data = await obtain<{text:string}>();
        assert.deepEqual(data, {text: 'Hello, World!'});
    });

    it('obtains undefined when there is no data', async () => {
        await fs.unlink('data/default.json')
            .catch(e => assert.equal(e?.code, 'ENOENT', 'Failed to clean up existing file'));

        const data = await obtain();
        assert.strictEqual(data, undefined);
    });

    it('respects default config', async () => {
        const targetDir = 'data/' + randomUUID();
        Persist.setDefaults({
            storageFactory: new FileStorageFactory(targetDir),
            defaultName: 'hello',
        });

        await persist({greetings: 'Hola!'});

        const fileContent = await fs.readFile(`${targetDir}/hello.json`, 'utf-8');
        assert.equal(fileContent, JSON.stringify({greetings: 'Hola!'}));

        const data = await obtain<{greetings:string}>();
        assert.deepEqual(data, {greetings: 'Hola!'});
    });

    it('returns undefined record when there is no data', async () => {
        Persist.setDefaults({
            defaultName: 'not-existing-record',
        });

        const rec = await record<{text: string}>();
        assert.strictEqual(rec, undefined);
    });

    it('returns record with default value when there is no data', async () => {
        Persist.setDefaults({
            defaultName: 'not-existing-record',
        });

        const rec = await record({text: 'Hello, World!'});
        assert.notEqual(typeof rec, 'undefined');
        assert.equal(rec.value.text, 'Hello, World!');
        assert.equal(rec.ephemeral, true);
    });

    it('returns record with existing data', async () => {
        Persist.setDefaults({
            defaultName: 'some-record',
        });
        await persist({text: 'Bye!'});

        const rec = await record({text: 'Hello, World!'});
        assert.notEqual(typeof rec, 'undefined');
        assert.equal(rec.value.text, 'Bye!');
        assert.equal(rec.ephemeral, false);
    });
});
