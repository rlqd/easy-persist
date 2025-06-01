import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';

import { FileStorageFactory } from '../../src/storage';

describe('FileStorage', () => {
    it('should handle basic scenario with defaults', async () => {
        const targetDir = 'data/' + randomUUID();
        const factory = new FileStorageFactory(targetDir);

        const listBefore = await factory.listNames();
        assert.deepEqual(listBefore, []);

        const storage1 = factory.create('test1');
        await storage1.set('some data');
        const fileContent = await fs.readFile(`${targetDir}/test1.json`, 'utf-8');
        assert.equal(fileContent, '"some data"');
        assert.equal(await storage1.get(), 'some data');

        const storage2 = factory.create('test2');
        await storage2.set('more data');
        assert.equal(await storage2.get(), 'more data');

        const listAfter = await factory.listNames();
        assert.deepEqual(listAfter, ['test1', 'test2']);
    });

    it('should use custom serialization and file extension', async () => {
        const factory = new FileStorageFactory('data', {
            serializer: value => Buffer.from([value]),
            deserializer: buf => buf.at(0),
            fileExtension: 'dat',
        });

        const storage = factory.create('custom-serialization');
        await storage.set(123);

        const fileContent = await fs.readFile(`data/custom-serialization.dat`);
        assert.equal(fileContent.at(0), 123);

        const value = await storage.get();
        assert.strictEqual(value, 123);
    });

    it('should use file prefix', async () => {
        const factory = new FileStorageFactory('data', {
            filePrefix: 'myprefix-',
        });

        const storage = factory.create('test1');
        await storage.set('Hello');

        const fileContent = await fs.readFile(`data/myprefix-test1.json`, 'utf-8');
        assert.equal(fileContent, '"Hello"');

        // This file shoudn't be in the list as it doesn't have the prefix
        await fs.writeFile('data/another-file.json', 'Bye');

        const names = await factory.listNames();
        assert.deepEqual(names, ['test1']);
    });

    it('should handle special characters in names', async () => {
        const targetDir = 'data/s1-' + randomUUID();
        const factory = new FileStorageFactory(targetDir);

        const storage = factory.create('special/name');
        await storage.set('some data');

        const fileContent = await fs.readFile(`${targetDir}/special%2Fname.json`, 'utf-8');
        assert.equal(fileContent, '"some data"');

        const names = await factory.listNames();
        assert.deepEqual(names, ['special/name']);
    });

    it('should use different filename handler', async () => {
        const targetDir = 'data/s2-' + randomUUID();
        const factory = new FileStorageFactory(targetDir, {
            fileNameHandler: 'base64url',
        });

        const storage = factory.create('special/name');
        await storage.set('some data');

        const fileContent = await fs.readFile(`${targetDir}/c3BlY2lhbC9uYW1l.json`, 'utf-8');
        assert.equal(fileContent, '"some data"');

        const names = await factory.listNames();
        assert.deepEqual(names, ['special/name']);
    });

    it('should use custom filename handler', async () => {
        const targetDir = 'data/s3-' + randomUUID();
        const factory = new FileStorageFactory(targetDir, {
            fileNameHandler: {
                encode: name => `${name}-custom`,
                decode: name => name.slice(0, -7),
            },
        });

        const storage = factory.create('something');
        await storage.set('some data');

        const fileContent = await fs.readFile(`${targetDir}/something-custom.json`, 'utf-8');
        assert.equal(fileContent, '"some data"');

        const names = await factory.listNames();
        assert.deepEqual(names, ['something']);
    });
});
