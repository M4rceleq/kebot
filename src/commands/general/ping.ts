import { ICommand } from "../../utils/interfaces/ICommand";
import { Message } from "discord.js";

export const command: ICommand = {
    name: 'ping',
    description: 'wyświetla opóźnienie między Kebotem a Discordem',
    execute: async ({ interaction, client, db }) => {
        const msg = await interaction.reply({ content: `Ping?`, fetchReply: true });
        if (!msg || !(msg instanceof Message)) return interaction.editReply('Nie udało się odebrać sygnału :(');
        const diff = msg.createdTimestamp - interaction.createdTimestamp;
        const ping = Math.round(client.ws.ping);
        interaction.editReply(`Pong! (${diff}ms, Heartbeat: ${ping}ms)`);
    }
}