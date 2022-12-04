import Bot from "./bot";
import { EmbedBuilder, TimestampStyles, ColorResolvable } from 'discord.js';
import path from 'node:path';
import consolaGlobalInstance from "consola";
import { developerId } from "./global";

export const isCatalog = (fileName: string) => !fileName.includes('.');
export const isFileValid = (fileName: string) => fileName.endsWith('.js') || fileName.endsWith('.ts');

export const informDevelopers = (err: Error, client?: Bot): void => {
    consolaGlobalInstance.error(err);

    if(!client || !client.isReady()) return;

    const developer = client.users.cache.get(developerId);
    if(!developer) return consolaGlobalInstance.error("COULDN'T SEND ERROR MESSAGE, DEVELOPER IS UNDEFINED")

    const embed = new EmbedBuilder()
    .setColor('#ED4245')
    .setFields([
        { name: ':interrobang: Error:', value: `\`\`\`xl\n${err}\`\`\`` },
    ]);

    const errStack = err?.stack
    ?.replace(err.toString(), '')
    .replaceAll(`${process.cwd()}${path.sep}`, '');

    if(errStack) embed.addFields([
        { name: ':clipboard: Stack:', value: `\`\`\`xl\n${errStack}\`\`\`` },
    ]);

    const d = new Date();

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString();

    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');

    embed.setFooter({
        text: `${day}.${month}.${year}  •  ${hours}:${minutes}:${seconds}`
    });

    developer.send({ content: `<@${developer.id}>`, embeds: [embed] });
}

export const createProperTimestamp = (time: number | Date = new Date()): number => {
    const rawTime = typeof time === 'number' ? time : time.getTime();
    return rawTime.toString().length > 10 ? Math.round(rawTime/1000) : rawTime;
}

type TimestampStyle = typeof TimestampStyles[keyof typeof TimestampStyles]
export const createDiscordTimestamp = (time: number, timestampStyle: TimestampStyle = TimestampStyles.RelativeTime) => {
    const timestamp = createProperTimestamp(time);
    return `<t:${timestamp}:${timestampStyle}>`
}

export const shadeColor = (color: string, amount: number): ColorResolvable => {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)) as ColorResolvable;
} 

export const isBetween = (startTime: string, endTime: string): boolean => {   
    const currentDate = new Date();   
    
    const startDate = new Date(currentDate.getTime());
    const startSplited = startTime.split(":");
    startDate.setMinutes(parseInt(startSplited[1]));

    const endDate = new Date(currentDate.getTime());
    const endSplited = endTime.split(":");
    endDate.setMinutes(parseInt(endSplited[1]));

    startDate.setHours(parseInt(startSplited[0]));
    endDate.setHours(parseInt(endSplited[0]));

    return (startDate <= currentDate && endDate >= currentDate);
}

export const addZero = (a: number | string): string => {
    let b = a.toString();
    return b.length === 1 ? '0' + b : b;
}

export const generateNewCalendarDays = (charToInsert: string): string => {
    const today = new Date();
    const currentDate = today.getDate();
    const currentMonthLength = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
    let output = '';
    for(let i = 1; i <= currentMonthLength; i++) {
        if(i === currentDate) output += charToInsert;
        else output += '0';
    }
    return output;
}