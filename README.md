# Easy-persist

Simple but extensible storage library for Typescript.

```
npm i easy-persist
```

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
import { persist } from 'easy-persist';
import Persist, { FileStorageFactory } from 'easy-persist';

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
import Persist, { FileStorageFactory } from 'easy-persist';

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
