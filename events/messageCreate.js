const { Events, EmbedBuilder } = require('discord.js');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const { database_name, database_host, database_password, database_user } = require('../config.json');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message) {
        const logPath = path.join(__dirname, '../../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

        if (!fs.existsSync(logPath)) {
            fs.mkdirSync(logPath, { recursive: true });
        }

        const connection = await mysql.createConnection({
            host: database_host,
            user: database_user,
            password: database_password,
            database: database_name,
        });

        try {
            const [status] = await connection.execute('SELECT * FROM guilds WHERE id = ?', [message.guild.id]);
            if (status[0].chatfilter === 0) {
                return;
            } else if (status[0].chatfilter === 1) {
                const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discordapp\.com\/invite|\.gg)\/([a-zA-Z0-9-]+)/;
                const inviteMatch = message.content.match(inviteRegex);
        
                if (inviteMatch) {
                    const inviteCode = inviteMatch[1];
                    try {
                        const invite = await message.client.fetchInvite(inviteCode);
                        const allowedGuilds = ['1174863104115490919', '1221116174637727784', '1191193082478219405', '1288931169727025185'];
        
                        if (allowedGuilds.includes(invite.guild.id)) {
                            return;
                        }
                    } catch (error) {
                        console.error(`Error fetching invite: ${error}`);
                        await message.delete();
                        return;
                    }
                }
            }
        
                const [words] = await connection.execute('SELECT * FROM chatfilter');
                for (const word of words) {
                    if (message.content.toLowerCase().includes(word.word.toLowerCase())) {
                        const bypassIds = word.bypass ? word.bypass.split(',') : [];
                        if (message.member.roles.cache.some(role => bypassIds.includes(role.id)) || bypassIds.includes(message.author.id)) {
                            return;
                        } else {
                            if (!message.author.bot) {
                                await message.delete();
                                const timeoutDuration = word.punishment * 1000;
                                await message.member.timeout(timeoutDuration, `Chat filter violation: ${word.word}`);
                                const guild = message.client.guilds.cache.get('1174863104115490919');
                                const channel = guild.channels.cache.get('1288235979219402762');
                                const embed = new EmbedBuilder()
                                    .setTitle('Chat Filter')
                                    .setDescription('A message was deleted due to a chat filter violation flag.')
                                    .addFields(
                                        { name: 'User', value: `${message.author} | ${message.author.id}`, inline: true },
                                        { name: 'Flag', value: word.word, inline: true },
                                        { name: 'Message', value: message.content }
                                    )
                                    .setColor('#FF0000');
                                await channel.send({ embeds: [embed] });
                                return;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Error in messageCreate event: ${error}`);
            }
        try {

            const [results] = await connection.execute('SELECT * FROM sticky WHERE channel_id = ?', [message.channel.id]);
            if (results.length > 0) {
                const stickyMessageId = results[0].id;
                const stickyMessageContent = results[0].message;
                if (stickyMessageId === message.id) {
                    return;
                }
                const fetchedMessages = await message.channel.messages.fetch({ limit: 1 });
                const latestMessage = fetchedMessages.first();

                if (latestMessage.id !== stickyMessageId && latestMessage.author.id !== message.client.user.id) {
                    try {
                        // Fetch and delete the previous sticky message
                        const stickyMessage = await message.channel.messages.fetch(stickyMessageId);
                        if (stickyMessage) {
                            await stickyMessage.delete();
                        }
                    } catch (error) {
                        console.error(`Failed to fetch or delete previous sticky message with ID ${stickyMessageId}: ${error}`);
                    }
                    const sentMessage = await message.channel.send(`__**Sticked Message**__\n\n${stickyMessageContent}`);
                    await connection.execute('UPDATE sticky SET id = ? WHERE channel_id = ?', [sentMessage.id, message.channel.id]);
                }
            }
        } catch (error) {
            console.error(`Error in messageCreate event: ${error}`);
        } finally {
            await connection.end();
        }
    }
};