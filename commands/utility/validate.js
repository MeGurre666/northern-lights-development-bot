const { SlashCommandBuilder, EmbedBuilder, IntegrationExpireBehavior } = require('discord.js');
const speakeasy = require('speakeasy');
const mysql = require('mysql2');
const { database_name} = require('../../config.json');
const path = require('path');
const fs = require('fs');
const logPath = path.join(__dirname, '../../logs');
const date = new Date();
const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const logFilePath = path.join(logPath, `${dateStr}.log`);
module.exports = {
    cooldown: 5,
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('validate')
        .setDescription('Validate your request!')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Your 2FA code.')
                .setRequired(true)),
	async execute(interaction) {
        const code = interaction.options.getString('code');
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: database_name,
        });
        connection.connect((err) => {
            if (err) {
                console.error('Error connecting to the database:', err);
                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Validate | ${interaction.user.tag} (${interaction.user.id}) received an error while connecting to the database | ${err.stack}\n`);
                return;
            }
            fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | ${interaction.user.tag} (${interaction.user.id}) connected to the database.\n`);
            const userId = interaction.user.id.toString();
            connection.query(`SELECT * FROM users WHERE id = '${userId}'`, (err, results) => {
                if (err) {
                    console.error('Error getting user data:', err);
                    fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Validate | ${interaction.user.tag} (${interaction.user.id}) received an error while getting user data | ${err.stack}\n`);
                    return;
                }
                if (results.length === 0) {
                    fs.appendFileSync(logFilePath, `[WARN] ${new Date().toLocaleTimeString()} | Command: Validate | ${interaction.user.tag} (${interaction.user.id}) tried to validate their 2FA code, but they don't have an account.\n`);
                    interaction.reply({ content: 'You don\'t have an account! Please create one first using /2fa.', ephemeral: true });
                    return;
                }
                const secret = results[0].secret;
                const verified = speakeasy.totp.verify({ secret: secret, encoding: 'base32', token: code });
                if (verified) {
                    fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | Command: Validate | ${interaction.user.tag} (${interaction.user.id}) successfully validated their reqyest.\n`);
                    interaction.reply({ content: 'You have successfully validated your request', ephemeral: true });
                    connection.query(`UPDATE users SET validate = 1 WHERE id = '${userId}'`, (err, results) => {
                        if (err) {
                            console.error('Error updating user data:', err);
                            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Validate | ${interaction.user.tag} (${interaction.user.id}) received an error while updating user data | ${err.stack}\n`);
                            return;
                        }
                        fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | Command: Validate | ${interaction.user.tag} (${interaction.user.id}) updated their user data.\n`);
                    });
                } else {
                    fs.appendFileSync(logFilePath, `[WARN] ${new Date().toLocaleTimeString()} | Command: Validate | ${interaction.user.tag} (${interaction.user.id}) tried to validate their 2FA code, but it was invalid.\n`);
                    interaction.reply({ content: 'The 2FA code that you entered is invalid, please try and again and verify that it\'s correct.', ephemeral: true });
                }
            });
        }
        );

    }
};
