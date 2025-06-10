import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import fs from 'node:fs/promises';

import Persist, { record } from '../src';
import { FileStorageFactory } from '../src/storage';

import * as yaml from 'yaml';
import z from 'zod';

describe('Custom integrations', () => {
    beforeEach(() => Persist.restoreBuiltInDefaults());

    it('can store data in yaml format', async () => {
        Persist.setDefaults({
            defaultName: 'app-config',
            storageFactory: new FileStorageFactory('data', {
                serializer: v => Buffer.from(yaml.stringify(v), 'utf-8'),
                deserializer: b => yaml.parse(b.toString('utf-8')),
                fileExtension: 'yml',
            }),
        });

        const appConfig = await record({
            foo: 'something',
            bar: 42,
        });
        await appConfig.save();
        const fileContent = await fs.readFile('data/app-config.yml', 'utf-8');
        assert.equal(fileContent, yaml.stringify({foo: 'something', bar: 42}));

        await appConfig.reload();
        assert.deepEqual(appConfig.value, {
            foo: 'something',
            bar: 42,
        });
    });

    it('works with zod as a validator', async () => {
        const schema = z.object({
            beep: z.string(),
        });

        const p = new Persist('something', { validator: schema.parse });
        await p.set({beep: 'boop'});

        const data = await p.get();
        assert.equal(data?.beep, 'boop');

        await fs.writeFile('data/something.json', JSON.stringify({something: 'else'}));

        // we have malformed data in the file, which must not load
        await p.get()
            .then(() => assert.equal(true, false, 'must not succeed'))
            .catch(e => assert.equal(e?.issues?.[0]?.code, 'invalid_type'));
    });
});