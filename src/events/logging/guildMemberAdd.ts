import { IEvent } from '../../utils/interfaces/IEvent';
import { GuildMember, EmbedBuilder } from 'discord.js';
import { createDiscordTimestamp } from '../../utils/functions';

export const event: IEvent<'guildMemberAdd'> = {
    listener: "guildMemberAdd",
    execute: async (client, db, member: GuildMember) => {
        if(!member || !member.guild.available || !member.user || member.user.id === client.user.id) return;

        const targetChannel = await client.getLoggingChannel(member.guild, 'memberToggle');
        if(!targetChannel) return;

        const embed = new EmbedBuilder()
        .setAuthor({ name: member.user.tag, iconURL: member.user.avatarURL() as string })
        .setTitle(`Członek dołączył`)
        .setColor(`#57F287`)
        .setDescription(member.toString())
        .addFields([
            {
                name: 'Liczba członków',
                value: member.guild.members.cache.size.toString(),
                inline: true
            },
            {
                name: 'Stworzono',
                value: createDiscordTimestamp(member.user.createdTimestamp),
                inline: true
            }
        ])
        .setFooter({ text: `ID: ${member.user.id}` })
        .setTimestamp();
        targetChannel.send({ embeds: [embed] });
    }
}
