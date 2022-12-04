import { IEvent } from '../../utils/interfaces/IEvent';
import { EmbedBuilder } from 'discord.js';
import { createDiscordTimestamp } from '../../utils/functions';

export const event: IEvent<'guildMemberRemove'> = {
    listener: "guildMemberRemove",
    execute: async (client, db, member) => {
        if(!member || !member.guild.available || !member.user || member.user.id === client.user.id) return;

        const targetChannel = await client.getLoggingChannel(member.guild, 'memberToggle');
        if(!targetChannel) return;

        const author = { name: member.user.tag, iconURL: member.user.avatarURL() as string };
        const footer = { text: `ID: ${member.user.id}` };
        const timestampDate = new Date();
        
        const embed = new EmbedBuilder()
        .setAuthor(author)
        .setTitle(`Członek wyszedł`)
        .setColor(`#ED4245`)
        .setDescription(member.toString())
        .addFields([
            {
                name: 'Dołączono', 
                value: createDiscordTimestamp(member.joinedTimestamp || 0)
            }
        ])
        .setFooter(footer)
        embed.setTimestamp(timestampDate);

        let roleStrings: string[] = [''];
        let i = 0;
        const filtered = member.roles.cache.filter(role => role.id !== member.guild.roles.everyone.id)
        if(filtered.size === 0) roleStrings[0] = '*brak*';
        else { 
            filtered.forEach(role => {
                if((roleStrings[i].length + role.toString().length) < (i === 0 ? 1024 : 2000)) roleStrings[i] += `${role} `;
                else { 
                    i++;
                    roleStrings[i] = `${role} `;
                }
            })
        }

        const areThereMore = (roleStrings.length !== 1);
        embed.addFields([
            {
                name: `Role${areThereMore ? `[1/${roleStrings.length}]` : ''}`,
                value: roleStrings[0]
            }
        ])
        targetChannel.send({ embeds: [embed] })

        if(areThereMore) {
            let sentTimes = 0;
            roleStrings.forEach(async (role, index, array) => {
                const additionalEmbed = new EmbedBuilder()
                .setTitle(`Role [${index+2}/${array.length}]`)
                .setDescription(role)
                additionalEmbed.setAuthor(author);
                additionalEmbed.setFooter(footer);
                additionalEmbed.setTimestamp(timestampDate);
                await new Promise(async resolve => {
                    const msg = await targetChannel.send({ embeds: [additionalEmbed] })
                    if(msg) resolve(sentTimes++);
                });
                if(sentTimes === 3) await new Promise(r => setTimeout(r, 5000));
            })
        }
    }
}
