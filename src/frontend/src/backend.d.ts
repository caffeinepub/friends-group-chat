import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Message {
    text: string;
    timestamp: Time;
    senderName: string;
}
export type Time = bigint;
export interface backendInterface {
    getMessageByIndex(index: bigint): Promise<Message>;
    getMessages(): Promise<Array<Message>>;
    postMessage(senderName: string, text: string): Promise<void>;
}
