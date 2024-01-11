const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mysql = require('mysql2');
const { database_name } = require('../../config.json');
const path = require('path');
const fs = require('fs');

module.exports = {
    cooldown: 5,
    category: 'guild',
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('The settings for the bot!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The category to edit!')
                .setRequired(true)
                .addChoices(
                    { name: '2FA', value: '2fa' },
                    { name: 'Logging', value: 'logging' },
                    { name: 'Ban Permissions', value: 'banpermissions' },
                    { name: 'Basic Moderation Permissions', value: 'basicmoderationpermissions' },
                    { name: 'Advanced Moderation Permissions', value: 'advancedmoderationpermissions' },
                    { name: 'Developer Roles', value: 'developerroles' },
                    { name: 'Raid Mode Channels', value: 'raidmodechannels' },
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
    async execute(interaction) {
        const userId = interaction.user.id;
        const logPath = path.join(__dirname, '../../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);
        const category = interaction.options.getString('category');
        const application = await interaction.client.application?.fetch();
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: database_name,
        });

        connection.connect((err) => {
            if (err) {
                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Settings | ${interaction.user.tag} (${interaction.user.id}) received an error while connecting to the database | ${err.stack}\n`);
                return;
            }
            const guildId = interaction.guild.id;
            const query = `SELECT * FROM guilds WHERE guild_id = ?`;
            connection.query(query, [guildId], (queryError, results, fields) => {
                if (queryError) {
                    fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Settings | ${interaction.user.tag} (${interaction.user.id}) received an error while checking guild existence | ${queryError.stack}\n`);
                    return;
                }

                if (category === '2fa') {
                    if (results[0].fa_req === 1) {
                        const embed = new EmbedBuilder()
                            .setTitle('2FA Settings')
                            .setDescription('2FA is currently required for this server!')
                            .addFields({ name: 'Disable 2FA', value: 'To Disable 2FA being required for this server, click the button below!' })
                            .setColor('#037bfc')
                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('disable2fa')
                                    .setLabel('Disable 2FA')
                                    .setStyle(ButtonStyle.Danger)
                            );
                        interaction.reply({ embeds: [embed], components: [row], ephemeral:true });
                        const collection = interaction.channel.createMessageComponentCollector({ time: 15000 });
                        collection.on('collect', async i => {
                            if (i.customId === 'disable2fa') {
                                const query2 = `SELECT * FROM users WHERE id = ?`;
                                connection.query(query2, [interaction.user.id], (queryError2, results2, fields2) => {
                                    if (queryError2) {
                                        fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Settings | ${interaction.user.tag} (${interaction.user.id}) received an error while checking user existence | ${queryError2.stack}\n`);
                                        return;
                                    }
                                    if (results2.length === 0) {
                                        const embed2 = new EmbedBuilder()
                                            .setTitle('2FA Settings')
                                            .setDescription('You need to have 2FA setup for your account due to it being required to make changes to the server!')
                                            .setColor('#037bfc')
                                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                        interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                                    } else {
                                        const currentTime = date.getTime();
                                        const expirationTime = Math.floor(currentTime / 1000) + 300;
                                        const embed2 = new EmbedBuilder()
                                            .setTitle('2FA Setup')
                                            .setDescription('To disable 2FA as a requirement you must validate your action')
                                            .addFields({ name: '2FA Code', value: 'Please use the /validate command to validate your action!' })
                                            .addFields({ name: '2FA Code', value: 'If you have lost your 2FA code, please join the support server and ask for help!' })
                                            .addFields({ name: 'Support Server', value: 'https://megurre666.zip' })
                                            .addFields({ name: 'Expiration', value: `This interaction will expire in <t:${expirationTime}:R>` })
                                            .setColor('#037bfc')
                                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                        interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                                        connection.query(`UPDATE users SET validate = 0 WHERE id = '${interaction.user.id}'`, (err, results) => {
                                            if (err) {
                                                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Setup | ${interaction.user.tag} (${interaction.user.id}) received an error while updating user data | ${err.stack}\n`);
                                                return;
                                            }
                                            const intervalId = setInterval(async () => {
                                                const connectionStatus = await checkValidationStatus(userId, connection);
                                                if (connectionStatus === null) {
                                                    clearInterval(intervalId);
                                                    return;
                                                }
                                                if (connectionStatus) {
                                                    const embed4 = new EmbedBuilder()
                                                        .setTitle('2FA Setup')
                                                        .setDescription('You have successfully disabled 2FA Requirement!')
                                                        .setColor('#037bfc')
                                                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                                    interaction.editReply({ embeds: [embed4], components: [], ephemeral: true });
                                                    clearInterval(intervalId);
                                                    connection.query(`UPDATE guilds SET fa_req = 0 WHERE guild_id = '${guildId}'`, (err, results) => {
                                                        if (err) {
                                                            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Setup | ${interaction.user.tag} (${interaction.user.id}) received an error while updating guild data | ${err.stack}\n`);
                                                            return;
                                                        }
                                                    });
                                                } else {
                                                    const elapsedTime = (new Date().getTime() - currentTime) / 1000;
                                                    if (elapsedTime >= 5 * 60) {
                                                        const embed2 = new EmbedBuilder()
                                                            .setTitle('2FA Settings')
                                                            .setDescription('The action has expired. Please run the command again.')
                                                            .setColor('#037bfc')
                                                            .setTimestamp()
                                                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                                        interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                                                        clearInterval(intervalId);
                                                    }
                                                }
                                            }, 1000);
                                        });
                                    }
                                });
                            }
                        });
                    } else{
                        const embed = new EmbedBuilder()
                            .setTitle('2FA Settings')
                            .setDescription('2FA is currently not required for this server!')
                            .addFields({ name: 'Enable 2FA', value: 'To Enable 2FA being required for this server, click the button below!' })
                            .setColor('#037bfc')
                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('enable2fa')
                                    .setLabel('Enable 2FA')
                                    .setStyle(ButtonStyle.Success)
                            );
                        interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
                        const collection = interaction.channel.createMessageComponentCollector({ time: 15000 });
                        collection.on('collect', async i => {
                            if (i.user.id === interaction.user.id) {
                                if (i.customId === 'enable2fa') {
                                    const query2 = `SELECT * FROM users WHERE id = ?`;
                                    connection.query(query2, [interaction.user.id], (queryError2, results2, fields2) => {
                                        if (queryError2) {
                                            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Settings | ${interaction.user.tag} (${interaction.user.id}) received an error while checking user existence | ${queryError2.stack}\n`);
                                            return;
                                        }
                                        if (results2.length === 0) {
                                            const embed2 = new EmbedBuilder()
                                                .setTitle('2FA Settings')
                                                .setDescription('Successfully Enabled 2FA Requirement!')
                                                .setColor('#037bfc')
                                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                            interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                                            connection.query(`UPDATE guilds SET fa_req = 1 WHERE guild_id = '${guildId}'`, (err, results) => {
                                                if (err) {
                                                    fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Setup | ${interaction.user.tag} (${interaction.user.id}) received an error while updating guild data | ${err.stack}\n`);
                                                    return;
                                                }
                                            });
                                        } else {
                                            const currentTime = date.getTime();
                                            const expirationTime = Math.floor(currentTime / 1000) + 300;
                                            const embed2 = new EmbedBuilder()
                                                .setTitle('2FA Setup')
                                                .setDescription('To enable 2FA as a requirement you must validate your action')
                                                .addFields({ name: '2FA Code', value: 'Please use the /validate command to validate your action!' })
                                                .addFields({ name: '2FA Code', value: 'If you have lost your 2FA code, please join the support server and ask for help!' })
                                                .addFields({ name: 'Support Server', value: 'https://megurre666.zip' })
                                                .addFields({ name: 'Expiration', value: `This interaction will expire in <t:${expirationTime}:R>` })
                                                .setColor('#037bfc')
                                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                            interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });

                                            connection.query(`UPDATE users SET validate = 0 WHERE id = '${interaction.user.id}'`, (err, results) => {
                                                if (err) {
                                                    fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Setup | ${interaction.user.tag} (${interaction.user.id}) received an error while updating user data | ${err.stack}\n`);
                                                    return;
                                                }
                                                const intervalId = setInterval(async () => {
                                                    const connectionStatus = await checkValidationStatus(userId, connection);
                                                    if (connectionStatus === null) {
                                                        clearInterval(intervalId);
                                                        return;
                                                    }
                                                    if (connectionStatus) {
                                                        const embed4 = new EmbedBuilder()
                                                            .setTitle('2FA Setup')
                                                            .setDescription('You have successfully enabled 2FA Requirement!')
                                                            .setColor('#037bfc')
                                                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                                        interaction.editReply({ embeds: [embed4], components: [], ephemeral: true });
                                                        clearInterval(intervalId);
                                                        connection.query(`UPDATE guilds SET fa_req = 1 WHERE guild_id = '${guildId}'`, (err, results) => {
                                                            if (err) {
                                                                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Setup | ${interaction.user.tag} (${interaction.user.id}) received an error while updating guild data | ${err.stack}\n`);
                                                                return;
                                                            }
                                                        });
                                                    } else {
                                                        const elapsedTime = (new Date().getTime() - currentTime) / 1000;
                                                        if (elapsedTime >= 5 * 60) {
                                                            const embed2 = new EmbedBuilder()
                                                                .setTitle('2FA Settings')
                                                                .setDescription('The action has expired. Please run the command again.')
                                                                .setColor('#037bfc')
                                                                .setTimestamp()
                                                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                                            interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                                                            clearInterval(intervalId);
                                                        }
                                                    }
                                                }, 1000);
                                            
                                            })
                                        }
                                    })
                                }
                            }
                        })
                    }
                }
            })
        })
    }
};
async function checkValidationStatus(userId, connection) {
    return new Promise((resolve) => {
        const validationStatusQuery = 'SELECT validate FROM users WHERE id = ?';
        connection.query(validationStatusQuery, [userId], (statusQueryError, statusResults, statusFields) => {
            if (statusQueryError) {
                console.error('Error executing status query:', statusQueryError);
                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Settings |  ${interaction.user.tag} (${interaction.user.id}) received an error while checking validation status | ${statusQueryError.stack}\n`);
                resolve(null);
            }
            const isValidateTrue = statusResults.length > 0 && statusResults[0].validate;
            resolve(isValidateTrue);
        });
    });
}
