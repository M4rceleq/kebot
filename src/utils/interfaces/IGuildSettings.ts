import { Snowflake } from "discord.js";

export interface IStringGuildSettings {
    readonly id: Snowflake;
    readonly prefix: string;
    readonly language: string;
    readonly modRole?: string | null;
    readonly adminRole?: string | null;
    readonly messageDelete?: string | null;
    readonly messageUpdate?: string | null;
    readonly voiceStateUpdate?: string | null;
    readonly memberBoosted?: string | null;
    readonly memberToggle?: string | null;
    readonly memberUpdate?: string | null;
    readonly banListUpdate?: string | null;
    readonly userUpdate?: string | null;
    readonly papiezowaChannel?: string | null;
}

export interface INumberGuildSettings {};

export interface IBooleanGuildSettings {
    readonly papiezowa: 0 | 1;
    readonly moderation: 0 | 1;
    readonly skills: 0 | 1;
    readonly economy: 0 | 1;
    readonly school: 0 | 1;
    readonly meme: 0 | 1
}

export interface IGuildSettings extends IStringGuildSettings, INumberGuildSettings, IBooleanGuildSettings {};