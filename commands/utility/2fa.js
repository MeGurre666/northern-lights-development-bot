const speakeasy = require('speakeasy');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit } = require('../../config.json');
const path = require('path');
const fs = require('fs');
const qr = require('qrcode');

const pool = createPool({
    host: database_host,
    user: database_user,
    password: database_password,
    database: database_name,
    connectionLimit: connection_limit,
});

async function checkValidationStatus(userId, connection) {
    try {
        const [results] = await connection.execute('SELECT validate FROM users WHERE id = ?', [userId]);
        const isValidateTrue = results.length > 0 && results[0].validate;
        return isValidateTrue;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}
async function generateQRCodeImage(otpAuthUrl) {
    return new Promise((resolve, reject) => {
        qr.toDataURL(otpAuthUrl, (qrError, qrCodeImageUrl) => {
            if (qrError) {
                reject(qrError);
            } else {
                resolve(Buffer.from(qrCodeImageUrl.split(',')[1], 'base64'));
            }
        });
    });
}
module.exports = {
    cooldown: 5,
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('2fa')
        .setDescription('Set up 2FA for your account!'),
    async execute(interaction) {
        const logPath = path.join(__dirname, '../../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);
        const application = await interaction.client.application?.fetch();
        const currentTime = date.getTime();
        const expirationTime = Math.floor(currentTime / 1000) + 300;

        try {
            const connection = await pool.getConnection();
            const userId = interaction.user.id.toString();
            const query = 'SELECT * FROM users WHERE id = ?';
            const [results] = await connection.execute(query, [userId]);

            if (results.length > 0) {
                const embed = new EmbedBuilder()
                    .setTitle('2FA Setup')
                    .setDescription('You already have 2FA set up!')
                    .addFields({ name: 'Disable 2FA', value: 'To disable 2FA, press the button below' })
                    .setColor('#037bfc')
                    .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('disable-2fa')
                            .setLabel('Disable 2FA')
                            .setStyle(ButtonStyle.Danger),
                    );

                interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            } else {
                const secret = speakeasy.generateSecret({ length: 20, name: `${issuer}` });
                const insertQuery = 'INSERT INTO users (id, secret, validate, setup_time) VALUES (?, ?, ?, ?)';
                await connection.execute(insertQuery, [userId, secret.base32, false, currentTime]);

                const otpAuthUrl = secret.otpauth_url;
                const qrCodeImageUrl = await generateQRCodeImage(otpAuthUrl);

                const embed = new EmbedBuilder()
                    .setTitle('2FA Setup')
                    .setDescription('Scan the QR code below with your 2FA app. If you cannot scan the QR code, you can manually enter the secret key.')
                    .setColor('#037bfc')
                    .addFields({ name: 'Apps', value: 'We recommend Google Authenticator on Mobile or Authenticator on the Chrome Web Store  ', inline: false })
                    .setImage('attachment://2fa-qrcode.png')
                    .addFields({ name: 'Expires', value: `<t:${expirationTime}:R>`, inline: false })
                    .addFields({ name: 'Validate', value: 'Validate your 2FA setup using /validate', inline: false })
                    .addFields({ name: 'Secret Key', value: secret.base32, inline: false })
                    .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });

                const initialResponse = await interaction.reply({
                    embeds: [embed],
                    files: [{ attachment: qrCodeImageUrl, name: '2fa-qrcode.png' }],
                    ephemeral: true,
                });

                const intervalId = setInterval(async () => {
                    const connectionStatus = await checkValidationStatus(userId, connection);

                    if (connectionStatus === null) {
                        clearInterval(intervalId);
                        return;
                    }

                    if (connectionStatus) {
                        const embed4 = new EmbedBuilder()
                            .setTitle('2FA Setup')
                            .setDescription('You have successfully set up 2FA!')
                            .setColor('#037bfc')
                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });

                        initialResponse.edit({ embeds: [embed4], files: [], components: [] });
                        clearInterval(intervalId);
                    } else {
                        const elapsedTime = (new Date().getTime() - currentTime) / 1000;

                        if (elapsedTime >= 5 * 60) {
                            const deleteQuery = 'DELETE FROM users WHERE id = ?';
                            await connection.execute(deleteQuery, [userId]);

                            const embed2 = new EmbedBuilder()
                                .setTitle('2FA Setup')
                                .setDescription('Your 2FA setup has expired. Please run the command again.')
                                .setColor('#037bfc')
                                .setTimestamp()
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });

                            initialResponse.edit({ embeds: [embed2], files: [], components: [] });
                            clearInterval(intervalId);
                        }
                    }
                }, 1000);
            }

            connection.release();
        } catch (error) {
            console.error('Error:', error);
            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error | ${error.stack}\n`);
            interaction.reply({ content: 'An error occurred during the 2FA setup.', ephemeral: true });
        }
    },
};
