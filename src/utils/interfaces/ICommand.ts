import { ChatInputCommandInteraction } from 'discord.js';
import Bot from '../bot';
import MySQL from '../mysql';
import { Option } from '../types/Option';
import { IOptionData } from './IOptionData';

interface ExecuteParams {
    readonly interaction: ChatInputCommandInteraction,
    readonly client: Bot,
    readonly db: MySQL
}

export interface ICommand {
    readonly name: string,
    readonly description: string,

    readonly options?: readonly Option[],
    readonly optionsData?: Record<string, IOptionData | string>,
    
    readonly guildOnly?: boolean,
    readonly defaultPermissions?: bigint,

    readonly developersOnly?: boolean,

    readonly execute: (options: ExecuteParams) => Promise<any>,
}