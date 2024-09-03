const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ContextMenuCommandBuilder, ApplicationCommandType, REST, Routes, WebhookClient, blockQuote, bold, italic, quote, spoiler, strikethrough, underline } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit } = require('../../config.json');
const fs = require('fs');
const path = require('path');
const interactionStateFile = path.join(__dirname, '../../interactionState3.json');
const pool = createPool({
    host: database_host,
    user: database_user,
    password: database_password,
    database: database_name,
    connectionLimit: connection_limit,
});

module.exports = {
    cooldown: 5,
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the ban.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('request_global_ban')
                .setDescription('Request a global ban for this user.')
                .setRequired(false)
                .addChoices(
                    { name: 'Yes', value: 'yes' },
                    { name: 'No', value: 'no' },
                )),
    async execute(interaction) {
        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${interaction.user.id}'`);
        const application = await interaction.client.application?.fetch();
        let hasPermission = userRows.length > 0 && userRows[0].net === 1;

        if (!hasPermission) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const roleIds = member.roles.cache.map(role => role.id);
            if (roleIds.length > 0) {
                const [roleRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id IN (${roleIds.map(id => `'${id}'`).join(', ')})`);
                hasPermission = roleRows.some(row => row.net === 1);
            }
        }

        if (!hasPermission) {
            const embed = new EmbedBuilder()
                .setTitle('You do not have permission to use this command')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const request_global_ban = interaction.options.getString('request_global_ban');
            const memberBanning = await interaction.guild.members.fetch(interaction.user.id);
            const guildId = interaction.guild.id;

            if (request_global_ban === 'yes') {
                const embed = new EmbedBuilder()
                    .setTitle('Global Ban Request')
                    .setDescription(`User: ${user}\nReason: ${reason}`)
                    .addFields({ name: 'Requester', value: `${interaction.user}` },
                        { name: 'Requester ID', value: interaction.user.id }
                    )
                    .setColor('#FF0000');
                const guild = interaction.client.guilds.cache.get('1174863104115490919');
                const channel = guild.channels.cache.get('1279433902817153097');
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('approve_global_ban')
                            .setLabel('Approve')
                            .setStyle(ButtonStyle.Success)
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('deny_global_ban')
                            .setLabel('Deny')
                            .setStyle(ButtonStyle.Danger)
                    );
                const sentMessage = await channel.send({ embeds: [embed], components: [row] });
                const collector = sentMessage.createMessageComponentCollector({ time: 86400000 });

                const saveInteractionState = (state) => {
                    let interactionStates = [];
                    if (fs.existsSync(interactionStateFile)) {
                        const fileContent = fs.readFileSync(interactionStateFile, 'utf8');
                        if (fileContent.trim()) { // Check if the file is not empty
                            interactionStates = JSON.parse(fileContent);
                        }
                    }
                    interactionStates.push(state);
                    fs.writeFileSync(interactionStateFile, JSON.stringify(interactionStates, null, 2));
                };

                const removeInteractionState = (id) => {
                    if (fs.existsSync(interactionStateFile)) {
                        const interactionStates = JSON.parse(fs.readFileSync(interactionStateFile, 'utf8'));
                        const newState = interactionStates.filter(state => state.id !== id);
                        fs.writeFileSync(interactionStateFile, JSON.stringify(newState, null, 2));
                    }
                };

                // Save the interaction state
                const interactionState = {
                    id: interaction.id,
                    guildId: guild.id,
                    channelId: channel.id,
                    userId: interaction.user.id,
                    type: 'global_ban',
                    user: user.id,
                    reason: reason,
                    request_global_ban: request_global_ban,
                    messageId: sentMessage.id,
                };
                saveInteractionState(interactionState);

                collector.on('collect', async i => {
                    if (i.customId === 'approve_global_ban') {
                        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${i.user.id}'`);
                        let hasPermission = userRows.length > 0 && userRows[0].netg === 1;
                        if (!hasPermission) {
                            const member = await i.guild.members.fetch(i.user.id);
                            const roleIds = member.roles.cache.map(role => role.id);
                            if (roleIds.length > 0) {
                                const [roleRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id IN (${roleIds.map(id => `'${id}'`).join(', ')})`);
                                hasPermission = roleRows.some(row => row.netg === 1);
                            }
                        }
                        if (!hasPermission) {
                            const embed = new EmbedBuilder()
                                .setTitle('You do not have permission to use this command')
                                .setColor('#FF0000');
                            return i.reply({ embeds: [embed], ephemeral: true });
                        } else {
                            // Remove it from the interaction state
                            removeInteractionState(interaction.id);

                            let random;
                            let isUnique = false;
                            while (!isUnique) {
                                random = Math.floor(1000000 + Math.random() * 900000);
                                random = `NETG-${random}`;
                                const [rows] = await pool.query(`SELECT * FROM global_ban WHERE ban_id = '${random}'`);
                                
                                if (rows.length === 0) {
                                    isUnique = true;
                                }
                            }
                            await pool.query(`INSERT INTO global_ban (id, ban_id, banned_by, ban_time, reason) VALUES ('${user.id}', '${random}', '${interaction.user.id}', NOW(), '${reason}')`);
                            const guilds = interaction.client.guilds.cache;
                            for (const [guildId, guild] of guilds) {
                                try {
                                    await guild.bans.create(user.id, { reason: `Global banned by ${interaction.user.username} for ${reason} with ban id ${random}` });
                                } catch (error) {
                                    if (error.code === 10007) {
                                        console.warn(`Member ${user.id} not found in guild ${guildId}, skipping.`);
                                    } else {
                                        console.error(`Failed to ban member in guild ${guildId}:`, error);
                                    }
                                }
                            }
                            const row2 = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('accept2')
                                        .setLabel('Approved by ' + i.user.username)
                                        .setStyle(ButtonStyle.Success)
                                        .setDisabled(true)
                                        .setEmoji('✅')
                                );
                            await i.update({ embeds: [embed], components: [row2] });
                            
                        }
                    } else if (i.customId === 'deny_global_ban') {
                        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${i.user.id}'`);
                        let hasPermission = userRows.length > 0 && userRows[0].netg === 1;
                        if (!hasPermission) {
                            const member = await i.guild.members.fetch(i.user.id);
                            const roleIds = member.roles.cache.map(role => role.id);
                            if (roleIds.length > 0) {
                                const [roleRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id IN (${roleIds.map(id => `'${id}'`).join(', ')})`);
                                hasPermission = roleRows.some(row => row.netg === 1);
                            }
                        }
                        if (!hasPermission) {
                            const embed = new EmbedBuilder()
                                .setTitle('You do not have permission to use this command')
                                .setColor('#FF0000');
                            return i.reply({ embeds: [embed], ephemeral: true });
                        } else {
                            // Remove it from the interaction state
                            removeInteractionState(interaction.id);

                            const embed = new EmbedBuilder()
                                .setTitle('Global Ban Request Denied')
                                .setDescription(`User: ${user}\nReason: ${reason}`)
                                .addFields({ name: 'Requester', value: `${interaction.user}` },
                                    { name: 'Requester ID', value: interaction.user.id },
                                    { name: 'Denied By', value: `${i.user}` },
                                )
                                .setColor('#FF0000');
                            const row2 = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('accept2')
                                        .setLabel('Denied by ' + i.user.username)
                                        .setStyle(ButtonStyle.Danger)
                                        .setDisabled(true)
                                        .setEmoji('❌')
                                );
                            await i.update({ embeds: [embed], components: [row2] });
                        }
                    }
                });

                collector.on('end', collected => {
                    console.log(`Collected ${collected.size} interactions.`);
                });
            }
            await interaction.guild.bans.create(user.id, { reason });
            const response = request_global_ban === 'yes' ? 'Yes' : 'No';
            const embed2 = new EmbedBuilder()
                .setTitle(`User ${user.username} has been banned`)
                .setDescription(`The user has been banned from the server.`)
                .addFields({ name: 'Reason', value: reason },
                    { name: 'Request Global Ban', value: response },
                )
                .setColor('#00FF00');
            interaction.reply({ embeds: [embed2], ephemeral: true });
            const [results] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
                if (results[0].log_channeL !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !=='') {
                    try {
                        const webhookClient = new WebhookClient({id:results[0].logging_id, token:results[0].logging_token})

                        if (!webhookClient) {
                            console.log('No webhook found error')
                            return;
                        }
                        const embed5 = new EmbedBuilder()
                            .setTitle('User Banned')
                            .setDescription(`The user ${user} has been banned from ${interaction.guild.name}.`)
                            .addFields({ name: 'Banned By', value: `${interaction.user} | ${interaction.user.id}` },
                            { name: 'Reason', value: `${reason}` },
                            { name: 'Request Global Ban', value: response },)
                            .setColor('#037bfc')
                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                        webhookClient.send({ embeds: [embed5] }).catch(console.error);
                    } catch (error) {
                        console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                        fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: UnGlobal Ban | Command Section: UnGlobal ban | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                    }
                }
        }
    }
};