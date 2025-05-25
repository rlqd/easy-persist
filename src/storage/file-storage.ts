import * as path from 'path';
import * as fs from 'fs/promises';
import { AbstractStorage, AbstractStorageFactory } from ".";

export default class FileStorageFactory extends AbstractStorageFactory {
    constructor(
        private baseDir: string,
        private fileExtension: string = 'json',
        private serializer: (value: any) => string = JSON.stringify,
        private deserializer: (value: string) => any = JSON.parse,
        private fileEncoding: BufferEncoding = 'utf-8',
    ) {
        super();
    }

    public create<T>(name: string): AbstractStorage<T> {
        const filePath = path.join(this.baseDir, name + '.' + this.fileExtension);
        return new FileStorage<T>(
            filePath,
            this.serializer,
            this.deserializer,
            this.fileEncoding,
        );
    }
}

function isErrorCode(e: unknown, code: string) {
    return e && typeof e === 'object' && 'code' in e && e.code === code;
}

export class FileStorage<T> extends AbstractStorage<T> {
    private dirCreated: boolean = false;

    constructor(
        private filePath: string,
        private serializer: (value: any) => string,
        private deserializer: (value: string) => any,
        private fileEncoding: BufferEncoding,
    ) {
        super();
    }

    public async get(): Promise<T|undefined> {
        try {
            const data = await fs.readFile(this.filePath, this.fileEncoding);
            return this.deserializer(data) as T;
        } catch (e: unknown) {
            if (isErrorCode(e, 'ENOENT')) {
                return undefined;
            }
            throw e;
        }
    }

    public async set(value: T | undefined): Promise<void> {
        if (!this.dirCreated) {
            const dir = path.dirname(this.filePath);
            try {
                await fs.stat(dir);
            } catch (e) {
                if (isErrorCode(e, 'ENOENT')) {
                    await fs.mkdir(dir);
                } else {
                    throw e;
                }
            }
            this.dirCreated = true;
        }
        if (typeof value === 'undefined') {
            await fs.unlink(this.filePath);
            return;
        }
        const data = this.serializer(value);
        await fs.writeFile(this.filePath, data, this.fileEncoding);
    }
}
