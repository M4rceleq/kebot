import { ApplicationCommandOptionType } from "discord.js";
import { ArgExtension } from "../types//Option";

export interface IOption {
    readonly name: string,
    readonly type: ApplicationCommandOptionType,
    min?: number,
    max?: number,
    readonly extensions: ArgExtension[],
    readonly required: boolean
}