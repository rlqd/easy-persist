import * as path from 'path';
import * as fs from 'fs/promises';
import { AbstractStorage, AbstractStorageFactory } from ".";

export type FileStorageFactoryConfig = {
    fileExtension: string;
    filePrefix?: string;
    serializer: (value: any) => Buffer;
    deserializer: (value: Buffer) => any;
    fileNameHandler: FileNameTreatment | FileNameHandler,
}

const defaultConfig: FileStorageFactoryConfig = {
    fileExtension: 'json',
    serializer: value => Buffer.from(JSON.stringify(value), 'utf-8'),
    deserializer: buf => JSON.parse(buf.toString('utf-8')),
    fileNameHandler: 'escape',
};

export type FileNameHandler = {
    encode: (value: string) => string,
    decode: (value: string) => string,
};
export type FileNameTreatment = 'escape' | 'base64url';
const fileNameHandlers: Record<FileNameTreatment, FileNameHandler> = {
    escape: {
        encode: value => value.replaceAll(/[\x00-\x1f/\\<>:"|?*]/g, c=> `%${c.charCodeAt(0).toString(16).toUpperCase()}`),
        decode: value => decodeURIComponent(value),
    },
    base64url: {
        encode: value => Buffer.from(value).toString('base64url'),
        decode: value => Buffer.from(value, 'base64url').toString(),
    },
};

function isErrorCode(e: unknown, code: string) {
    return e && typeof e === 'object' && 'code' in e && e.code === code;
}

/**
 * Stores data in files in a specified directory.
 */
export class FileStorageFactory extends AbstractStorageFactory {
    private config = { ...defaultConfig };
    private nameHandler: FileNameHandler;

    constructor(
        private baseDir: string,
        config: Partial<FileStorageFactoryConfig> = {},
    ) {
        super();
        this.config = {...this.config, ...config};
        if (typeof this.config.fileNameHandler === 'string') {
            this.nameHandler = fileNameHandlers[this.config.fileNameHandler];
        } else {
            this.nameHandler = this.config.fileNameHandler;
        }
    }

    public create(name: string): FileStorage {
        const fileName = `${this.config.filePrefix??''}${this.nameHandler.encode(name)}.${this.config.fileExtension}`;
        const filePath = path.join(this.baseDir, fileName);
        return new FileStorage(
            filePath,
            this.config.serializer,
            this.config.deserializer,
        );
    }

    public async listNames(): Promise<string[]> {
        const fileNames = await this.listFiles();
        const prefixLength = this.config.filePrefix?.length ?? 0;
        const nameResolver = prefixLength > 0
            ? (name: string) => this.nameHandler.decode(name.substring(prefixLength))
            : (name: string) => this.nameHandler.decode(name)
        ;
        return fileNames.map(nameResolver);
    }

    private async listFiles(): Promise<string[]> {
        let list;
        try {
            list = await fs.readdir(this.baseDir, { withFileTypes: true });
        } catch (e) {
            if (isErrorCode(e, 'ENOENT')) {
                return [];
            }
            throw e;
        }

        const extension = '.' + this.config.fileExtension;
        const results: string[] = [];

        for (const file of list) {
            if (!file.isFile()) {
                continue;
            }
            if (path.extname(file.name) != extension) {
                continue;
            }
            if (this.config.filePrefix && !file.name.startsWith(this.config.filePrefix)) {
                continue;
            }
            results.push(file.name.slice(0, -extension.length));
        }

        return results;
    }
}

export class FileStorage extends AbstractStorage {
    private dirCreated: boolean = false;

    constructor(
        private filePath: string,
        private serializer: FileStorageFactoryConfig['serializer'],
        private deserializer: FileStorageFactoryConfig['deserializer'],
    ) {
        super();
    }

    public getFilePath() {
        return this.filePath;
    }

    public async get(): Promise<unknown> {
        try {
            const data = await fs.readFile(this.filePath);
            return this.deserializer(data);
        } catch (e: unknown) {
            if (isErrorCode(e, 'ENOENT')) {
                return undefined;
            }
            throw e;
        }
    }

    public async set(value: unknown): Promise<void> {
        if (!this.dirCreated) {
            const dir = path.dirname(this.filePath);
            try {
                await fs.stat(dir);
            } catch (e) {
                if (isErrorCode(e, 'ENOENT')) {
                    await fs.mkdir(dir, {recursive: true});
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
        await fs.writeFile(this.filePath, data);
    }
}
