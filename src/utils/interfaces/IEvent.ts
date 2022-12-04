import Bot from '../bot';
import MySQL from '../mysql';
import { ClientEvents } from 'discord.js';

export type EventType = keyof ClientEvents;
export interface IEvent<T extends EventType> {
    readonly listener: T,
    readonly once?: boolean,
    execute: (client: Bot, db: MySQL, ...options: ClientEvents[T]) => Promise<any>
}