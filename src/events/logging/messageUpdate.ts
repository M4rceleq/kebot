import { IEvent } from '../../utils/interfaces/IEvent';
import { EmbedBuilder, TextChannel, ChannelType } from 'discord.js';

export const event: IEvent<'messageUpdate'> = {
    listener: 'messageUpdate',
    execute: async (client, db, oldMessage, newMessage) => {
        if(!newMessage.author || !newMessage.member || newMessage.author.bot || newMessage.system) return;
        if(newMessage.channel.type === ChannelType.DM) return;
        if(!oldMessage.content || !newMessage.content) return;
        if(oldMessage.content === newMessage.content) return;
        
        if(!newMessage.guild?.available) return;
        const targetChannel = await client.getLoggingChannel(newMessage.guild, 'messageUpdate');
        if(!targetChannel) return;
        
        const date = new Date();
        const embed = new EmbedBuilder()
        .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.avatarURL() as string })
        .setTitle(`Zedytowano wiadomość`)
        .setColor(`#FEE75C`)
        .setFooter({ text: `ID: ${newMessage.id}` })
        .setTimestamp(date);
        
        const isAuthorNameTooLong = (newMessage.member.displayName || newMessage.author.username).length >= 22;

        if(newMessage.channel.isThread()) {
            embed.addFields([
                {
                    name: 'Kanał tekstowy',
                    value: `${newMessage.channel.parent}${isAuthorNameTooLong ? '\n' : ' '}\`\`[#${newMessage.channel.parent?.name}]\`\``,
                    inline: true
                },
                {
                    name: 'Wątek',
                    value: `${newMessage.channel}${isAuthorNameTooLong ? '\n' : ' '}\`\`[#${newMessage.channel.name}]\`\``,
                    inline: true
                }
            ])
        } else embed.addFields([
            {
                name: 'Kanał tekstowy', 
                value: `${newMessage.channel}${isAuthorNameTooLong ? '\n' : ' '}\`\`[#${(newMessage.channel as TextChannel).name}]\`\``, 
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

        let desc = "";
        const length = oldMessage.content.length + newMessage.content.length;
        if(oldMessage.content && newMessage.content && length <= 1476) desc += `**Przed:**  ${oldMessage.content}\n**Po:** ${newMessage.content}`;
        embed.setDescription(desc);
        targetChannel.send({ embeds: [embed] });
    }
}
