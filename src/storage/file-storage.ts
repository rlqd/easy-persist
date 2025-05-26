import * as path from 'path';
import * as fs from 'fs/promises';
import { AbstractStorage, AbstractStorageFactory } from ".";

function isErrorCode(e: unknown, code: string) {
    return e && typeof e === 'object' && 'code' in e && e.code === code;
}

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

    public async listNames(): Promise<string[]> {
        return await this.listFilesRecursive(this.baseDir, '.' + this.fileExtension);
    }

    private async listFilesRecursive(dir: string, extension: string, root: string = dir): Promise<string[]> {
        let results: string[] = [];

        let list: string[];
        try {
            list = await fs.readdir(dir);
        } catch (e) {
            if (isErrorCode(e, 'ENOENT')) {
                return results;
            }
            throw e;
        }

        for (const file of list) {
            const fullPath = path.join(dir, file);

            let stat;
            try {
                stat = await fs.stat(fullPath);
            } catch (e) {
                if (isErrorCode(e, 'ENOENT')) {
                    continue;
                }
                throw e;
            }

            if (stat.isDirectory()) {
                results = results.concat(await this.listFilesRecursive(fullPath, extension, dir));
            } else if (path.extname(file) === extension) {
                results.push(fullPath.slice(root.length + 1, -extension.length).replaceAll('\\', '/'));
            }
        }

        return results;
    }
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
