import { IEvent } from '../../utils/interfaces/IEvent';
import { EmbedBuilder, TextChannel, User } from 'discord.js';

export const event: IEvent<'userUpdate'> = {
    listener: 'userUpdate',
    execute: async (client, db, oldUser, newUser) => {
        if(!oldUser || !newUser) return;
        if((newUser ?? oldUser).id === client.user.id) return;

        const embed = new EmbedBuilder()
        .setAuthor({ name: newUser.tag, iconURL: newUser.avatarURL() as string })
        .setColor('#5865F2')
        .setFooter({ text: `ID: ${newUser.id}` });

        // Username updated
        if(oldUser.username !== newUser.username) {
            embed.setTitle('Zaktualizowano nazwę użytkownika')
            .addFields([
                {
                    name: 'Przed',
                    value: oldUser.username || '',
                    inline: true 
                },
                {
                    name: 'Po',
                    value: newUser.username || '',
                    inline: true 
                }
            ]);
        }

        // Avatar updated
        else if(oldUser.avatar !== newUser.avatar) {
            embed.setTitle('Zaktualizowano awatar')
            .setDescription(newUser.toString())
            embed.data.thumbnail = {
                url: `https://cdn.discordapp.com/avatars/${newUser.id}/${newUser.avatar}.webp?size=1024`,
                height: 384,
                width: 384,
            };
        }

        // Discrimnator updated
        else if(oldUser.discriminator !== newUser.discriminator) {
            embed.setTitle('Zaktualizowano tag')
            .addFields([
                {
                    name: 'Przed',
                    value: oldUser.discriminator,
                    inline: true 
                },
                {
                    name: 'Po',
                    value: newUser.discriminator,
                    inline: true 
                }
            ]);
        }

        else return;

        const settings = await db.prepare('SELECT id, userUpdate FROM settings WHERE userUpdate IS NOT NULL').all();
        settings.forEach(setting => {
            const guild = client.guilds.cache.get(setting.id);
            if(!guild || !guild.available) return;

            if(!guild.members.cache.has(newUser.id)) return;
    
            const targetChannel = guild.channels.cache.get(setting.userUpdate) as TextChannel;
            const clientMember = targetChannel.guild.members.me;
            if(!clientMember) return;
            if(!targetChannel || !targetChannel.permissionsFor(clientMember).has(client.loggingFlags)) return;
            
            targetChannel.send({ embeds: [embed.setTimestamp()] });
        });
    }
}
