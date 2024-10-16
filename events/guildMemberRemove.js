const { Events, EmbedBuilder } = require('discord.js');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const { database_name, database_host, database_password, database_user, connection_limit, issuer } = require('../config.json');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member) {
        const logPath = path.join(__dirname, '../../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);

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
            const [results2] = await connection.execute('SELECT * from guilds where id = ?', [member.guild.id]);
            if (results2.length > 0) {
                if (results2[0].log_channel !== '') {
                    const guild = member.client.guilds.cache.get(results2[0].id);
                    const channel = guild.channels.cache.get(results2[0].log_channel);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setTitle(`User has left`)
                            .setDescription(`${member} has left the server`)
                            .setFooter(`ID: ${member.id}`)
                            .setThumbnail(member.user.displayAvatarURL())
                            .setTimestamp();

                        await channel.send({embeds: [embed] });
                    }
                }
            }
        } catch (error) {
            console.error(`Error handling GuildMemberRemove: ${error}`);
        } finally {
            await connection.end();
        }
    }
};