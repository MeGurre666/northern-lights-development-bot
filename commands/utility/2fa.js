const { SlashCommandBuilder, EmbedBuilder, IntegrationExpireBehavior } = require('discord.js');
const speakeasy = require('speakeasy');
const mysql = require('mysql2');
const { database_name, issuer } = require('../../config.json');
const path = require('path');
const fs = require('fs');
const qr = require('qrcode');
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
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: database_name,
        });
        connection.connect((err) => {
            if (err) {
                console.error('Error connecting to the database:', err);
                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error while connecting to the database | ${err.stack}\n`);
                return;
            }
            fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | Command: 2FA | ${interaction.user.tag} (${interaction.user.id}) connected to the database.\n`);
            const userId = interaction.user.id.toString();
            const query = `SELECT * FROM users WHERE id = ?`;
            connection.query(query, [userId], (queryError, results, fields) => {
                if (queryError) {
                    console.error('Error executing database query:', queryError);
                    fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error while checking user existence | ${queryError.stack}\n`);
                    return;
                }
                if (results.length > 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('2FA Setup')
                        .setDescription('You already have 2FA set up!')
                        .setColor('#037bfc')
                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                } else {
                    const secret = speakeasy.generateSecret({ length: 20, name: `${issuer}` });

                    const insertQuery = 'INSERT INTO users (id, secret, validate, setup_time) VALUES (?, ?, ?, ?)';
                    connection.query(insertQuery, [userId, secret.base32, false, currentTime], (insertError, insertResults, insertFields) => {
                        if (insertError) {
                            console.error('Error executing insert query:', insertError);
                            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error while inserting user | ${insertError.stack}\n`);
                            return;
                        }
                        const otpAuthUrl = secret.otpauth_url;
                        qr.toDataURL(otpAuthUrl, async (qrError, qrCodeImageUrl) => {
                            if (qrError) {
                                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | ${interaction.user.tag} (${interaction.user.id}) received an error while generating QR code | ${qrError.stack}\n`);
                                return;
                            }
                            const embed = new EmbedBuilder()
                                .setTitle('2FA Setup')
                                .setDescription('Scan the QR code below with your 2FA app. If you cannot scan the QR code, you can manually enter the secret key.')
                                .setColor('#037bfc')
                                .addFields({ name: 'Apps', value: 'We recommend Google Authenticator on Mobile or Authenticator on the Chrome Web Store  ', inline: false })
                                .setImage('attachment://2fa-qrcode.png')
                                .addFields({ name: 'Expires', value: `<t:${expirationTime}:R>`, inline: false })
                                .addFields({ name: 'Validate', value: `Validate your 2FA setup using /validate`, inline: false })
                                .addFields({ name: 'Secret Key', value: secret.base32, inline: false })
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });

                            const initialResponse = await interaction.reply({
                                embeds: [embed],
                                files: [{ attachment: Buffer.from(qrCodeImageUrl.split(',')[1], 'base64'), name: '2fa-qrcode.png ' }],
                                ephemeral: true,
                            });
                            fs.appendFileSync(logFilePath, `[COMMAND] ${new Date().toLocaleTimeString()} | Command: 2FA | ${interaction.user.tag} (${interaction.user.id}) ran 2FA setup.\n`);
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
                                    fs.appendFileSync(logFilePath, `[COMMAND] ${new Date().toLocaleTimeString()} | Command: 2FA | ${interaction.user.tag} (${interaction.user.id}) successfully set up 2FA.\n`);
                                    clearInterval(intervalId);
                                } else {
                                    const elapsedTime = (new Date().getTime() - currentTime) / 1000;
                                    if (elapsedTime >= 5 * 60) {
                                        const deleteQuery = 'DELETE FROM users WHERE id = ?';
                                        connection.query(deleteQuery, [userId], (deleteError, deleteResults, deleteFields) => {
                                            if (deleteError) {
                                                console.error('Error executing delete query:', deleteError);
                                                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error while deleting user | ${deleteError.stack}\n`);
                                                return;
                                            }
                                        });
                                        const embed2 = new EmbedBuilder()
                                            .setTitle('2FA Setup')
                                            .setDescription('Your 2FA setup has expired. Please run the command again.')
                                            .setColor('#037bfc')
                                            .setTimestamp()
                                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                        initialResponse.edit({ embeds: [embed2], files: [], components: [] });
                                        fs.appendFileSync(logFilePath, `[COMMAND] ${new Date().toLocaleTimeString()} | Command: 2FA | ${interaction.user.tag} (${interaction.user.id}) 2FA setup expired.\n`);
                                        clearInterval(intervalId);
                                    }
                                }
                            }, 1000);
                        });
                    });
                }
            });
        });
    },
};
async function checkValidationStatus(userId, connection) {
    return new Promise((resolve) => {
        const validationStatusQuery = 'SELECT validate FROM users WHERE id = ?';
        connection.query(validationStatusQuery, [userId], (statusQueryError, statusResults, statusFields) => {
            if (statusQueryError) {
                console.error('Error executing status query:', statusQueryError);
                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: 2FA ${interaction.user.tag} (${interaction.user.id}) received an error while checking validation status | ${statusQueryError.stack}\n`);
                resolve(null);
            }
            const isValidateTrue = statusResults.length > 0 && statusResults[0].validate;
            resolve(isValidateTrue);
        });
    });
}
