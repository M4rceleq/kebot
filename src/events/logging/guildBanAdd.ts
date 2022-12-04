import { IEvent } from '../../utils/interfaces/IEvent';
import { EmbedBuilder } from 'discord.js';

export const event: IEvent<'guildBanAdd'> = {
    listener: 'guildBanAdd',
    execute: async (client, db, ban) => {
        if(!ban || !ban.guild.available || !ban.user) return;

        const targetChannel = await client.getLoggingChannel(ban.guild, 'banListUpdate');
        if(!targetChannel) return;

        const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: ban.user.tag, iconURL: ban.user.avatarURL() as string })
        .setTitle('Zbanowano członka')
        .setDescription(ban.user.toString())
        .addFields([{
            name: 'Powód', 
            value: ban.reason ?? '*brak*',
            inline: false
        }])
        .setFooter({ text: `ID: ${ban.user.id}` })
        .setTimestamp();
        targetChannel.send({ embeds: [embed] });
    }
}