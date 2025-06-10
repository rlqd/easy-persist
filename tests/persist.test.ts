import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';

import Persist from '../src';
import { FileStorageFactory } from '../src/storage';

describe('Custom Persist Instances', () => {
    beforeEach(() => Persist.restoreBuiltInDefaults());

    it('saves and loads data to/from file', async () => {
        const p = new Persist<{text:string}>('custom-name');
        await p.set({text: 'Hello, World!'});

        const fileContent = await fs.readFile('data/custom-name.json', 'utf-8');
        assert.equal(fileContent, JSON.stringify({text: 'Hello, World!'}));

        const data = await p.get();
        assert.deepEqual(data, {text: 'Hello, World!'});
    });

    it('obtains undefined when there is no data', async () => {
        const p = new Persist<{text:string}>('non-existing-name');
        const data = await p.get();
        assert.strictEqual(data, undefined);
    });

    it('respects default config', async () => {
        const targetDir = 'data/' + randomUUID();
        Persist.setDefaults({
            storageFactory: new FileStorageFactory(targetDir),
        });

        const p = new Persist<{greetings:string}>('hello');
        await p.set({greetings: 'Hola!'});

        const fileContent = await fs.readFile(`${targetDir}/hello.json`, 'utf-8');
        assert.equal(fileContent, JSON.stringify({greetings: 'Hola!'}));

        const data = await p.get();
        assert.deepEqual(data, {greetings: 'Hola!'});
    });

    it('respects provided config', async () => {
        const targetDir = 'data/' + randomUUID();

        const p = new Persist<{greetings:string}>('hello', {
            storageFactory: new FileStorageFactory(targetDir),
        });
        await p.set({greetings: 'Hola!'});

        const fileContent = await fs.readFile(`${targetDir}/hello.json`, 'utf-8');
        assert.equal(fileContent, JSON.stringify({greetings: 'Hola!'}));

        const data = await p.get();
        assert.deepEqual(data, {greetings: 'Hola!'});
    });

    it('calls onChange handler', async () => {
        let changedValue;
        const p = new Persist<{greetings:string}>('test-onchange', {
            onChange: value => {
                changedValue = value;
            },
        });
        await p.set({greetings: 'Hola!'});
        assert.deepStrictEqual(changedValue, {greetings: 'Hola!'});
        await p.set(undefined);
        assert.strictEqual(changedValue, undefined);
    });

    it('applies the validator on get', async () => {
        const validator = (v: unknown) => {
            if (typeof v !== 'object' || v === null || !('beep' in v) || typeof v?.beep !== 'string') {
                throw new Error('Validation failed');
            }
            return v;
        };

        const p = new Persist('something', { validator });
        await p.set({beep: 'boop'});

        const data = await p.get();
        assert.equal(data?.beep, 'boop');

        // must not fail, because validator not applied on set by default
        await p.set({something: 'else'} as any);

        // but now we have malformed data in the file, which must not load
        await p.get()
            .then(() => assert.equal(true, false, 'must not succeed'))
            .catch(e => assert.equal(e?.message, 'Validation failed'));
    });

    it('applies the validator on set', async () => {
        const validator = (v: unknown) => {
            if (typeof v !== 'object' || v === null || !('beep' in v) || typeof v?.beep !== 'string') {
                throw new Error('Validation failed');
            }
            return v;
        };

        const p = new Persist('something', { validator, validateSet: true });
        await p.set({something: 'else'} as any)
            .then(() => assert.equal(true, false, 'must not succeed'))
            .catch(e => assert.equal(e?.message, 'Validation failed'));
    });
});
