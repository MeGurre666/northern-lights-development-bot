const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ContextMenuCommandBuilder, ApplicationCommandType, REST, Routes, WebhookClient, blockQuote, bold, italic, quote, spoiler, strikethrough, underline } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit } = require('../../config.json');
const fs = require('fs');
const path = require('path');
const interactionStateFile = path.join(__dirname, '../../interactionState.json');
const pool = createPool({
    host: database_host,
    user: database_user,
    password: database_password,
    database: database_name,
    connectionLimit: connection_limit,
});

module.exports = {
    cooldown: 5,
    category: 'role',
    data: new SlashCommandBuilder()
        .setName('requestrole')
        .setDescription('Request a role')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to request.')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to request the role from.')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.user;
        const application = await interaction.client.application?.fetch();
        const role = interaction.options.getRole('role');
        const requestedfrom = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id, { force: true });
        const hasRole = member.roles.cache.has(role.id);
        const guildId = interaction.guild.id;
        if (hasRole) {
            const embed = new EmbedBuilder()
                .setTitle('You already have the role')
                .setDescription('You already have the role you are trying to request.')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const [userRows] = await pool.query(`SELECT * FROM permissions_role WHERE id = '${role.id}'`);
        if (userRows.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('No permission data found')
                .setDescription('No permission data found for the specified role.')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const requestedFromMember = await interaction.guild.members.fetch(requestedfrom.id);
        const userHasPermission = userRows[0].permission.includes(requestedfrom.id) || requestedFromMember.roles.cache.some(role => userRows[0].permission.includes(role.id));
        if (!userHasPermission) {
            const embed = new EmbedBuilder()
                .setTitle('No permission')
                .setDescription('The user you are trying to request the role from does not have permission to manage the role.')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const embed2 = new EmbedBuilder()
                .setTitle('Role requested')
                .setDescription(`The role ${role} has been requested from ${requestedfrom}.`)
                .setColor('#00FF00');
            interaction.reply({ embeds: [embed2], ephemeral: true });
            const roleString = quote(role.name);
            const embed = new EmbedBuilder()
                .setTitle('Role Request')
                .addFields({
                    name: 'Role',
                    value: roleString,
                    inline: true
                }, {
                    name: 'User',
                    value: `${user}`, // Use user.tag to get a string representation of the user
                    inline: true
                })
                .setColor('#00FF00');
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('accept')
                        .setLabel('Accept')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId('deny')
                        .setLabel('Deny')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            // Save interaction state
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

            // Your existing code to send the embed and buttons
            const dmChannel = await requestedfrom.createDM();
            const message = await dmChannel.send({ embeds: [embed], components: [row] });

            // Save the interaction state
            const interactionState = {
                channelId: dmChannel.id,
                messageId: message.id,
                userId: user.id,
                roleId: role.id,
                guildId: guildId,
                requestedFrom: requestedfrom.id
            };
            saveInteractionState(interactionState);

            const collection = dmChannel.createMessageComponentCollector({ time: 86400000 });
            collection.on('collect', async i => {
                if (i.customId === 'accept') {
                    const interactionStates = JSON.parse(fs.readFileSync(interactionStateFile, 'utf8'));
                    const newState = interactionStates.filter(state => state.messageId !== i.message.id);
                    fs.writeFileSync(interactionStateFile, JSON.stringify(newState, null, 2));
                    await member.roles.add(role);
                    if (interaction.guild.id === "1221116174637727784"){
                    const [results2] = await pool.query(`SELECT * FROM roleconnect WHERE roleid = '${role.id}'`);
                    if (results2.length > 0) {
                        const connectedRoles = results2[0].connected;
                        const connectedRolesArray = connectedRoles.split(',');
                        connectedRolesArray.forEach(async (tag) => {
                            const [results3] = await pool.query(`SELECT * FROM roleconnect `);
                            results3.forEach(async (row) => {
                                rowSplit = row.connected.split(',');
                                if (rowSplit.some(item => item.trim() === tag) && row.id !== guildId) {
                                    const guild = interaction.client.guilds.cache.get(row.id);
                                    const roletoassignid = row.roleid;
                                    const roleToAssign = guild.roles.cache.get(roletoassignid);
                                    const memberToAssign = await guild.members.fetch(user.id);
                                    memberToAssign.roles.add(roleToAssign);
                                }
                            })
                        })
                    }
                }
                    const row2 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('accept2')
                                .setLabel('Accept')
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true)
                                .setEmoji('✅')
                        );
                    i.update({ embeds: [embed], components: [row2] });
                    const dmChannel2 = await user.createDM();
                    const embed3 = new EmbedBuilder()
                        .setTitle('Role Request Accepted')
                        .setDescription(`Role request for ${role.name} has been accepted by ${requestedfrom}.`)
                        .setColor('#00FF00');
                    dmChannel2.send({ embeds: [embed3] });
                    const [results3] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
                    if (results3[0].log_channeL !== 0 && results3[0].log_channel !== null && results3[0].log_channel !== undefined && results3[0].log_channel !== 'null' && results3[0].log_channel !== '') {
                        try {
                            const webhookClient = new WebhookClient({ id: results3[0].logging_id, token: results3[0].logging_token })

                            if (!webhookClient) {
                                console.log('No webhook found error')
                                return;
                            }
                            const embed5 = new EmbedBuilder()
                                .setTitle('Role Request Accepted')
                                .setDescription(`Role request for ${role.name} has been accepted by ${requestedfrom}.`)
                                .addFields( {name: 'Requested By', value: `${user} | ${user.id}`},
                                    { name: 'Accepted By', value: `${interaction.user} | ${interaction.user.id}` })
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                            webhookClient.send({ embeds: [embed5] }).catch(console.error);
                        } catch (error) {
                            console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                            fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Role Request | Command Section: Role Request Deny | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                        }
                    }
                } else if (i.customId === 'deny') {
                    const interactionStates = JSON.parse(fs.readFileSync(interactionStateFile, 'utf8'));
                    const newState = interactionStates.filter(state => state.messageId !== i.message.id);
                    fs.writeFileSync(interactionStateFile, JSON.stringify(newState, null, 2));
                    const row3 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('deny2')
                                .setLabel('Deny')
                                .setStyle(ButtonStyle.Danger)
                                .setDisabled(true)
                                .setEmoji('❌')
                        );
                    i.update({ embeds: [embed], components: [row3] });
                    const dmChannel3 = await user.createDM();
                    const embed4 = new EmbedBuilder()
                        .setTitle('Role Request Denied')
                        .setDescription(`Role request for ${role.name} has been denied by ${requestedfrom}.`)
                        .setColor('#FF0000');
                    dmChannel3.send({ embeds: [embed4] });
                    const [results3] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
                    if (results3[0].log_channeL !== 0 && results3[0].log_channel !== null && results3[0].log_channel !== undefined && results3[0].log_channel !== 'null' && results3[0].log_channel !== '') {
                        try {
                            const webhookClient = new WebhookClient({ id: results3[0].logging_id, token: results3[0].logging_token })

                            if (!webhookClient) {
                                console.log('No webhook found error')
                                return;
                            }
                            const embed5 = new EmbedBuilder()
                                .setTitle('Role Request Denied')
                                .setDescription(`Role request for ${role.name} has been denied by ${requestedfrom}.`)
                                .addFields({ name: 'Denied By', value: `${interaction.user} | ${interaction.user.id}` })
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                            webhookClient.send({ embeds: [embed5] }).catch(console.error);
                        } catch (error) {
                            console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                            fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Role Request | Command Section: Role Request Deny | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                        }
                    }
                }
            });
        }
    }
};