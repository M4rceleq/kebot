export enum ParserChars {
    REQUIRED_OPENING = '<',
    REQUIRED_ENDING = '>',

    OPTIONAL_OPENING = '[',
    OPTIONAL_ENDING = ']',

    NAME_TYPE_SEPERATOR = ':',
    NAME_EXTENSION_SEPERATOR = ';',
    EXTENSIONS_SEPERATOR = '&'
}

export enum ArgType {
    STRING = 'string',
    INTEGER = 'integer',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    USER = 'user',
    CHANNEL = 'channel',
    ROLE = 'role',
    MENTIONABLE = 'mentionable',
    ATTACHMENT = 'attachment',
    MEMBER = 'member',
}

export enum ArgExtension {
    CHOICES = 'choices',
    AUTOCOMPLETE = 'autocomplete',
    MIN_MAX = 'min-max',
}

type ExtensionableTypes = ArgType.STRING | ArgType.NUMBER | ArgType.INTEGER;
type NonExtensionableTypes = ArgType.BOOLEAN | ArgType.USER | ArgType.CHANNEL | ArgType.ROLE | ArgType.MENTIONABLE | ArgType.ATTACHMENT | ArgType.MEMBER;

type ExtensionMinMax = `${number | ''}-${number | ''}` | `${number}-${number | 'X'}` | `${number | 'X'}-${number}`;
type MixableExtensions = ArgExtension.AUTOCOMPLETE | ExtensionMinMax;

type S = ' ' | ''; // space

type Inner = `${string}${S}${ParserChars.NAME_TYPE_SEPERATOR}${S}${NonExtensionableTypes | `${ExtensionableTypes}${`${ParserChars.NAME_EXTENSION_SEPERATOR}${S}${MixableExtensions | `${MixableExtensions}${S}${ParserChars.EXTENSIONS_SEPERATOR}${S}${MixableExtensions}` | ArgExtension.CHOICES}` | ''}`}`;

export type Option = `${ParserChars.REQUIRED_OPENING}${Inner}${ParserChars.REQUIRED_ENDING}` | `${ParserChars.OPTIONAL_OPENING}${Inner}${ParserChars.OPTIONAL_ENDING}`;