import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MemoryStorageFactory } from '../../src';

describe('MemoryStorage', () => {
    it('should handle basic scenario', async () => {
        const factory = new MemoryStorageFactory();

        const listBefore = await factory.listNames();
        assert.deepEqual(listBefore, []);

        const storage1 = factory.create('test1');
        await storage1.set('some data');
        assert.equal(await storage1.get(), 'some data');

        const storage2 = factory.create('test2');
        await storage2.set('more data');
        assert.equal(await storage2.get(), 'more data');

        const listAfter = await factory.listNames();
        assert.deepEqual(listAfter, ['test1', 'test2']);
    });

    it('should isolate data between instances', async () => {
        const factory1 = new MemoryStorageFactory();
        const factory2 = new MemoryStorageFactory();

        const storage1 = factory1.create('test1');
        await storage1.set('value 1');
        const storage2 = factory2.create('test2');
        await storage2.set('value 2');

        const storage1_2 = factory1.create('test2');
        await storage1_2.set('value 1_2');

        assert.deepEqual(await storage1.get(), 'value 1');
        assert.deepEqual(await storage2.get(), 'value 2');
        assert.deepEqual(await storage1_2.get(), 'value 1_2');

        assert.deepEqual(await factory1.listNames(), ['test1', 'test2']);
        assert.deepEqual(await factory2.listNames(), ['test2']);
    });
});
