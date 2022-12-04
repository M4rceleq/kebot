import { IEvent } from '../utils/interfaces/IEvent';
import figlet from 'figlet';
import { blue, bold, cyan, redBright, whiteBright } from 'colorette';
import { isBetween } from '../utils/functions';

export const event: IEvent<'ready'> = {
    listener: 'ready',
    once: true,
    execute: async (client, db) => {
        client.commands.registerCommandsOnGuild('509355153623875591');

        console.log(bold(cyan(figlet.textSync(`KEBOT v2.0`))));
        console.log(blue('>>'), whiteBright('Logged in as:'), redBright(client.user.tag));

        const canDelete = (isBetween('00:00', '18:26') || isBetween('21:42', '23:59'));
        client.logger.info('Czy można usunąć rekrody z tabeli \`papiezowa_receivers\`?', canDelete);
        if(canDelete) await db.prepare('DELETE FROM papiezowa_receivers').run();

        const canReset = (isBetween('00:00', '18:31'));
        client.logger.info('Czy można wyzerować kolumnę \`listenedToday\` w tabeli \`papiezowa\`?', canReset);
        if(canReset) await db.prepare(`UPDATE papiezowa SET listenedToday=0`).run();
    }
}