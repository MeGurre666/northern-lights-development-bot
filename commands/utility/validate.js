const { SlashCommandBuilder} = require('discord.js');
const speakeasy = require('speakeasy');
const mysql = require('mysql2/promise');
const { database_name } = require('../../config.json');
const path = require('path');
const fs = require('fs');


const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: database_name,
    connectionLimit: 100,
});

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

        try {
            const connection = await pool.getConnection();

            try {
                const userId = interaction.user.id.toString();


                const [results] = await connection.query(`SELECT * FROM users WHERE id = ?`, [userId]);

                if (results.length === 0) {
                    interaction.reply({ content: 'You don\'t have an account! Please create one first using /2fa.', ephemeral: true });
                    return;
                }

                const secret = results[0].secret;
                const verified = speakeasy.totp.verify({ secret: secret, encoding: 'base32', token: code });

                if (verified) {
                    interaction.reply({ content: 'You have successfully validated your request', ephemeral: true });
                    await connection.query(`UPDATE users SET validate = 1 WHERE id = ?`, [userId]);
                } else {
                    interaction.reply({ content: 'The 2FA code that you entered is invalid, please try again and verify that it\'s correct.', ephemeral: true });
                }
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error:', error);
            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Validate | ${interaction.user.tag} (${interaction.user.id}) received an error | ${error.stack}\n`);
            interaction.reply({ content: 'An error occurred during the validation.', ephemeral: true });
        }
    },
};
