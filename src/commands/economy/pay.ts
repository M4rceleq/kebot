import { kremowkaEmoji } from "../../utils/global";
import { ICommand } from "../../utils/interfaces/ICommand";

export const command: ICommand = {
    name: 'pay',
    description: 'przelewa określoną ilość kremówek wybranemu użytkownikowi',
    options: ['<użytkownik: user>', '<kwota: integer; 1-X>'],
    optionsData: {
        'użytkownik': 'użytkownik, któremu mają zostać przelane kremówki',
        'kwota': 'ilość kremówek do przelania',
    },
    guildOnly: true,
    execute: async ({ interaction, client, db }) => {
        const target = interaction.options.getUser('użytkownik');
        if(!target) return interaction.reply({ 
            content: 'Nie odnaleziono użytkownika, spróbuj ponownie.', 
            ephemeral: true 
        });

        if(target.bot) return interaction.reply({ 
            content: 'Wybrany użytkownik nie może być botem.', 
            ephemeral: true 
        });

        if(target.id === interaction.user.id) return interaction.reply({ 
            content: 'Nie możesz sobie przelać kremówek.', 
            ephemeral: true 
        });

        const number = interaction.options.getInteger('kwota');
        if(!number) return interaction.reply({ 
            content: 'Nie wykryto kwoty, spróbuj ponownie.',
            ephemeral: true 
        });

        const authorBalance = await db.prepare(`SELECT balance FROM papiezowa WHERE id=?`).pluck().get(interaction.user.id);
        if(!authorBalance || authorBalance === 0) return interaction.reply({ 
            content: 'Twój stan konta jest pusty.', 
            ephemeral: true 
        });

        if(authorBalance < number) return interaction.reply({ 
            content: `Masz za mało kremówek (${authorBalance}).`, 
            ephemeral: true 
        });

        const targetData = await db.prepare(`SELECT balance FROM papiezowa WHERE id=?`).pluck().get(target.id);
        if(!targetData) await db.prepare(`INSERT INTO papiezowa(id, balance) VALUES(?,0)`).run(target.id);
        const targetBalance = targetData?.balance ?? 0;

        await db.prepare(`UPDATE papiezowa SET balance=? WHERE id=?`).run(authorBalance-number, interaction.user.id);
        await db.prepare(`UPDATE papiezowa SET balance=? WHERE id=?`).run(targetBalance+number, target.id);

        interaction.reply(`Pomyślnie przekazano ${number} ${kremowkaEmoji} użytkownikowi ${target}.`);
    }
}