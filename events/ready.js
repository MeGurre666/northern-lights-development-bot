const { Events } = require('discord.js');
const { ActivityType } = require('discord.js');
const { activity, type, status } = require('../config.json');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { database_name, database_host, database_password, database_user } = require('../config.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        client.user.setActivity(activity, { type: ActivityType[type] });
        client.user.setStatus(status);
        const logPath = path.join(__dirname, '../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);

        try {
            const connection = await mysql.createConnection({
                host: database_host,
                user: database_user,
                password: database_password,
                database: database_name,
            });

            const [dbGuilds] = await connection.query('SELECT id FROM guilds');
            const dbGuildIds = dbGuilds.map(guild => guild.id);

            const clientGuilds = client.guilds.cache.map(guild => guild.id);
            const newGuilds = clientGuilds.filter(guildId => !dbGuildIds.includes(guildId));

            for (const guildId of newGuilds) {
                await connection.query('INSERT INTO guilds (id) VALUES (?)', [guildId]);
            }

            const [guilds] = await connection.query('SELECT * FROM guilds');
            for (const guildData of guilds) {
                const guild = client.guilds.cache.get(guildData.id);
                if (!guild) continue;

                const [stickies] = await connection.query('SELECT * FROM sticky WHERE guild_id = ?', [guild.id]);
                for (const sticky of stickies) {
                    const channel = guild.channels.cache.get(sticky.channel_id);
                    if (!channel) continue;

                    try {
                        const previousMessage = await channel.messages.fetch(sticky.id);
                        if (previousMessage) {
                            await previousMessage.delete();
                        }
                    } catch (error) {
                        console.log(`Failed to delete previous message with ID ${sticky.id}: ${error}`);
                    }

                    const messageContent = `__**Stickied Message**__\n\n${sticky.message}`;
                    const sentMessage = await channel.send(messageContent);

                    // Update the sticky message ID in the database
                    await connection.query('UPDATE sticky SET id = ? WHERE guild_id = ? AND channel_id = ?', [sentMessage.id, guild.id, channel.id]);
                }
            }

            await connection.end();
        } catch (err) {
            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | File: ready.js | Error: ${err}\n`);
        }
    }
};