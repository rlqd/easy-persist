import { AbstractRecord } from "../../src/repository";

export type ExampleValue = {
    exampleNumber: number,
    exampleString: string,
};

export default class ExampleRecord extends AbstractRecord<ExampleValue> {
    public async randomiseNumber(): Promise<void> {
        await this.update({
            exampleNumber: Math.floor(Math.random() * 10000),
        });
    }
}
