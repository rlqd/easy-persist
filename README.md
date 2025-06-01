# Easy-persist

Zero dependencies extensible storage library for Typescript.

Easy-persist is compatible with popular validation and caching libraries,
but not restricted to any specific option. Anything can be plugged in thanks to duck typing.

```
npm i easy-persist
```

## Contents

- [Using default storage](#using-default-storage)
- [Using multiple storages](#using-multiple-storages)
- [Configuration](#configuration)
- [Repositories](#repositories)

## Using default storage

Default storage serializes data using `JSON.stringify` and stores it in `data/default.json` file.

```typescript
import { persist, obtain } from 'easy-persist';

async function example() {
    await persist({text: 'Hello, World!'});
    const value = await obtain<{text: string}>();
    console.log(value?.text); // 'Hello, World!'
}
```

If file doesn't exist, `obtain` will return `undefined`.

### Data validation

There is no data validation by default, but it can be configured by passing a validator function.

Validator is simply a function, which accepts and returns the same type, and throws errors if anything is wrong.

Example using `zod` library:

```typescript
import { persist, obtain } from 'easy-persist';
import z from "zod";

const myStorageSchema = z.object({
    text: z.string(),
});
type MyStorage = z.infer<typeof myStorageSchema>;

async function example() {
    await persist<MyStorage>({ text: 'Hello, World!' });
    const value = await obtain(myStorageSchema.parse);
    console.log(value?.text);
}
```

## Using multiple storages

Any number of storages can be created.

In this example, data will be saved to file `data/animal.json`.

```typescript
import Persist from 'easy-persist';

interface Animal {
    type: 'cat' | 'dog';
    name: string;
}
const p = new Persist<Animal>('animal');

async function example() {
    await p.set({type: 'cat', name: 'Fluffy'});
    const animal = await p.get();
    console.log(animal?.name); // Fluffy
}
```

### Data validation

There is no data validation by default, but it can be configured (e.g. using `zod`).

By default data validation only applies to `get` method, but it can be configured for `set`, see [Configuration](#configuration).

```typescript
import Persist from 'easy-persist';
import z from "zod";

const animalSchema = z.object({
    type: z.union([z.literal('cat'), z.literal('dog')]),
    name: z.string(),
});
type Animal = z.infer<typeof animalSchema>;

// Generic type is inferred from the validator
const p = new Persist('animal', { validator: animalSchema.parse });

async function example() {
    await p.set({type: 'dog', name: 'Cookie'});
    const animal: Animal|undefined = await p.get();
    console.log(animal?.name); // Cookie
}
```

### Listing names

```typescript
import Persist from 'easy-persist';

const foo = new Persist<string>('foo');
const bar = new Persist<string>('bar');

async function example() {
    await foo.set('Hello');
    await bar.set('World');

    const names: string[] = await Persist.getDefaultFactory().listNames(); // or foo.getFactory().listNames()
    console.log(names); // ['foo', 'bar']
}
```

## Configuration 

Global defaults can be configured to use with both default storage and other storages.

Storage factory can be changed to affect how and where data is stored.

```typescript
import Persist, { persist } from 'easy-persist';
import { FileStorageFactory } from 'easy-persist/storage';

// Must be called before using default storage
Persist.setDefaults({
    // Set name for default storage
    defaultName: 'greetings',
    // Set file storage in current directory
    storageFactory: new FileStorageFactory('.'),
});

// Will be saved to './greetings.json'
persist({text: 'Hello, World!'})
    .then(() => console.log('Done!'));

```

### Separate storage configuration

Each storage can be configured separately as well.

```typescript
import Persist from 'easy-persist';
import { FileStorageFactory } from 'easy-persist/storage';

const animalSchema = z.object({
    type: z.union([z.literal('cat'), z.literal('dog')]),
    name: z.string(),
});

const customFactory = new FileStorageFactory('/opt/my-app-data');
const p = new Persist('animal', {
    validator: animalSchema.parse,
    storageFactory: customFactory,
    validateSet: true, // To validate value on "set" as well
});

// Will be saved to '/opt/my-app-data/animal.json'
p.set({type: 'cat', name: 'Fluffy'})
    .then(() => console.log('Done!'));

// Will fail when validateSet is true
p.set({something: 'else'} as any)
    .catch(() => console.error('Oh, no!'));

// Configured factory can be used directly to list instances with existing data
customFactory.listNames()
    .then(console.log) // ['animal']
```

## Repositories

Repository is a class built around the storage factory to easily manage multiple data items of the same type.

It accepts same config structure as Persist instances and respects default config to create underlying instances.

It operates with Records, which is implemented in an ActiveRecord-flavoured style.

Repositories can cache records in memory (in key,value pairs) if `cacheHandler` is provided in the config.

Record, which value is not persisted is in `ephemeral` state. Such records are evicted from cache automatically.

### Basic examples

```typescript
import Persist from 'easy-persist';

type MyType = {
    text: string;
    planet: string;
};
const repo = Persist.getRepo<MyType>(/* optionally, add config here */);

// This will automatically persist the value, unless repo.createEphemeral() is used instead
const record = await repo.create('repo-example', {text: 'Hello, World!', planet: 'Earth'});
console.log(record.value.text); // 'Hello, World!'

// New value can be set and persisted
await record.set({text: 'Hello, Universe!', planet: 'Mars'});
console.log(record.value.text); // 'Hello, Universe!'

// Object values can be partially updated
await record.update({planet: 'Jupiter'});
console.log(record.value); // {text: 'Hello, Universe!', planet: 'Jupiter'}

// Value is no longer persisted and exists only in the record instance
await record.delete();
console.log(record.ephemeral); // true

// Ephemeral record can be persisted again
await record.save();
console.log(record.ephemeral); // false
```

### Bring your own record class

It can be helpful to define custom logic in a record class.

```typescript
import { AbstractRecord } from "easy-persist/repository";

type ExampleValue = {
    exampleNumber: number,
    exampleString: string,
};

class ExampleRecord extends AbstractRecord<ExampleValue> {
    public async randomiseNumber(): Promise<void> {
        await this.update({
            exampleNumber: Math.floor(Math.random() * 10000),
        });
    }
}

const repo = Persist.getRepo({ recordClass: ExampleRecord });
const record = await repo.create('something', {
    exampleNumber: 42,
    exampleString: 'test',
});
await record.randomiseNumber();
console.log(record.value.exampleNumber); // will output a random number
```

### Cached Repository

All records can be preloaded in memory at once, which allows getting records and iterative over them synchronously.

```typescript
import Persist from 'easy-persist';

type TextMessage = {
    from: string;
    to: string;
    text: string;
};
const repo = await Persist.preloadRepo<TextMessage>();

// Get by name
const record = repo.get('message-123');

// Filter records by value using callback
const messagesFromBob = repo.filter(v => v.from == 'Bob');

// Find one record by value
const messageFromAlice = repo.find(v => v.to == 'Alice');

// Record creation is still asynchronous, as it will persist the new value
const newRecord = await repo.create('message-456', {
    from: 'Bob',
    to: 'Alice',
    text: 'Hello!',
});

// Or ephemeral record can be created
const newRecord2 = repo.createEphemeral('message-457', {
    from: 'Alice',
    to: 'Bob',
    text: 'Hey',
});
// It won't be discoverable, until it's saved
console.log(repo.get('message-457')); // undefined
await newRecord2.save();
console.log(repo.get('message-457')?.value?.text); // "Hey"
```
