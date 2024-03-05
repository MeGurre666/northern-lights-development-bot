const { Events } = require('discord.js');
const { ActivityType } = require('discord.js');
const {activity, type, status} = require('../config.json');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const {database_name} = require('../config.json');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		client.user.setActivity(activity, { type: ActivityType[type] });
		client.user.setStatus(status);
		client.user.setUsername('Northern Lights Development');
		const logPath = path.join(__dirname, '../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: database_name,
        });
		connection.connect((err) => {
			if (err) {
				fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | File: ready.js | Error connecting to database: ${err}\n`);
				return;
			}
			client.guilds.cache.forEach(guild => {
				const guildId = guild.id
				connection.query(`SELECT * FROM guilds WHERE guild_id = '${guildId}'`, (err, results) => {
					if (err) {
						fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | File: ready.js | Error getting guild data: ${err}\n`);
						return;
					}
					if (results.length === 0) {
						connection.query(`INSERT INTO guilds (guild_id, fa_req, raid_channels, advanced_mod, basic_mod, log_channel, raid_mode, raid_mode_time, ban_perms, tickets) VALUES ('${guildId}', 0, '', '', '', '', 0, NULL, '', '')`, (err, results) => {
							if (err) {
								fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | File: ready.js | Error inserting guild data: ${err}\n`);
								return;
							}
						});
					}
				});
			});
		}
	)}
};