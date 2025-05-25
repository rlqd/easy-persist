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
import { z } from "zod/v4";

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
import { persist, obtain } from 'easy-persist';
import { z } from "zod/v4";

const animalSchema = z.object({
    type: z.union([z.literal('cat'), z.literal('dog')]),
    name: z.string(),
});
type Animal = z.infer<typeof animalSchema>;

// Generic type is inferred from the validator
const p = new Persist('animal', animalSchema.parse);

async function example() {
    await p.set({type: 'dog', name: 'Cookie'});
    const animal: Animal|undefined = await p.get();
    console.log(animal?.name); // Cookie
}
```

## Configuration 

Global defaults can be configured to use with both default storage and other storages.

Storage factory can be changed to affect how and where data is stored.

```typescript
import { persist } from 'easy-persist';
import Persist from 'easy-persist';
import FileStorageFactory from 'easy-persist/storage/file-storage';

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
import FileStorageFactory from 'easy-persist/storage/file-storage';

const animalSchema = z.object({
    type: z.union([z.literal('cat'), z.literal('dog')]),
    name: z.string(),
});

const Persist = new Persist('animal', animalSchema.parse, {
    storageFactory: new FileStorageFactory('/opt/my-app-data'),
    validateSet: true, // To validate value on "set" as well
});

// Will be saved to '/opt/my-app-data/animal.json'
p.set({type: 'cat', name: 'Fluffy'})
    .then(() => console.log('Done!'));

// Will fail when vlidateSet is true
p.set({something: 'else'} as any)
    .catch(() => console.error('Oh, no!'));

```
