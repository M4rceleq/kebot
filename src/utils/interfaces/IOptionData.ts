import { ApplicationCommandOptionChoiceData, ChannelType } from "discord.js";

interface OptionDataBasics {
    description: string
}

interface OptionDataWithChoices extends OptionDataBasics {
    choices: ApplicationCommandOptionChoiceData<string>[],
    channelTypes?: never
}

interface OptionDataWithChannelTypes extends OptionDataBasics {
    choices?: never,
    channelTypes: ChannelType[]
}

export type IOptionData = OptionDataWithChoices | OptionDataWithChannelTypes;