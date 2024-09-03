const speakeasy = require('speakeasy');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ContextMenuCommandBuilder, ApplicationCommandType, REST, Routes, WebhookClient, blockQuote, bold, italic, quote, spoiler, strikethrough, underline } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit } = require('../../config.json');
const fs = require('fs');
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
        
        if (!hasPermission) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
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
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const user = interaction.options.getUser('user');
            let memberToBan;
            try {
                memberToBan = await interaction.guild.members.fetch(user.id);
            } catch (error) {
                console.warn(`Could not fetch member ${user.id} in guild ${guildId}:`, error);
            }
            const memberBanning = await interaction.guild.members.fetch(interaction.user.id);

            if (memberToBan && memberToBan.roles.highest.position >= memberBanning.roles.highest.position) {
                const embed = new EmbedBuilder()
                    .setTitle('You cannot ban this user')
                    .setDescription('The user you are trying to ban has a role higher or equal to yours.')
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
                    await guild.members.ban(user.id, { reason: `Global banned by ${interaction.user.username} for ${reason}` });
                } catch (error) {
                    console.error(`Failed to ban user ${user.id} in guild ${guild.id}:`, error);
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
        }
    }
};