const { Events } = require('discord.js');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const { database_name, database_host, database_password, database_user, connection_limit, issuer } = require('../config.json');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member) {
        const logPath = path.join(__dirname, '../../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);

        // Ensure the log directory exists
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
            const [results] = await connection.execute('SELECT * FROM blacklist WHERE id = ?', [member.id]);
            if (results.length > 0) {
                const guild = member.guild;
                if (guild.id === "1174863104115490919") {
                    const role = guild.roles.cache.get("1288185524560859208");
                    await member.roles.add(role);
                    fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [INFO] | Member ${member.id} assigned role ${role.id} in guild ${guild.id}\n`);
                } else {
                    await member.kick(`Blacklisted by ${results[0].blacklisted_by} for ${results[0].reason}`);
                    fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [INFO] | Member ${member.id} kicked from guild ${guild.id} for blacklist reason\n`);
                }
            }
        } catch (error) {
            console.error(`Error handling GuildMemberAdd event: ${error}`);
            fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [ERROR] | Error handling GuildMemberAdd event: ${error}\n`);
        } finally {
            await connection.end();
        }
    }
};