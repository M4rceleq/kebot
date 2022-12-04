import { IEvent } from '../../utils/interfaces/IEvent';
import { EmbedBuilder, VoiceState } from 'discord.js';

export const event: IEvent<'voiceStateUpdate'> = {
    listener: 'voiceStateUpdate',
    execute: async (client, db, oldState, newState) => {
        if(oldState.channelId === newState.channelId) return;
        if(!oldState.member || !newState.member) return;

        const guild = newState.guild || oldState.guild;
        if(!guild || !guild.available) return;

        const targetChannel = await client.getLoggingChannel(guild, 'voiceStateUpdate');
        if(!targetChannel) return;

        const target = newState.member.user || oldState.member.user;
        if(!target) return;

        const embed = new EmbedBuilder()
        .setAuthor({ name: target.tag, iconURL: target.avatarURL() as string })
        .setFooter({ text: `ID: ${target.id}` })
        .setTimestamp();

        // Dołączenie na kanał głosowy
        if(!oldState.channelId && newState.channelId) {
            embed.setTitle('Dołączono na kanał głosowy')
            .setDescription(`<#${newState.channelId}>`)
            .setColor('#57F287');
        }

        // Opuszczenie kanału głosowego
        else if(oldState.channelId && !newState.channelId) {
            embed.setTitle('Opuszczono kanał głosowy')
            .setDescription(`<#${oldState.channelId}>`)
            .setColor('#ED4245');
        }

        // Zmiana kanału głosowego
        else if(oldState.channelId && newState.channelId) {
            embed.setTitle('Zmieniono kanał głosowy')
            .addFields([
                {
                    name: 'Przed',
                    value: `<#${oldState.channelId}>`,
                    inline: true
                },
                {
                    name: 'Po',
                    value: `<#${newState.channelId}>`,
                    inline: true
                }
            ])
            .setColor('#5865F2');
        }
        else return;
        
        targetChannel.send({ embeds: [embed] })
    }
}
