import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { LRUCache } from 'lru-cache';

import Persist from '../../src';
import { FileStorageFactory } from '../../src/storage';
import ExampleRecord from '../lib/example-record';

describe('Repository', () => {
    beforeEach(() => Persist.restoreBuiltInDefaults());

    it('saves and loads data to/from file', async () => {
        const repo = Persist.getRepo<{text:string}>();
        const rec = await repo.create('repo-example', {text: 'Hello, World!'});
        assert.deepEqual(rec.value, {text: 'Hello, World!'});

        const fileContent = await fs.readFile('data/repo-example.json', 'utf-8');
        assert.equal(fileContent, JSON.stringify({text: 'Hello, World!'}));

        const rec2 = await repo.get('repo-example');
        assert.deepEqual(rec2?.value, {text: 'Hello, World!'});
    });

    it('uses cache', async () => {
        const repo = Persist.getRepo<{text:string}>({
            cacheHandler: new Map(),
        });
        const rec = await repo.create('repo-example', {text: 'Hello, World!'});
        assert.deepEqual(rec.value, {text: 'Hello, World!'});

        const fileContent = await fs.readFile('data/repo-example.json', 'utf-8');
        assert.equal(fileContent, JSON.stringify({text: 'Hello, World!'}));

        const rec2 = await repo.get('repo-example');
        assert.strictEqual(rec2, rec); // must be same instance
    });

    it('compatible with lru-cache', async () => {
        const repo = Persist.getRepo<{text:string}>({
            cacheHandler: new LRUCache({max: 500}),
        });
        const rec = await repo.create('repo-example', {text: 'Hello, World!'});
        assert.deepEqual(rec.value, {text: 'Hello, World!'});

        const fileContent = await fs.readFile('data/repo-example.json', 'utf-8');
        assert.equal(fileContent, JSON.stringify({text: 'Hello, World!'}));

        const rec2 = await repo.get('repo-example');
        assert.strictEqual(rec2, rec); // must be same instance
    });

    it('obtains undefined when there is no data', async () => {
        const repo = Persist.getRepo<{text:string}>();
        const rec = await repo.get('non-existing-name');
        assert.strictEqual(rec, undefined);
    });

    it('fails when there is no data on getOrFail', async () => {
        const repo = Persist.getRepo<{text:string}>();
        try {
            await repo.getOrFail('non-existing-name');
            assert.equal(true, false, 'must not succeed');
        } catch (e: any) {
            assert.equal(e.message.includes("GenericRecord('non-existing-name') not found"), true);
        }
    });

    it('respects default config', async () => {
        const targetDir = 'data/' + randomUUID();
        Persist.setDefaults({
            storageFactory: new FileStorageFactory(targetDir),
        });

        const repo = Persist.getRepo<{greetings:string}>();
        await repo.create('hello', {greetings: 'Hola!'});

        const fileContent = await fs.readFile(`${targetDir}/hello.json`, 'utf-8');
        assert.equal(fileContent, JSON.stringify({greetings: 'Hola!'}));
    });

    it('respects provided config', async () => {
        const targetDir = 'data/' + randomUUID();
        const repo = Persist.getRepo<{greetings:string}>({
            storageFactory: new FileStorageFactory(targetDir),
        });
        await repo.create('hello', {greetings: 'Hola!'});

        const fileContent = await fs.readFile(`${targetDir}/hello.json`, 'utf-8');
        assert.equal(fileContent, JSON.stringify({greetings: 'Hola!'}));
    });

    it('calls external onChange handler', async () => {
        let changedValue;
        const repo = Persist.getRepo<{greetings:string}>({
            onChange: value => {
                changedValue = value;
            },
        });
        const rec = await repo.create('test-repo-onchange', {greetings: 'Hola!'});
        assert.deepStrictEqual(changedValue, {greetings: 'Hola!'});
        await rec.set({greetings: 'Hello!'});
        assert.deepStrictEqual(changedValue, {greetings: 'Hello!'});
        await rec.delete();
        assert.strictEqual(changedValue, undefined);
    });

    it('works with custom record class', async () => {
        const repo = Persist.getRepo({
            recordClass: ExampleRecord,
        });
        const rec = await repo.create('example-record', {
            exampleNumber: 42,
            exampleString: 'test',
        });
        assert.equal(rec.value.exampleNumber, 42);
        await rec.randomiseNumber();
        assert.notEqual(rec.value.exampleNumber, 42);
    });
});
