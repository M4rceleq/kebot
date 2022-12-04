import { EmbedBuilder } from "discord.js";
import { economyFooter, kremowkaEmoji } from "../../utils/global";
import { ICommand } from "../../utils/interfaces/ICommand";

export const command: ICommand = {
    name: 'leaderboard',
    description: 'wyświetla top 10 użytkowników w wybranej kategorii',
    options: ['<kategoria: string; choices>'],
    optionsData: {
        'kategoria': {
            description: 'kategoria określająca rodzaj wyświetlanych danych',
            choices: [
                { name: 'wysłuchane barki', value: 'career'  },
                { name: 'zdobyte kremówki', value: 'balance' }
            ],
        }
    },
    guildOnly: true,
    execute: async ({ interaction, client, db }) => {
        const author = interaction.user;
        const field = interaction.options.getString('kategoria', true);

        const isCareer = (field === 'career');
        const title = isCareer ? 'Lista najlepszych słuchaczy' : 'Lista najbogatszych użytkowników';

        const usersRecords = await db.prepare(`SELECT id, ${field} FROM papiezowa ORDER BY ${field} DESC`).all();

        let desc = '';
        for(let i = 0; i < Math.min(usersRecords.length, 10); i++) {
            desc += `**${i+1}.** <@${usersRecords[i].id}> - ${isCareer ? usersRecords[i].career : `${usersRecords[i].balance} ${kremowkaEmoji}`}\n`;
        }
        
        const embed = new EmbedBuilder()
        .setAuthor({ name: author.tag, iconURL: author.avatarURL() as (string | undefined) })
        .setTitle(title)
        .setDescription(!desc.length ? 'brak' : desc)
        .setColor('#e7ae6b')
        .setFooter(economyFooter)
        .setTimestamp();

        interaction.reply({ embeds: [embed] });
    }
}