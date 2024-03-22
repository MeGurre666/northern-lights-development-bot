const { Events } = require('discord.js');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const {database_name} = require('../config.json');

module.exports = {
	name: Events.GuildDelete,
	once: true,
	execute(guild) {
		const logPath = path.join(__dirname, '../../logs');
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
				fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | File: GuildDelete.js | Error connecting to database: ${err}\n`);
				return;
			}
			const guildId = guild.id
            connection.query(`SELECT * FROM guilds WHERE id = '${guildId}'`, (err, results) => {
                if (err) {
                    fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | File: GuildDelete.js | Error getting guild data: ${err}\n`);
                    return;
                }
                if (results.length  <= 1) {
					connection.query(`DELETE FROM guilds WHERE id = '${guildId}'`, (err, results) => {
						if (err) {
							fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | File: GuildDelete.js | Error deleting guild data: ${err}\n`);
							return;
						}
					});
				}
			}
		)}
		)}
};