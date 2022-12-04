import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionData, ApplicationCommandOptionType, ChannelType } from "discord.js";
import { IOption } from "./interfaces/IOption";
import { IOptionData } from "./interfaces/IOptionData";
import { ArgExtension, Option, ParserChars } from "./types/Option";

export class OptionsParser {
    private readonly options: readonly Option[];
    private readonly optionsData: Record<string, IOptionData | string>;
    private readonly FLOATING_POINT_NUMBER_REGEX = /\d*\.\d+/;
    private readonly MIN_MAX_REGEX = /^\d*\.?\d+-\d*\.?\d+|\d*\.?\d+-|-\d*\.?\d+$/;

    constructor(options: readonly Option[], optionsData: Record<string, IOptionData | string>) {
        this.options = options;
        this.optionsData = optionsData;
    }

    private parseArgsToObjects(): IOption[] {
        const argumentsObjects: IOption[] = [];
        this.options.forEach(rawOption => {
            const openingChar = rawOption.slice(0, 1);
            const endingChar = rawOption.slice(-1);
            const option = rawOption.slice(1, -1).replace(/\s/g, '').toLowerCase();
    
            const isThereAnyExtension = option.includes(ParserChars.NAME_EXTENSION_SEPERATOR);
    
            const nameAndType = isThereAnyExtension ? option.split(ParserChars.NAME_EXTENSION_SEPERATOR)[0] : option;
            const [name, type] = nameAndType.split(ParserChars.NAME_TYPE_SEPERATOR);
    
            const isRequired = openingChar === ParserChars.REQUIRED_OPENING && endingChar === ParserChars.REQUIRED_ENDING;
            
            let map: {id: number; name: string}[] = [];
            for(let n in ApplicationCommandOptionType) {
                if (typeof ApplicationCommandOptionType[n] === 'number') {
                    map.push({id: <any>ApplicationCommandOptionType[n], name: n.toLowerCase()});
                }
            }
            const id = map.find(el => el.name === type)?.id || 0;

            const argumentObj: IOption = {
                name,
                type: id,
                required: isRequired,
                extensions: [],
            } 
    
            if(isThereAnyExtension) {
                const rawExtensionsStr = option.split(ParserChars.NAME_EXTENSION_SEPERATOR)[1];
                const extensions = rawExtensionsStr.split(ParserChars.EXTENSIONS_SEPERATOR);
    
                extensions.forEach(extension => {
                    if(this.MIN_MAX_REGEX.test(extension)) {
                        if(argumentObj.type === ApplicationCommandOptionType.String && this.FLOATING_POINT_NUMBER_REGEX.test(extension)) {
                            throw `>> ${rawOption}\nString min and max length cannot be represented as floating point number!`;
                        }
                        const [minStr, maxStr] = extension.split('-'); 
                        const min = Number(minStr);
                        const max = Number(maxStr);
                        argumentObj.min = minStr && !isNaN(min) ? min : undefined;
                        argumentObj.max = maxStr && !isNaN(max) ? max : undefined;
                        argumentObj.extensions.push(ArgExtension.MIN_MAX);
                    } else argumentObj.extensions.push(extension as ArgExtension)
                });
            }
    
            argumentsObjects.push(argumentObj);
        });
    
        return argumentsObjects;
    }

    public createApplicationOptions(): ApplicationCommandOptionData[] {
        const options = this.parseArgsToObjects();
        const applicationOptions: ApplicationCommandOptionData[] = [];
        options.forEach(arg => {
            let option: ApplicationCommandOptionData | undefined;
            const argData = this.optionsData[arg.name];
            if(!argData) throw 'error';

            const isArgDataString = (typeof argData === 'string');
            const description =  isArgDataString ? argData : argData.description;

            switch(arg.type) {
                case ApplicationCommandOptionType.Integer:
                case ApplicationCommandOptionType.Number: {
                    option = {
                        name: arg.name,
                        description,
                        type: arg.type,
                        minValue: arg.min,
                        maxValue: arg.max,
                        required: arg.required,
                        autocomplete: arg.extensions.includes(ArgExtension.AUTOCOMPLETE),
                        
                    }
                    break;
                }
            
                case ApplicationCommandOptionType.Boolean: {
                    option = {
                        name: arg.name,
                        description,
                        type: arg.type,
                        required: arg.required
                    }
                    break;
                }

                case ApplicationCommandOptionType.String: {
                    let choices: ApplicationCommandOptionChoiceData<string>[] = [];
                    const areChoicesIncluded = arg.extensions.includes(ArgExtension.CHOICES);
                    const areChoicesDefined = !isArgDataString && !!argData.choices;
                    if(areChoicesIncluded && areChoicesDefined) choices = argData.choices;
                    else if(areChoicesIncluded && !areChoicesDefined) throw `Option "${arg.name}" has included "${ArgExtension.CHOICES}" extension but hasn't defined choices in ArgData!`;
                    else if(!areChoicesIncluded && areChoicesDefined) throw `Option "${arg.name}" has defined choices in ArgData but hasn't included "${ArgExtension.CHOICES}" extension!`;

                    option = {
                        name: arg.name,
                        description,
                        type: arg.type,
                        min_length: arg.min,
                        max_length: arg.max,
                        required: arg.required,
                        autocomplete: arg.extensions.includes(ArgExtension.AUTOCOMPLETE),
                        choices
                    } 
                    break;
                }

                case ApplicationCommandOptionType.Role:
                case ApplicationCommandOptionType.User:
                case ApplicationCommandOptionType.Mentionable:
                case ApplicationCommandOptionType.Attachment: {
                    option = {
                        name: arg.name,
                        type: arg.type,
                        description,
                        required: arg.required,
                    }
                    break;
                }

                case ApplicationCommandOptionType.Channel: {
                    const channelTypes: ChannelType[] = !isArgDataString ? argData.channelTypes ?? [] : [];
                    option = {
                        name: arg.name,
                        type: arg.type,
                        description,
                        required: arg.required,
                        channelTypes,
                    }
                    break;
                }

                case ApplicationCommandOptionType.Subcommand:
                case ApplicationCommandOptionType.SubcommandGroup:
                default: break;
            }

            if(!option) return;
            applicationOptions.push(option);
        });

        return applicationOptions;
    }
}