import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import z from 'zod';

import Persist, { persist, obtain } from '../src';
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

    it('applies the validator', async () => {
        await persist({beep: 'boop'});

        const validator = (v: unknown) => {
            if (typeof v !== 'object' || v === null || !('beep' in v) || typeof v?.beep !== 'string') {
                throw new Error('Validation failed');
            }
            return v;
        };

        const data = await obtain(validator);
        assert.equal(data?.beep, 'boop');

        await persist({something: 'else'});
        await obtain(validator)
            .then(() => assert.equal(true, false, 'must not succeed'))
            .catch(e => assert.equal(e?.message, 'Validation failed'));
    });

    it('works with zod as a validator', async () => {
        await persist({beep: 'boop'});

        const schema = z.object({
            beep: z.string(),
        });

        const data = await obtain(schema.parse)
        assert.equal(data?.beep, 'boop');

        await persist({something: 'else'});
        await obtain(schema.parse)
            .then(() => assert.equal(true, false, 'must not succeed'))
            .catch(e => assert.equal(e?.issues?.[0]?.code, 'invalid_type'));
    });
});
