const { Events } = require('discord.js');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

module.exports = {
	name: Events.GuildCreate,
	once: true,
	execute(guild) {
		const logPath = path.join(__dirname, '../../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);
        const currentTime = date.getTime();
        const expirationTime = Math.floor(currentTime / 1000) + 300;
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
			fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | File: GuildCreate.js | Connected to database=\n`);

        })
    }
}
