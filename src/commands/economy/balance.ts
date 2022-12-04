import { EmbedBuilder } from "discord.js";
import { economyFooter, kremowkaEmoji } from "../../utils/global";
import { ICommand } from "../../utils/interfaces/ICommand";

export const command: ICommand = {
    name: 'balance',
    description: 'wyświetla stan konta użytkownika',
    options: ['[użytkownik: user]'],
    optionsData: {
        'użytkownik': 'użytkownik, którego stan konta ma zostać wyświetlony',
    },
    guildOnly: true,
    execute: async ({ interaction, client, db }) => {
        const target = interaction.options.getUser('użytkownik') ?? interaction.user;
        if(!target) return;

        if(target.bot) return interaction.reply({ 
            content: 'Wybrany użytkownik nie może być botem.', 
            ephemeral: true 
        });

        const res = await db.prepare('SELECT balance, career FROM papiezowa WHERE id=?').get(target.id);

        const embed = new EmbedBuilder()
        .setAuthor({ name: target.tag, iconURL: target.avatarURL() })
        .addFields([
            {
                name: 'Kremówki', 
                value: `${res?.balance ?? 0} ${kremowkaEmoji}`,
                inline: true
            },
            {
                name: 'Wysłuchane barki', 
                value: (res?.career ?? 0).toString(),
                inline: true
            }
        ])
        .setColor('#e7ae6b')
        .setFooter(economyFooter)
        .setTimestamp();
        
        interaction.reply({ embeds: [embed] });
    }
}