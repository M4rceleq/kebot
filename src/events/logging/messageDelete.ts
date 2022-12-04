import { IEvent } from '../../utils/interfaces/IEvent';
import { EmbedBuilder, TextChannel, ChannelType } from 'discord.js';

export const event: IEvent<"messageDelete"> = {
    listener: "messageDelete",
    execute: async (client, db, message) => {
        if(!message.author || !message.member || message.author.bot || message.system) return;
        if(message.channel.type === ChannelType.DM) return;
        if((!message.content && !message.attachments.size)) return;
        if(!message.guild?.available) return;
        
        const targetChannel = await client.getLoggingChannel(message.guild, 'messageDelete');
        if(!targetChannel) return;
        
        // Kto? Gdzie? Co?
        const date = new Date();
        const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.tag, iconURL: message.author.avatarURL() as string })
        .setTitle(`Usunięto wiadomość`)
        .setColor(`#ED4245`)
        .setFooter({ text: `ID: ${message.id}` })
        .setTimestamp(date)
        
        // * Autor - Kanał tekstowy - Wątek
        .addFields([
            {
                name: 'Autor', 
                value: `${message.author}`, 
                inline: true
            }
        ]);
        
        const isAuthorNameTooLong = (message.member.displayName || message.author.username).length >= 22;

        if(message.channel.isThread()) {
            embed.addFields([
                {
                    name: 'Kanał tekstowy',
                    value: `${message.channel.parent}${isAuthorNameTooLong ? '\n' : ' '}\`\`[#${message.channel.parent?.name}]\`\``,
                    inline: true
                },
                {
                    name: 'Wątek',
                    value: `${message.channel}${isAuthorNameTooLong ? '\n' : ' '}\`\`[#${message.channel.name}]\`\``,
                    inline: true
                }
            ])
        } else embed.addFields([
            {
                name: 'Kanał tekstowy', 
                value: `${message.channel}${isAuthorNameTooLong ? '\n' : ' '}\`\`[#${(message.channel as TextChannel).name}]\`\``, 
                inline: true
            }
        ]);

        embed.addFields([
            {
                name: '\u200b', 
                value: '\u200b', 
                inline: true
            }
        ]);

        if(message.attachments.size) {
            let attList = '';
            if(message.attachments.size === 1) attList = message.attachments.first()?.name ?? '';
            else {
                const messageAttachments = Array.from(message.attachments.values());
                messageAttachments.forEach(att => {
                    if(att?.name && (attList.length + att.name.length) >= 1019 && !attList.includes('...')) attList += '\n...';
                    else attList += `\n${att.name}`
                });
            } 
            
            embed.addFields([
                {
                    name: 'Załączniki', 
                    value: attList, 
                    inline: true
                }
            ]);
        }
        
        targetChannel.send({ embeds: [message.content ? embed.setDescription(message.content) : embed] });
    }
}
