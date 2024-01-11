const { Events } = require('discord.js');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const {database_name} = require('../config.json');
module.exports = {
	name: Events.GuildCreate,
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
				fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | File: GuildCreate.js | Error connecting to database: ${err}\n`);
				return;
			}
			const guildId = guild.id
            connection.query(`SELECT * FROM guilds WHERE guild_id = '${guildId}'`, (err, results) => {
                if (err) {
                    fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | File: GuildCreate.js | Error getting guild data: ${err}\n`);
                    return;
                }
                if (results.length === 0) {
                    connection.query(`INSERT INTO guilds (guild_id, fa_req, raid_channels, advanced_mod, basic_mod, log_channel, raid_mode, raid_mode_time, ban_perms, tickets) VALUES ('${guildId}', 0, '', '', '', '', 0, NULL, '', '')`, (err, results) => {
                        if (err) {
                            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | File: GuildCreate.js | Error inserting guild data: ${err}\n`);
                            return;
                        }
                    });
                }
            }
        )}
    )}
};
