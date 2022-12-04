import { IEvent } from "../utils/interfaces/IEvent";
import { Interaction } from "discord.js";
import { developerId } from "../utils/global";

export const event: IEvent<"interactionCreate"> = {
    listener: "interactionCreate",
    execute: async (client, db, interaction: Interaction) => {
        if(!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if(!command) return interaction.reply({ content: 'Komenda jest niedostępna.', ephemeral: true });
        
        if(command.developersOnly && developerId !== interaction.user.id) {
            return interaction.reply({ content: 'Nie posiadasz dostępu do komendy deweloperskiej.', ephemeral: true });
        }

        command.execute({ interaction, client, db });
    }
}