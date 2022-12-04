import { IEvent } from '../utils/interfaces/IEvent';
import { scheduleJob } from 'node-schedule';
import { addZero, generateNewCalendarDays } from '../utils/functions';
import { papiezowa, Participant } from '../utils/global';
import { ChannelType, Snowflake, TextChannel, VoiceChannel } from 'discord.js';
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel, NoSubscriberBehavior } from '@discordjs/voice';
import path from 'path';
import Bot from '../utils/bot';
import MySQL from '../utils/mysql';

const allEqual = (arr: BarkaVoiceChannel[]) => arr.every(val => val.streamingCount === arr[0].streamingCount);

interface BarkaVoiceChannel {
    id: Snowflake;
    count: number;
    streamingCount: number;
}

async function playBarka(client: Bot, db: MySQL) {
    const d = new Date();
    client.logger.info('================ BARKA - preparing to play ================\n');
    const isFirstTerm = (d.getHours() === 18); // czy jest 18?
    if(isFirstTerm) await db.prepare('DELETE FROM papiezowa_receivers').run();
    
    if(client.guilds.cache.size === 0) return;
    else '';

    let subscribers = 0;
    const broadcast = createAudioPlayer({ 
        behaviors: { 
            noSubscriber: NoSubscriberBehavior.Pause 
        } 
    });
    const targetVoiceChannelsId: Record<string, string> = {};
    
    let lastStoredLength = papiezowa.participants.length;
    const receivers: string[] = !isFirstTerm ? await db.prepare('SELECT id FROM papiezowa_receivers').pluck().all() : [];

    const papiezowaChannels: Record<string, string> = {};
    const papiezowaChannelsData = await db.prepare('SELECT id, papiezowaChannel FROM settings WHERE papiezowaChannel IS NOT NULL').all();
    if(papiezowaChannelsData && papiezowaChannelsData.length) papiezowaChannelsData.forEach(obj => papiezowaChannels[obj.id] = obj.papiezowaChannel);

    for await (const guild of client.guilds.cache.values()) {
        // Sprawdzanie czy na iterowanym serwerze ktokolwiek korzysta z kanałów głosowych.
        if(!guild || !guild.available || guild.voiceStates.cache?.size === 0) continue;


        // Wybranie docelowego kanału głosowego, na podstawie:
        // - obecności stałego kanału w bazie danych;
        // - w innym wypadku, na podstawie liczby użytkowników oraz obecności streamów na serwerze.
        // Możliwe przypadki:
        // 1. Jeżeli na jednym kanale jest stream, a na resztcie gdzie są ludzie nie ma ani jednego
        // bot przejdzie na kanał ze streamem, aby nie go nie przerywać.
        // 2. Jeżeli mamy więcej niż 1 stream, bot przejdzie tam gdzie jest najwięcej widzów (osoby na vc nie licząc streamerów).
        // 3. Jeżeli nie ma streamów, bot wybierze kanał z największą liczbą użytkowników.

        // Zdobycie id kanału głosowego dla danego serwera z bazy danych
        let targetVoiceChannelId: string = papiezowaChannels[guild.id];

        // Jeżeli w bazie nie ma ustawionego żadnego kanału - wyznaczenie odpowiedniego kanału
        if(!targetVoiceChannelId) {
            let voiceChannels: BarkaVoiceChannel[] = [];
            
            // Jeżeli ktoś prowadzi streama to wybierz kanał z największą liczbą widzów.
            const streamingMembers = guild.voiceStates.cache.filter(state => state.streaming);
            if(streamingMembers?.size > 0) {
                const arr = Array.from(streamingMembers.values());
                if(arr.length === 1) {
                    const streamerVoiceChannel = arr[0]?.channel;
                    const amount = streamerVoiceChannel?.members?.filter(m => !m.user.bot).size;
                    
                    // Jeżeli streamer ma jakicholwiek prawdziwych (nie botów) widzów
                    if(amount && amount > 1) {
                        targetVoiceChannelId = streamerVoiceChannel.id;
                    } 
                } else {
                    guild.channels.cache.forEach(channel => {
                        if(channel.type !== ChannelType.GuildVoice) return;
                        if(channel.id === guild.afkChannel?.id) return;

                        const realMembers = channel.members.filter(m => !m.user.bot);
                        voiceChannels.push({
                            id: channel.id,
                            count: realMembers.size,
                            streamingCount: realMembers.filter(m => m.voice.streaming).size
                        });
                    });

                    if(voiceChannels.length !== 0) {
                        const streamingVoiceChannels = voiceChannels.filter(channel => channel.streamingCount > 0);

                        // Jeżeli na wszystkich kanałach jest tyle samo streamów, posortuj względem widzów
                        if(streamingVoiceChannels.length > 1 && allEqual(streamingVoiceChannels)) streamingVoiceChannels.sort((a, b) => b.count - a.count);
                        
                        // Posortuj kanały względem ilości streamów
                        else if(streamingVoiceChannels.length > 1) streamingVoiceChannels.sort((a, b) => b.streamingCount - a.streamingCount);
                        
                        targetVoiceChannelId = streamingVoiceChannels[0]?.id;
                    }
                }
            } 
            
            // W innym wypadku jeżeli nikt nie prowadzi streama, posortuj i wybierz kanał z największą liczbą użytkowników.
            else {
                guild.channels.cache.forEach(channel => {
                    if(channel.type !== ChannelType.GuildVoice) return;
                    if(channel.id === guild.afkChannel?.id) return;

                    const count = channel.members.filter(m => !m.user.bot && !receivers.includes(m.user.id)).size;
                    if(count !== 0) {
                        voiceChannels.push({
                            id: channel.id,
                            count,
                            streamingCount: 0
                        });
                    }
                })

                if(voiceChannels.length !== 0) voiceChannels.sort((a, b) => b.count - a.count);
                targetVoiceChannelId = voiceChannels[0]?.id;
            }
        }
        
        // Sprawdzanie istnienia docelowego kanału głosowego
        if(!targetVoiceChannelId)  {
            client.logger.error(`ID WYBRANEGO KANAŁU GŁOSOWEGO NIE ISTNIEJE`);
            continue;
        }

        const targetVoiceChannel = guild.channels.cache.get(targetVoiceChannelId) as VoiceChannel;
        if(!targetVoiceChannel)  {
            client.logger.error(`NIE MOŻNA ZNALEŹĆ WYBRANEGO KANAŁU GŁOSOWEGO`);
            continue;
        }

        const targetVoiceChannelMembersWithoutBots = targetVoiceChannel.members.filter(m => !m.user.bot);
        if(targetVoiceChannel.type !== ChannelType.GuildVoice || targetVoiceChannelMembersWithoutBots.size === 0) {
            client.logger.error(`DOCELOWY KANAŁ GŁOSOWY NIE JEST TYPU KANAŁU GŁOSOWEGO LUB NIE MA NA NIM ŻADNEGO CZŁOWIEKA`);
            continue;
        }

        targetVoiceChannelsId[guild.id] = targetVoiceChannel.id;
        client.logger.info(`[${guild.id}] Docelowy kanał głosowy: ${targetVoiceChannel.id}, "${targetVoiceChannel.name}"\n`);

        // Przeniesienie wszystkich połącznych uczestników na docelowy kanał głosowy
        let movedCount = 0;
        for await (const state of guild.voiceStates.cache.values()) {
            if(!state || !state.member || state.member.user.bot || !state.channelId) continue;

            const stateHadReceived = receivers.includes(state.id);
            if(!stateHadReceived) {
                const newParticipant: Participant = {
                    id: state.member.user.id,
                    voiceChannelId: state.channelId,
                    guildId: guild.id
                }

                if(isFirstTerm) await db.prepare('INSERT INTO papiezowa_receivers(id) VALUES(?)').run(newParticipant.id);
                papiezowa.participants.push(newParticipant);

                const isTargetChannel = state.channelId === targetVoiceChannelId;
                const isAfkChannel = state.channelId === guild.afkChannel?.id;

                if(!isTargetChannel && !isAfkChannel) {
                    await state.setChannel(targetVoiceChannel, 'barka');
                    client.logger.success(`przeniesiono ${state.id}`);
                    movedCount++;
                }
            }
        }

        if(movedCount !== 0) console.log('');

        if(!papiezowa.participants || papiezowa.participants.length === 0) {
            client.logger.warn(`[${guild.id}] NIE DODANO ŻADNEGO UCZESTNIKA\n`);
            continue;
        }

        client.logger.success(`[${guild.id}] Added ${papiezowa.participants.length - lastStoredLength} participant(s)`);
        lastStoredLength = papiezowa.participants.length;

        // Zdobycie obiektu członka bota z interowanego serwera 
        let clientMember = guild.members.me;
        if(!clientMember) {
            client.logger.error(`NIE ZNALEZIONO CLIENT MEMBERA`);
            continue;
        }

        // Dołączenie na docelowy kanał głosowy i wyciszenie słuchawek 
        let connection = joinVoiceChannel({
            channelId: targetVoiceChannel.id,
            guildId: targetVoiceChannel.guildId,
            adapterCreator: targetVoiceChannel.guild.voiceAdapterCreator,
        });
        clientMember?.voice.setDeaf(true);

        papiezowa.active.push(targetVoiceChannel.guildId);

        // Ustawienie papieżowej jako aktywna i zagranie barki
        connection.subscribe(broadcast);
        subscribers++;
    }

    if(subscribers !== 0) {
        broadcast.play(createAudioResource(path.join(process.cwd(), './tracks/barka.mp3')));
        client.logger.warn(`ROZPOCZĘTO TRANSMISJĘ BARKI, liczba serwerów: ${subscribers}`);

        broadcast.on(AudioPlayerStatus.Idle, async () => {
            client.logger.info('================ BARKA - zakończono transmisję ================\n');

            // Dla zmiennej reward i obsługi kalendarza
            const currentDate = d.getDate();
            const currentMonth = d.getMonth(); 

            // Jeżeli jest obecnie 02.04 to 10 kremówek, jeżeli nie to 1.
            const reward = (currentDate === 2 && currentMonth === 3) ? 10 : 1;
            const currentTerm = isFirstTerm ? '1' : '2';

            // Stwórz dzisiejszą datę w formacie: DDMMYY oraz DDMMYY_T
            // T - obecny termin czyli która barka z kolei została puszczona
            const todayWithoutTerm = `${addZero(currentDate)}${addZero(currentMonth+1)}${d.getFullYear().toString().slice(2)}`;
            const today = `${todayWithoutTerm}_${currentTerm}`;
            
            const d1 = new Date();
            d1.setDate(currentDate - 1);
            // Stwórz WCZORAJSZĄ datę w formacie: DDMMYY
            const yesterdayWithoutTerm = `${addZero(d1.getDate())}${addZero(d1.getMonth()+1)}${d1.getFullYear().toString().slice(2)}`;

            const guilds: Set<string> = new Set();
            papiezowa.participants.forEach(participant => guilds.add(participant.guildId));

            const guildsParticipantsCount: Record<string, number> = {};
            guilds.forEach(guildId => {
                guildsParticipantsCount[guildId] = papiezowa.participants.filter(participant => participant.guildId === guildId).length;
            });

            client.logger.info('guildsParticipantsCount', guildsParticipantsCount, '\n')

            for await(const participant of papiezowa.participants) {
                const currentAmountOfPeopleParticipatedWith = guildsParticipantsCount[participant.guildId];
                const userData = await db.prepare(`SELECT balance, career, streak, highestStreak, lastTimeListened, theMostPeopleParticipedWith FROM papiezowa WHERE id=?`).get(participant.id);
                if(!userData) {
                    // Użytkownika nie ma w bazie danych, więc trzeba go dodać
                    const query = `INSERT INTO papiezowa(id, balance, lastTimeListened, theMostPeopleParticipedWith, theMostPeopleParticipedWithDate) VALUES(?, ?, ?, ?, ?)`;
                    await db.prepare(query).run(participant.id, reward, today, currentAmountOfPeopleParticipatedWith, today);
                    client.logger.success(`[papiezowa] użytkownik ${participant.id} został dodany po raz pierwszy`);
                } else {
                    // Skoro użytkownik istnieje w bazie, zaktualizuj jego podstawowe dane, gdyż właśnie wysłuchał barkę
                    const query = `UPDATE papiezowa SET career=career+1, balance=?, listenedToday=1, lastTimeListened=? WHERE id=?`;
                    await db.prepare(query).run(userData.balance + reward, today, participant.id);

                    // Jeżeli użytkownik ostatnio słuchał barki wczoraj, dodaj mu punkt streak'u
                    // Jeżeli ten streak po dodaniu będzie większy od największego streak'u użytkownika w historii zaktualizuj go.
                    // użyto tutaj startsWith, bo lastTimeListened zapisuje także porę słuchania a nie samą datę, np. 150322_1
                    if(userData.lastTimeListened.startsWith(yesterdayWithoutTerm)) {
                        const highestStreak = (userData.streak+1 > userData.highestStreak) ? userData.streak+1 : userData.highestStreak;
                        await db.prepare('UPDATE papiezowa SET streak=streak+1, highestStreak=? WHERE id=?').run(highestStreak, participant.id);
                    } 
                    
                    // Jeżeli użytkownik nie słuchał barki resetujemy streak
                    else {
                        // W momencie gdy obecny streak jest większy bądź równy najwyższemu obecnemu streakowi (czyli użytkownik ma w tym momencie najwyższy streak)
                        if(userData.streak >= userData.highestStreak) await db.prepare('UPDATE papiezowa SET highestStreakLossDate=? WHERE id=?').run(todayWithoutTerm, participant.id);
                        
                        // Wiemy, że użytkownik nie słuchał barki wczoraj, więc zaczyna streak od nowa dlatego ustaw jego wartość na 1
                        await db.prepare('UPDATE papiezowa SET streak=1 WHERE id=?').run(participant.id);
                    }

                    // Jeżeli obecna liczba uczestników na danym serwerze po obecnej barce była większa niż
                    // jakakolwiek taka liczba w karierze uczetnika to zaktualizuj tą wartość, przy okazji aktualizując także datę wystąpienia
                    if(currentAmountOfPeopleParticipatedWith > userData.theMostPeopleParticipedWith) {
                        const query = 'UPDATE papiezowa SET theMostPeopleParticipedWith=?, theMostPeopleParticipedWithDate=? WHERE id=?';
                        await db.prepare(query).run(currentAmountOfPeopleParticipatedWith, today, participant.id);
                    }

                    client.logger.success(`[papiezowa] użytkownik ${participant.id} został zaktualizowany`);
                } 

                const userCalendar = await db.prepare(`SELECT days FROM papiezowa_calendar WHERE id=? AND month=?`).pluck().get(participant.id, currentMonth);
                if(!userCalendar) {
                    // funkcja tworzy stringa z kalendarzem na obecny miesiąc, wypełniając podanym 
                    // w argumencie znakiem dopasowany index (licząc od 1), który odpowiada obecnemu dniu miesiąca, np.
                    // obecna data: 03.02.2022r. 21:37
                    // zwracana wartość: 0020000000000000000000000000 (długość: 28)
                    const calendarDays = generateNewCalendarDays(currentTerm);
                    await db.prepare(`INSERT INTO papiezowa_calendar(id, month, days) VALUES(?, ?, ?)`).run(participant.id, currentMonth, calendarDays);
                    client.logger.success(`[papiezowa_calendar] obecny miesiąc z kalendarza dla użytkownika ${participant.id} został po raz pierwszy dodany`);
                } 

                // W innym wypadku użytkownik jest w bazie danych, więc trzeba zaktualizować mu kalendarz
                else {
                    await db.prepare('UPDATE papiezowa_calendar SET days=INSERT(days, ?, 1, ?) WHERE id=? AND month=?').run(currentDate, currentTerm, participant.id, currentMonth);
                    client.logger.success(`[papiezowa_calendar] obecny miesiąc z kalendarza dla użytkownika ${participant.id} został zaktualizowany`);
                }

                // Jeżeli kanał uczestnika (przed przeniesieniem i zagraniem barki)
                // nie był docelowym kanałem przenieś go spowrotem
                if(participant.voiceChannelId !== targetVoiceChannelsId[participant.guildId]) {
                    const state = client.guilds.cache.get(participant.guildId)?.voiceStates.cache.get(participant.id);
                    if(state && state.channel) {
                        await state.setChannel(participant.voiceChannelId, 'barka - powrót');
                        client.logger.success(`przeniesiono spowrotem ${state.id}`);
                    }
                }
                console.log('');
            }

            // Jeżeli jest pierwszy termin (18:31) to wprowadź nowy rekord do dziennika
            if(isFirstTerm) {
                for await(const guildId of guilds) {
                    await db.prepare('INSERT INTO papiezowa_diary(id, date, firstTermParticipants) VALUES(?,?,?)').run(guildId, todayWithoutTerm, guildsParticipantsCount[guildId]);
                    client.logger.success(`[papiezowa_diary] dodano liczbę uczestników w dniu ${todayWithoutTerm} dla serwera ${guildId} (${guildsParticipantsCount[guildId]}, NULL)`);
                }
            }
            
            // W innym wypadku czyli takim, gdzie jest grany docelowy termin (21:37)
            // sprawdź czy rekord już istnieje (czy barka była grana o 18:31)
            // jeżeli nie to go wprowadź, jeżeli tak to go zaktualizuj
            else {
                for await(const guildId of guilds) {
                    const record = await db.prepare('SELECT id, firstTermParticipants FROM papiezowa_diary WHERE id=? AND date=?').get(guildId, todayWithoutTerm);
                    if(!record) {
                        await db.prepare('INSERT INTO papiezowa_diary(id, date, firstTermParticipants, targetTermParticipants) VALUES(?,?,?,?)').run(guildId, todayWithoutTerm, 0, guildsParticipantsCount[guildId]);
                        client.logger.success(`[papiezowa_diary] dodano liczbę uczestników z serwera ${guildId} dla dnia ${todayWithoutTerm} (0, ${guildsParticipantsCount[guildId]})`);
                    } else {
                        await db.prepare('UPDATE papiezowa_diary SET targetTermParticipants=? WHERE id=? AND date=?').run(guildsParticipantsCount[guildId], guildId, todayWithoutTerm);
                        client.logger.success(`[papiezowa_diary] zaktualizowano liczbę uczestników z serwera ${guildId} dla dnia ${todayWithoutTerm} (${record.firstTermParticipants}, ${guildsParticipantsCount[guildId]})`);
                    }
                }
            }

            console.log('')

            // Wszystkie akcje z uczesnikami zostały zakończone
            // Wyczyszczenie tablicy uczestników na kolejną barkę
            papiezowa.participants = [];

            if(!isFirstTerm) {
                await db.prepare(`UPDATE papiezowa SET highestStreakLossDate=? WHERE highestStreak!=0 AND listenedToday=0 AND streak >= highestStreak`).run(todayWithoutTerm);
                await db.prepare(`UPDATE papiezowa SET streak=0 WHERE listenedToday=0`).run();
                client.logger.success(`[papiezowa] zresetowano streak wszystkim osobom, które nie wysłuchały dzisiaj barki`);
                await db.prepare('DELETE FROM papiezowa_receivers').run();
                client.logger.success(`[papiezowa_receivers] usunięto zawartość tabeli`);
            }

            papiezowa.active.forEach(guildId => {
                getVoiceConnection(guildId)?.disconnect();
            });

            papiezowa.active = [];

            client.logger.warn(`PROCES BARKI ZOSTAŁ ZAKOŃCZONY (${isFirstTerm ? '18:31' : '21:37'})\n`);
        });
    } else client.logger.warn(`PROCES BARKI ZOSTAŁ ZAKOŃCZONY (${isFirstTerm ? '18:31' : '21:37'})\n`);
}

export const event: IEvent<'ready'> = {
    listener: 'ready',
    once: true,
    execute: async (client, db) => {
        scheduleJob({ hour: 18, minute: 31 }, () => {
            playBarka(client, db);
        });

        scheduleJob({ hour: 21, minute: 37 }, () => {
            playBarka(client, db);
        });

        scheduleJob({ hour: 0, minute: 0 }, async () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const todayWithoutTerm = `${addZero(d.getDate())}${addZero(d.getMonth()+1)}${d.getFullYear().toString().slice(2)}`;
            await db.prepare('UPDATE papiezowa SET highestStreakLossDate=? WHERE listenedToday=0 AND streak >= highestStreak').run(todayWithoutTerm);
            await db.prepare(`UPDATE papiezowa SET streak=0 WHERE listenedToday=0`).run();
            client.logger.success(`[papiezowa] zresetowano streak wszystkim osobom, które nie wysłuchały dzisiaj barki`);
            await db.prepare(`UPDATE papiezowa SET listenedToday=0`).run();
            client.logger.success(`[papiezowa] ustawiono wszystkim status dziesiejszego wysłuchania barki na 0`);
        });

        scheduleJob({ hour: 20, minute: 0, dayOfWeek: 0 }, async () => {
            const channel = client.channels.cache.get('788749275625947167') as TextChannel;
            if(channel && process.env.SUPER_SECRET_IMAGE) {
                channel.send(process.env.SUPER_SECRET_IMAGE);
            }
        });
    }
}