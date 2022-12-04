import { ApplicationCommandManager, ApplicationCommandOptionData, ApplicationCommandType, ChatInputApplicationCommandData, Collection, GuildApplicationCommandManager } from "discord.js";
import { isCatalog, isFileValid } from "./functions";
import { ICommand } from "./interfaces/ICommand";
import path from "node:path";
import fs from "node:fs";
import Bot from "./bot";
import { OptionsParser } from "./optionsParser";
import consolaGlobalInstance from "consola";

export class CommandsManager {
    private readonly client: Bot;
    private readonly commands: Collection<string, ICommand> = new Collection();
    private readonly commandsPath: string;
    
    public constructor(client: Bot, commandsPath: string) {
        this.client = client;
        this.commandsPath = path.join(__dirname, commandsPath);
    }

    private async createCommand(fileName: string, catalogName?: string): Promise<void> {
        const targetPath = `${this.commandsPath}${catalogName ? `/${catalogName}` : ''}/${fileName}`;
        const importedData = await import(targetPath);
        const command = importedData[Object.keys(importedData)[0]] as ICommand;
        this.commands.set(command.name, command);
    }

    public async importCommands() {
        const commandsCatalogs = fs.readdirSync(this.commandsPath);
        for await (const catalog of commandsCatalogs) {
            if(isFileValid(catalog)) {
                console.log(catalog);
                await this.createCommand(catalog);
            }
            else if(isCatalog(catalog)) {
                const catalogFiles = fs.readdirSync(`${this.commandsPath}/${catalog}`);
                for await (const file of catalogFiles) {
                    if(isFileValid(file)) {
                        console.log(`${catalog}/${file}`);
                        await this.createCommand(file, catalog);
                    }
                }
            }
        }
    }

    private registerCommand(command: ICommand, guildId?: string) {
        if(!this.client.isReady()) return consolaGlobalInstance.error('Client must be ready to register a command!');
        let commandManager: ApplicationCommandManager | GuildApplicationCommandManager;
        if(guildId) {
            const guild = this.client.guilds.cache.get(guildId);
            if(guild) commandManager = guild.commands;
            else throw 'No guild';
        } else commandManager = this.client.application.commands;

        let options: ApplicationCommandOptionData[] = [];
        if(command.options && command.optionsData) {
            const optionsParser = new OptionsParser(command.options, command.optionsData);
            options = optionsParser.createApplicationOptions();
        }
        
        const applicationCommand: ChatInputApplicationCommandData = {
            name: command.name,
            description: command.description,
            type: ApplicationCommandType.ChatInput,
            options,
            dmPermission: !command.guildOnly,
        }
        
        const doesCommandExist = commandManager.cache.find((cmd) => cmd.name == command.name);
        if (doesCommandExist) commandManager.edit(doesCommandExist.id, applicationCommand);
        else commandManager.create(applicationCommand);
    }

    public registerCommandsGlobally() {
        this.commands.forEach(command => {
            this.registerCommand(command);
        });
    }

    public registerCommandsOnGuild(guildId: string) {
        this.commands.forEach(command => {
            this.registerCommand(command, guildId);
        });
    }

    public get(name: string) {
        return this.commands.find(cmd => cmd.name === name);
    }
}