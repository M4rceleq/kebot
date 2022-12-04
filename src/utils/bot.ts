import consola, { Consola } from "consola";
import { ActivityType, Client, GatewayIntentBits, Guild, Snowflake, TextChannel, PermissionFlagsBits } from "discord.js";
import MySQL from "./mysql";
import { IBooleanGuildSettings, IGuildSettings, INumberGuildSettings, IStringGuildSettings } from "./interfaces/IGuildSettings";
import { CommandsManager } from "./commandsManager";
import { EventsManager } from "./eventsManager";

class Bot extends Client<true> {
    public readonly db: MySQL;
    public readonly logger: Consola = consola;
    public readonly commands = new CommandsManager(this, './../commands');
    public readonly events = new EventsManager(this, './../events');
    readonly loggingFlags: bigint[] = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory,
    ];

    public constructor(token: string) {
        super({ 
            intents: [
                GatewayIntentBits.GuildBans,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildPresences
            ],
            presence: {
                status: 'online',
                afk: false,
                activities: [{ name: '21:37', type: ActivityType.Watching }]
            } 
        });

        const env = process.env;
        if(!env.MYSQL_USER || !env.MYSQL_DATABASE) {
            throw 'You must provide mysql user and database';
        }
        
        this.db = new MySQL({
            host: env.MYSQL_HOST,
            port: env.MYSQL_PORT,
            user: env.MYSQL_USER,
            password: env.MYSQL_PASSWORD,
            database: env.MYSQL_DATABASE
        });

        this.start(token);
    }

    private async start(token: string): Promise<void> {
        await this.commands.importCommands();
        this.logger.success('commands imported');
        await this.events.importEvents();
        this.logger.success('events imported');
        this.login(token);
    }

    public async getAllSettings(guildId: Snowflake): Promise<IGuildSettings> {
        return await this.db.prepare('SELECT * FROM settings WHERE id=?').get(guildId);
    }

    public async getSetting(guildId: Snowflake, setting: keyof IStringGuildSettings): Promise<string>;
    public async getSetting(guildId: Snowflake, setting: keyof INumberGuildSettings): Promise<number>;
    public async getSetting(guildId: Snowflake, setting: keyof IBooleanGuildSettings): Promise<0 | 1>;
    public async getSetting(guildId: Snowflake, setting: string) {
        return await this.db.prepare(`SELECT ${setting} FROM settings WHERE id=?`).pluck().get(guildId);
    }

    public async getLoggingChannel(guild: Guild, query: keyof IStringGuildSettings) {
        const targetChannelId = await this.getSetting(guild.id, query);
        if(!targetChannelId) return;

        const targetChannel = guild.channels.cache.get(targetChannelId) as TextChannel;
        const clientMember = targetChannel.guild.members.me;
  
        if(!clientMember || !targetChannel) return;
        if(!targetChannel.permissionsFor(clientMember).has(this.loggingFlags)) return;
        return targetChannel;
    }
}

export default Bot;