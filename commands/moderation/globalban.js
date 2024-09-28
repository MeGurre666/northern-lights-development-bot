const speakeasy = require('speakeasy');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, WebhookClient } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit } = require('../../config.json');
const fs = require('fs');
const path = require('path');
const interactionStateFile = path.join(__dirname, '../../interactionState4.json');
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
        .setName('globalban')
        .setDescription('Global bans a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to global ban.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the global ban.')
                .setRequired(false)),
    async execute(interaction) {
        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${interaction.user.id}'`);
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guildId = interaction.guild.id;
        const application = await interaction.client.application?.fetch();
        let hasPermission = userRows.length > 0 && userRows[0].netg === 1;
        const user = interaction.options.getUser('user');
        const memberBanning = await interaction.guild.members.fetch(interaction.user.id);
        
        if (!hasPermission) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const roleIds = member.roles.cache.map(role => role.id);
            if (roleIds.length > 0) {
                const [roleRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id IN (${roleIds.map(id => `'${id}'`).join(', ')})`);
                hasPermission = roleRows.some(row => row.netg === 1);
            }
        }
        let userMember;
        try {
            userMember = await interaction.guild.members.fetch(user.id);
        } catch (error) {
            userMember = null;
        }

        if (!hasPermission || (userMember && userMember.roles.highest.position >= memberBanning.roles.highest.position)) {
            const embed = new EmbedBuilder()
                .setTitle('You do not have permission to use this command')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

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
        const embed2 = new EmbedBuilder()
            .setTitle(`User ${user.username} has been banned`)
            .setDescription(`The user has been banned with ban id ${random}`)
            .setColor('#00FF00');
        interaction.reply({ embeds: [embed2], ephemeral: true });
        const guilds = interaction.client.guilds.cache;
        guilds.forEach(async (guild) => {
            try {
                await guild.members.ban(user.id, { reason: `Global banned by ${interaction.user.username} for ${reason} with ban-id ${random}` });
            } catch (error) {
                if (error.code === 10007) {
                    console.warn(`Member ${user.id} not found in guild ${guild.id}, skipping.`);
                } else {
                    console.error(`Failed to ban user ${user.id} in guild ${guild.id}:`, error);
                }
            }
        });
        const [results] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
        if (results[0].log_channel !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !== '') {
            try {
                const webhookClient = new WebhookClient({ id: results[0].logging_id, token: results[0].logging_token });

                if (!webhookClient) {
                    console.log('No webhook found error');
                    return;
                }
                const embed5 = new EmbedBuilder()
                    .setTitle('User Banned')
                    .setDescription(`User ${user} has been global banned with ban id ${random}`)
                    .addFields({ name: 'Banned By', value: `${interaction.user} | ${interaction.user.id}` },
                        { name: 'Reason', value: `${reason}` })
                    .setColor('#037bfc')
                    .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: application.iconURL({ dynamic: true }) });
                webhookClient.send({ embeds: [embed5] }).catch(console.error);
            } catch (error) {
                console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [ERROR] | Command: Settings | Command Section: Global ban | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
            }
        }
        const embed = new EmbedBuilder()
                    .setTitle('Global Ban')
                    .setDescription(`User: ${user}\nReason: ${reason}`)
                    .addFields({ name: 'Banned By', value: `${interaction.user}` },
                        { name: 'Banned By ID', value: interaction.user.id }
                    )
                    .setColor('#FF0000');
                const guild = interaction.client.guilds.cache.get('1174863104115490919');
                const channel = guild.channels.cache.get('1279433902817153097');
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('ownership')
                            .setLabel('Ownership Unban Only')
                            .setStyle(ButtonStyle.Primary)
                    );
                const sentMessage = await channel.send({ embeds: [embed], components: [row] });
                const collector = sentMessage.createMessageComponentCollector({ time: 86400000 });

                const saveInteractionState = (state) => {
                    let interactionStates = [];
                    if (fs.existsSync(interactionStateFile)) {
                        const fileContent = fs.readFileSync(interactionStateFile, 'utf8');
                        if (fileContent.trim()) { // Check if the file is not empty
                            try {
                                interactionStates = JSON.parse(fileContent);
                                if (!Array.isArray(interactionStates)) {
                                    interactionStates = [];
                                }
                            } catch (error) {
                                console.error('Error parsing interaction state file:', error);
                                interactionStates = [];
                            }
                        }
                    }
                    interactionStates.push(state);
                    fs.writeFileSync(interactionStateFile, JSON.stringify(interactionStates, null, 2));
                };

                const removeInteractionState = (id) => {
                    if (fs.existsSync(interactionStateFile)) {
                        const fileContent = fs.readFileSync(interactionStateFile, 'utf8');
                        let interactionStates = [];
                        if (fileContent.trim()) {
                            try {
                                interactionStates = JSON.parse(fileContent);
                                if (!Array.isArray(interactionStates)) {
                                    interactionStates = [];
                                }
                            } catch (error) {
                                console.error('Error parsing interaction state file:', error);
                                interactionStates = [];
                            }
                        }
                        const newState = interactionStates.filter(state => state.id !== id);
                        fs.writeFileSync(interactionStateFile, JSON.stringify(newState, null, 2));
                    }
                };

                const interactionState = {
                    id: interaction.id,
                    guildId: guild.id,
                    channelId: channel.id,
                    userId: interaction.user.id,
                    type: 'global_ban',
                    user: user.id,
                    reason: reason,
                    random: random,
                    messageId: sentMessage.id,
                };
                saveInteractionState(interactionState);

                collector.on('collect', async i => {
                    if (i.customId === 'ownership') {
                        const teamMember2 = application.owner.members;
                        const guild = interaction.client.guilds.cache.get(interactionState.guildId);
                        const member2 = await guild.members.fetch(interactionState.userId);
                        const roleIds = member2.roles.cache.map(role => role.id);
                        if (teamMember2.has(i.user.id) || roleIds.includes('1175245316992274492')) {
                            //update the ban to be ownership only
                            await pool.query(`UPDATE global_ban SET ownership = 1 WHERE ban_id = '${random}'`);
                            removeInteractionState(interaction.id);
                            const embed = new EmbedBuilder()
                            .setTitle('Global Ban')
                            .setDescription(`User: ${user}\nReason: ${reason}`)
                            .addFields({ name: 'Banned By', value: `${interaction.user}` },
                                { name: 'Banned By Id', value: interaction.user.id },
                            )
                            .setColor('#FF0000');
                            const row2 = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('accept2')
                                        .setLabel('Ownership Unban Only by ' + i.user.username)
                                        .setStyle(ButtonStyle.Primary)
                                        .setDisabled(true)
                                        .setEmoji('🔵')
                                );
                            await i.update({ embeds: [embed], components: [row2] });
                        } else {
                            const embed = new EmbedBuilder()
                                .setTitle('You don\'t have permission to do this')
                                .setColor('#FF0000');
                            await i.reply({ embeds: [embed], ephemeral: true });
                        }
                    }
                });
    }
};