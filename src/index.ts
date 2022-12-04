import 'dotenv/config';
import { informDevelopers } from './utils/functions';
import Bot from './utils/bot';
process.env.TZ = 'Europe/Warsaw';

if(process.env.DISCORD_TOKEN) {
    const client = new Bot(process.env.DISCORD_TOKEN);
    process.on('unhandledRejection', (err: Error) => informDevelopers(err, client));
    process.on('uncaughtException', (err: Error) => informDevelopers(err, client));
}