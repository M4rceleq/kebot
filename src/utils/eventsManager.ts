import { Collection } from "discord.js";
import { isCatalog, isFileValid } from "./functions";
import { IEvent } from "./interfaces/IEvent";
import path from "node:path";
import fs from "node:fs";
import Bot from "./bot";

export class EventsManager {
    private readonly client: Bot;
    private readonly events: Collection<string, IEvent<any>> = new Collection();
    private readonly eventsPath: string;
    
    public constructor(client: Bot, eventsPath: string) {
        this.client = client;
        this.eventsPath = path.join(__dirname, eventsPath);
    }

    private async createEvent(fileName: string, catalogName?: string): Promise<void> {
        const targetPath = `${this.eventsPath}${catalogName ? `/${catalogName}` : ''}/${fileName}`;
        const importedData = await import(targetPath);
        const event = importedData[Object.keys(importedData)[0]] as IEvent<any>;
        if(!event.once) this.events.set(fileName, event);
        (event.execute as Function) = (event.execute as Function).bind(null, this.client).bind(null, this.client.db);
        this.client[event.once ? 'once' : 'on'](event.listener, event.execute as any);
    }

    public async importEvents() {
        const eventsCatalogs = fs.readdirSync(this.eventsPath);
        for await (const catalog of eventsCatalogs) {
            if(isFileValid(catalog)) {
                console.log(`${catalog}`);
                await this.createEvent(catalog);
            }
            else if(isCatalog(catalog)) {
                const catalogFiles = fs.readdirSync(`${this.eventsPath}/${catalog}`);
                for await (const file of catalogFiles) {
                    if(isFileValid(file)) {
                        console.log(`${catalog}/${file}`);
                        await this.createEvent(file, catalog);
                    }
                }
            }
        }
    }
}