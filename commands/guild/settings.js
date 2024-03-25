const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, WebhookClient } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit, bot_name } = require('../../config.json');
const path = require('path');
const fs = require('fs');
const pool = createPool({
    host: database_host,
    user: database_user,
    password: database_password,
    database: database_name,
    connectionLimit: connection_limit,
});
async function checkValidationStatus(userId, connection) {
    try {
        const [results3] = await connection.execute('SELECT validate FROM users WHERE id = ?', [userId], error => {
            if (error) {
                console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Validation | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                return null;
            }
        });
        const isValidateTrue = results3.length > 0 && results3[0].validate;
        return isValidateTrue;
    } catch (error) {
        console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
        return null;
    }
}
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
        const guildId = interaction.guild.id;
        try {
            const connection = await pool.getConnection();
            const query = 'SELECT * FROM guilds WHERE id = ?';
            const query2 = 'SELECT * FROM users WHERE id = ?';
            const [results] = await connection.execute(query, [guildId], error => {
                if (error) {
                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                    fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Guild Loading | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                }
            })
            const [results2] = await connection.execute(query2, [userId], error => {
                if (error) {
                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                    fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: User Loading | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                }
            })
            if (category === '2fa'){
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
                            if (i.customId === 'disable2fa' && i.user.id === userId) {
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
                                const query3 = 'UPDATE users SET validate = ? WHERE id = ?';
                                await connection.execute(query3, [false, userId], error => {
                                    if (error){
                                        console.error('Error :', error);
                                        fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                        return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                                    }
                                });
                                const intervalId = setInterval(async () => {
                                    const connectionStatus = await checkValidationStatus(userId, connection);
                                    if (connectionStatus === null) {
                                        clearInterval(intervalId);
                                        return;
                                    }
                                    if (connectionStatus) {
                                        if (results[0].log_channeL !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !=='') {
                                            console.log('Webhook found')
                                            try {
                                                const channel2 = interaction.guild.channels.cache.get(results[0].log_channel);
                                                const webhooks = await channel2.fetchWebhooks();
                                                const webhook = webhooks.find(wh => wh.token === results[0].log_channeL_url);
                    
                                                if (!webhook) {
                                                    console.log('No webhook found error')
                                                    return;
                                                }
                                                const embed5 = new EmbedBuilder()
                                                    .setTitle('2FA Settings')
                                                    .setDescription('2FA requirement was disabled in this server!')
                                                    .addFields({ name: 'Changed By', value: `${interaction.user.tag} | ${interaction.user.id}` })
                                                    .setColor('#037bfc')
                                                    .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                                webhook.send({ embeds: [embed5] }).catch(console.error);
                                            } catch (error) {
                                                console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                                fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                            }

                                            
                                        }
                                        const embed4 = new EmbedBuilder()
                                            .setTitle('2FA Setup')
                                            .setDescription('You have successfully disabled 2FA Requirement!')
                                            .setColor('#037bfc')
                                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                        interaction.editReply({ embeds: [embed4], components: [], ephemeral: true });
                                        clearInterval(intervalId);
                                        await connection.execute(`UPDATE guilds SET fa_req = 0 WHERE id = ?`, [guildId], error => {
                                            if (error) {
                                                console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                                fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                                return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                                            }
                                        })
                                    } else {
                                        const elapsedTime = (new Date().getTime() - currentTime) / 1000;
                                        if (elapsedTime >= 5 * 60) {
                                            const embed2 = new EmbedBuilder()
                                                .setTitle('2FA Settings')
                                                .setDescription('The action has expiaaared. Please run the command again.')
                                                .setColor('#037bfc')
                                                .setTimestamp()
                                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                            interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                                            clearInterval(intervalId);
                                        }
                                    }
                                }, 1000);
                        }
                }
            });
        } else if (results[0].fa_req === 0) {
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
            interaction.reply({ embeds: [embed], components: [row], ephemeral:true });
            const collection = interaction.channel.createMessageComponentCollector({ time: 15000 });
            collection.on('collect', async i => {
                if (i.customId === 'enable2fa' && i.user.id === userId) {
                    if (results2.length === 0) {
                        if (results[0].log_channeL !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !=='') {
                            console.log('Webhook found')
                            try {
                                const channel2 = interaction.guild.channels.cache.get(results[0].log_channel);
                                const webhooks = await channel2.fetchWebhooks();
                                const webhook = webhooks.find(wh => wh.token === results[0].log_channeL_url);
    
                                if (!webhook) {
                                    console.log('No webhook found error')
                                    return;
                                }
                                const embed5 = new EmbedBuilder()
                                    .setTitle('2FA Settings')
                                    .setDescription('2FA requirement was enabled in this server!')
                                    .addFields({ name: 'Changed By', value: `${interaction.user.tag} | ${interaction.user.id}` })
                                    .setColor('#037bfc')
                                    .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                webhook.send({ embeds: [embed5] }).catch(console.error);
                            } catch (error) {
                                console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                            }

                            
                        }
                        const embed2 = new EmbedBuilder()
                            .setTitle('2FA Settings')
                            .setDescription('You have successfully enabled 2FA Requirement!')
                            .addFields({name: '2FA', content: 'Due to thsi setting now being enabled, you will need to setup 2FA for your account to make further changes to the server!'})
                            .setColor('#037bfc')
                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                        interaction.editReply({ embeds: [embed2], components: [], ephemeral: true })
                        query3 = 'UPDATE guilds SET fa_req = 1 WHERE id = ?';
                        await connection.execute(query3, [guildId], error => {
                            if (error){
                                console.error('Error :', error);
                                fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                            }
                        });
                    } else{
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
                        const query3 = 'UPDATE users SET validate = ? WHERE id = ?';
                        await connection.execute(query3, [false, userId], error => {
                            if (error) {
                                console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                            }
                        });
                        const intervalId = setInterval(async () => {
                            const connectionStatus = await checkValidationStatus(userId, connection);
                            if (connectionStatus === null) {
                                clearInterval(intervalId);
                                return;
                            }
                            if (connectionStatus) {
                                if (results[0].log_channeL !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !=='') {
                                    console.log('Webhook found')
                                    try {
                                        const channel2 = interaction.guild.channels.cache.get(results[0].log_channel);
                                        const webhooks = await channel2.fetchWebhooks();
                                        const webhook = webhooks.find(wh => wh.token === results[0].log_channeL_url);
            
                                        if (!webhook) {
                                            console.log('No webhook found error')
                                            return;
                                        }
                                        const embed5 = new EmbedBuilder()
                                            .setTitle('2FA Settings')
                                            .setDescription('2FA requirement was enabled in this server!')
                                            .addFields({ name: 'Changed By', value: `${interaction.user.tag} | ${interaction.user.id}` })
                                            .setColor('#037bfc')
                                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                        webhook.send({ embeds: [embed5] }).catch(console.error);
                                    } catch (error) {
                                        console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                        fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                    }

                                    
                                }
                                const embed4 = new EmbedBuilder()
                                    .setTitle('2FA Setup')
                                    .setDescription('You have successfully enabled 2FA Requirement!')
                                    .setColor('#037bfc')
                                    .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                interaction.editReply({ embeds: [embed4], components: [], ephemeral: true });
                                clearInterval(intervalId);
                                connection.execute(`UPDATE guilds SET fa_req = 1 WHERE id = ?`, [guildId], error => {
                                    if (error) {
                                        console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                        fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: 2FA | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                        return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                                    }
                                })
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
                    }
                }
            });
        }
    } else if (category === 'logging') {
        if (results[0].log_channel === 0 || results[0].log_channel === null || results[0].log_channel === undefined || results[0].log_channel === 'null') {
            const embed = new EmbedBuilder()
                .setTitle('Logging Settings')
                .setDescription('Logging is currently not setup for this server!')
                .addFields({ name: 'Setup Logging', value: 'To setup logging please select a channel from the list below' })
                .setColor('#037bfc')
                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('logging')
                .setPlaceholder('Select a channel')
                .setMinValues(1)
                .setMaxValues(1)
            const row = new ActionRowBuilder()
                .addComponents(channelSelect);
            interaction.reply({ embeds: [embed], components: [row], ephemeral:true });
            const collection = interaction.channel.createMessageComponentCollector({ time: 15000 });
            collection.on('collect', async i => {
                if (i.customId === 'logging' && i.user.id === userId) {
                    if (results[0].fa_req === 1 && results.length > 0) {
                        if (results2.length > 0) {
                            const currentTime = date.getTime();
                            const expirationTime = Math.floor(currentTime / 1000) + 300;
                            const embed2 = new EmbedBuilder()
                                .setTitle('Logging Setup')
                                .setDescription('To setup logging you must validate your action')
                                .addFields({ name: '2FA Code', value: 'Please use the /validate command to validate your action!' })
                                .addFields({ name: '2FA Code', value: 'If you have lost your 2FA code, please join the support server and ask for help!' })
                                .addFields({ name: 'Support Server', value: 'https://megurre666.zip' })
                                .addFields({ name: 'Expiration', value: `This interaction will expire in <t:${expirationTime}:R>` })
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                            interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                            const query3 = 'UPDATE users SET validate = ? WHERE id = ?';
                            await connection.execute(query3, [false, userId], error => {
                                if (error) {
                                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                    fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Logging | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                    return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                                }
                            });
                            const intervalId = setInterval(async () => {
                                const connectionStatus = await checkValidationStatus(userId, connection);
                                if (connectionStatus === null) {
                                    clearInterval(intervalId);
                                    return;
                                }
                                if (connectionStatus) {
                                    const embed4 = new EmbedBuilder()
                                        .setTitle('Logging Setup')
                                        .setDescription('You have successfully setup logging for channel !')
                                        .setColor('#037bfc')
                                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                    interaction.editReply({ embeds: [embed4], components: [], ephemeral: true });
                                    clearInterval(intervalId);
                                    channel = interaction.guild.channels.cache.get(i.values[0]);
                                    channel.createWebhook({
                                        name: "Northern Lights Logging",
                                        avatar: application.iconURL({ dynamic: true }),
                                        reason: 'Logging Setup'
                                    })
                                    .then(webhook => {
                                        const embed5 = new EmbedBuilder()
                                            .setTitle('Logging Setup')
                                            .setDescription(`Logging was setup to the channel <#${i.values[0]}> !`)
                                            .addFields({name: 'Changed By', value: `${interaction.user.tag} | ${interaction.user.id}`})
                                            .setColor('#037bfc')
                                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: application.iconURL({ dynamic: true }) });
                                        webhook.send({ embeds: [embed5] }).catch(console.error);
                                        const query4 = 'UPDATE guilds SET log_channel = ?, log_channeL_url = ? WHERE id = ?';
                                        connection.execute(query4, [channel.id, webhook.token, guildId], error => {
                                            if (error) {
                                                console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                                fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Logging | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                                return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                                            }
                                        });
                                    });
                                } else {
                                    const elapsedTime = (new Date().getTime() - currentTime) / 1000;
                                    if (elapsedTime >= 5 * 60) {
                                        const embed2 = new EmbedBuilder()
                                            .setTitle('Logging Setup')
                                            .setDescription('The action has expired. Please run the command again.')
                                            .setColor('#037bfc')
                                            .setTimestamp()
                                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                        interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                                        clearInterval(intervalId);
                                    }
                                }
                            }, 1000);
                        } else {
                            const embed2 = new EmbedBuilder()
                                .setTitle('Logging Setup')
                                .setDescription('You need to have 2FA setup for your account due to it being required to make changes to the server!')
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                            interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                        }
                    } else {
                        const embed2 = new EmbedBuilder()
                            .setTitle('Logging Setup')
                            .setDescription(`You have successfully setup logging to the channel <#${i.values[0]}>!`)
                            .setColor('#037bfc')
                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: application.iconURL({ dynamic: true }) });
                        interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                        channel = interaction.guild.channels.cache.get(i.values[0]);
                        channel.createWebhook({
                            name: "Northern Lights Logging",
                            avatar: application.iconURL({ dynamic: true }),
                            reason: 'Logging Setup'
                        })
                        .then(webhook => {
                            const embed5 = new EmbedBuilder()
                                .setTitle('Logging Setup')
                                .setDescription(`Logging was changed to the channel <#${i.values[0]}> !`)
                                .addFields({name: 'Changed By', value: `${interaction.user.tag} | ${interaction.user.id}`})
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: application.iconURL({ dynamic: true }) });
                            webhook.send({ embeds: [embed5] }).catch(console.error);
                            const query4 = 'UPDATE guilds SET log_channel = ?, log_channeL_url = ? WHERE id = ?';
                            connection.execute(query4, [channel.id, webhook.token, guildId], error => {
                                if (error) {
                                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                    fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Logging | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                    return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                                }
                            });
                        });
                    }
                }
            });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('Logging Settings')
                .setDescription(`Logging is currently setup for this server for the channel <#${(results[0].log_channel)}>!`)
                .addFields({ name: 'Update Logging', value: 'To update logging please select a channel from the list below'})
                .setColor('#037bfc')
                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('logging')
                .setPlaceholder('Select a channel')
                .setMinValues(1)
                .setMaxValues(1)
            const row = new ActionRowBuilder()
                .addComponents(channelSelect)
            interaction.reply({ embeds: [embed], components: [row], ephemeral:true });
            const collection = interaction.channel.createMessageComponentCollector({ time: 15000 });
            collection.on('collect', async i => {
                if (i.customId === 'logging' && i.user.id === userId) {
                    if (results[0].fa_req === 1 || results2.length > 0) {
                        if (results2.length > 0) {
                            const currentTime = date.getTime();
                            const expirationTime = Math.floor(currentTime / 1000) + 300;
                            const embed2 = new EmbedBuilder()
                                .setTitle('Logging Setup')
                                .setDescription('To update logging you must validate your action')
                                .addFields({ name: '2FA Code', value: 'Please use the /validate command to validate your action!' })
                                .addFields({ name: '2FA Code', value: 'If you have lost your 2FA code, please join the support server and ask for help!' })
                                .addFields({ name: 'Support Server', value: 'https://megurre666.zip' })
                                .addFields({ name: 'Expiration', value: `This interaction will expire in <t:${expirationTime}:R>` })
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                            interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                            const query3 = 'UPDATE users SET validate = ? WHERE id = ?';
                            await connection.execute(query3, [false, userId], error => {
                                if (error) {
                                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                    fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Logging | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                    return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                                }
                            });
                            const intervalId = setInterval(async () => {
                                const connectionStatus = await checkValidationStatus(userId, connection);
                                if (connectionStatus === null) {
                                    clearInterval(intervalId);
                                    return;
                                }
                                if (connectionStatus) {
                                    const embed4 = new EmbedBuilder()
                                        .setTitle('Logging Setup')
                                        .setDescription(`You have successfully updated logging to the channel <#${i.values[0]}> !`)
                                        .setColor('#037bfc')
                                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                    interaction.editReply({ embeds: [embed4], components: [], ephemeral: true });
                                    clearInterval(intervalId);
                                    const channel = interaction.guild.channels.cache.get(i.values[0]);
                                    const channel2 = interaction.guild.channels.cache.get(results[0].log_channel);
                                    try {
                                        const webhooks = await channel2.fetchWebhooks();
                                        const webhook = webhooks.find(wh => wh.token === results[0].log_channeL_url);

                                        if (!webhook) {
                                            console.log('No webhook found error')
                                    }
                                        webhook.edit({
                                            name: "Northern Lights Logging",
                                            avatar: application.iconURL({ dynamic: true }),
                                            channel: channel.id
                                        })
                                        setTimeout(() => {
                                            const embed5 = new EmbedBuilder()
                                                .setTitle('Logging Setup')
                                                .setDescription(`Logging channel was updated to the channel <#${i.values[0]}>!`)
                                                .addFields({name: 'Changed By', value: `${interaction.user.tag} | ${interaction.user.id}`})
                                                .setColor('#037bfc')
                                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                            webhook.send({ embeds: [embed5] }).catch(console.error);
                                            const query4 = 'UPDATE guilds SET log_channel = ?, log_channeL_url =?  WHERE id = ?';
                                            connection.execute(query4, [channel.id, webhook.token, guildId], error => {
                                                if (error) {
                                                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                                    fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Logging | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                                    return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                                                }
                                            })
                                    }, 1000);
                                } catch (error) {
                                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                    return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                                }
                                } else {
                                    const elapsedTime = (new Date().getTime() - currentTime) / 1000;
                                    if (elapsedTime >= 5 * 60) {
                                        const embed2 = new EmbedBuilder()
                                            .setTitle('Logging Setup')
                                            .setDescription('The action has expired. Please run the command again.')
                                            .setColor('#037bfc')
                                            .setTimestamp()
                                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                        interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                                        clearInterval(intervalId);
                                    }
                                }
                            }, 1000)
                        }
                    } else {
                        const channel = interaction.guild.channels.cache.get(i.values[0]);
                        const channel2 = interaction.guild.channels.cache.get(results[0].log_channel);
                        try {
                            const webhooks = await channel2.fetchWebhooks();
                            const webhook = webhooks.find(wh => wh.token === results[0].log_channeL_url);

                            if (!webhook) {
                                console.log('No webhook found error')
                        }
                            webhook.edit({
                                name: "Northern Lights Logging",
                                avatar: application.iconURL({ dynamic: true }),
                                channel: channel.id
                            })
                            const embed4 = new EmbedBuilder()
                                .setTitle('Logging Setup')
                                .setDescription(`You have successfully updated logging to the channel <#${i.values[0]}> !`)
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                            interaction.editReply({ embeds: [embed4], components: [], ephemeral: true });
                            setTimeout(() => {
                                const embed5 = new EmbedBuilder()
                                    .setTitle('Logging Setup')
                                    .setDescription(`Logging channel was updated to the channel <#${i.values[0]}>!`)
                                    .addFields({name: 'Changed By', value: `${interaction.user.tag} | ${interaction.user.id}`})
                                    .setColor('#037bfc')
                                    .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                webhook.send({ embeds: [embed5] }).catch(console.error);
                                const query4 = 'UPDATE guilds SET log_channel = ?, log_channeL_url =?  WHERE id = ?';
                                connection.execute(query4, [channel.id, webhook.token, guildId], error => {
                                    if (error) {
                                        console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                                        fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Logging | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                                        return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                                    }
                                })
                            }, 1000);
                    } catch (error) {
                        console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                        return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                    }
                }
                }
            })
        }
    }
} catch (error) {
        console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
        return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
}
}