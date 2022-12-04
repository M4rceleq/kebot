import { IEvent } from '../../utils/interfaces/IEvent';
import { EmbedBuilder } from 'discord.js';
import { shadeColor } from '../../utils/functions';

export const event: IEvent<'guildMemberUpdate'> = {
    listener: "guildMemberUpdate",
    execute: async (client, db, oldMember, newMember) => {
        if(!oldMember || !newMember || !newMember.guild.available) return;
        if((newMember ?? oldMember).user.id === client.user.id) return;

        const targetChannel = await client.getLoggingChannel(newMember.guild, 'memberUpdate');
        if(!targetChannel) return;

        const embed = new EmbedBuilder()
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.avatarURL() as string })
        .setFooter({ text: `ID: ${newMember.user.id}` });

        // Nickname updated
        if(oldMember.nickname !== newMember.nickname) {
            embed.setTitle(`Zmieniono pseudonim`)
            .addFields([
                {
                    name: 'Przed',
                    value: oldMember.nickname || oldMember.user.username
                },
                {
                    name: 'Po',
                    value: newMember.nickname || newMember.user.username
                },
            ])
            .setColor(`#4286f4`)
            return targetChannel.send({ embeds: [embed.setTimestamp()] });
        }

        // Roles updated
        console.log('guildMemberUpdate 4', oldMember.roles.cache.size, newMember.roles.cache.size)

        if(oldMember.roles.cache.size !== newMember.roles.cache.size) {
            embed.setFields([]);
            const oldRoles = Array.from(oldMember.roles.cache.keys());
            const newRoles = Array.from(newMember.roles.cache.keys());

            const isRoleAdded = (newRoles.length > oldRoles.length);
            embed.setColor(isRoleAdded ? '#ffffff' : '#595959');
            
            const whichToFilter = (isRoleAdded ? newRoles : oldRoles);
            const whichNotToFilter = (isRoleAdded ? oldRoles : newRoles);
            const diffrence = whichToFilter.filter(val => !whichNotToFilter.includes(val));
            if(!diffrence || diffrence.length === 0) return;

            const isThereOnlyOneElement = (diffrence.length === 1);
            embed.setTitle(`${isRoleAdded ? 'Dodano' : 'Usunięto'} rol${isThereOnlyOneElement ? 'ę' : 'e'}`);

            if(isThereOnlyOneElement) {
                const role = newMember.guild.roles.cache.get(diffrence[0]);
                if(role) {
                    embed.setColor(shadeColor(role.hexColor, (isRoleAdded ? 33 : -50)));
                    embed.setDescription(role.toString());
                } else embed.setDescription('undefined');
            } else {
                let description = '';
                diffrence.every((roleId, index, array) => { 
                    if(description.length + roleId.length + 3 < 2000 - array.length.toString().length - 12) 
                    description += `<@&${roleId}>\n`;
                    else {
                        description += `i ${array.length - index} więcej...`;
                        return false;
                    }
                    return true;
                });
                embed.setDescription(description);
            }
            
            return targetChannel.send({ embeds: [embed.setTimestamp()] })
        }
    }
}
