import { IEvent } from '../../utils/interfaces/IEvent';
import { EmbedBuilder } from 'discord.js';

export const event: IEvent<'guildBanRemove'> = {
    listener: 'guildBanRemove',
    execute: async (client, db, ban) => {
        if(!ban || !ban.guild.available || !ban.user) return;

        const targetChannel = await client.getLoggingChannel(ban.guild, 'banListUpdate');
        if(!targetChannel) return;

        const embed = new EmbedBuilder()
        .setColor(`#57F287`)
        .setAuthor({ name: ban.user.tag, iconURL: ban.user.avatarURL() as string })
        .setTitle(`Odbanowano członka`)
        .setDescription(ban.user.toString())
        .setFooter({ text: `ID: ${ban.user.id}` })
        .setTimestamp();
        targetChannel.send({ embeds: [embed] })
    }
}