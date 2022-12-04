import { EmbedFooterData, EmojiResolvable, Snowflake } from 'discord.js'

export const developerId: Snowflake = "452069515967070210";
export const greenTick: EmojiResolvable = '<:GreenTick:878785664466948116>';
export const redTick: EmojiResolvable = '<:RedTick:878785710553956362>';
export const kremowkaEmoji: EmojiResolvable = '<:kremowka:898621102811656202>';
export const economyFooter: EmbedFooterData = { 
  text: `PapajEconomy ${new Date().getFullYear()}`,
}
if(process.env.PAPAJ_ICON) economyFooter.iconURL = process.env.PAPAJ_ICON;


export interface Participant {
  id: Snowflake,
  guildId: Snowflake,
  voiceChannelId: Snowflake,
}

interface Papiezowa {
    active: Snowflake[];
    participants: Participant[];
}

export const papiezowa: Papiezowa = { 
    active: [],
    participants: [],
};