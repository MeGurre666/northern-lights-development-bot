const speakeasy = require('speakeasy');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ContextMenuCommandBuilder, ApplicationCommandType, REST, Routes } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit } = require('../../config.json');
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
    data: new ContextMenuCommandBuilder()
        .setName('Global Ban')
        .setType(ApplicationCommandType.User),
    async execute(interaction) {
        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${interaction.user.id}'`);
        
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
            const memberToBan = await interaction.guild.members.fetch(user.id);
            const memberBanning = await interaction.guild.members.fetch(interaction.user.id);

            if (memberToBan.roles.highest.position >= memberBanning.roles.highest.position) {
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
            await pool.query(`INSERT INTO global_ban (id, ban_id, banned_by, ban_time, reason) VALUES ('${user.id}', '${random}', '${interaction.user.id}', NOW(), 'No reason provided')`);
            const embed2 = new EmbedBuilder()
                .setTitle(`User ${user.username} has been banned`)
                .setDescription(`The user has been banned with ban id ${random}`)
                .setColor('#00FF00');
            interaction.reply({ embeds: [embed2], ephemeral: true });
            const guilds = interaction.client.guilds.cache;
            guilds.forEach(async (guild) => {
                try {
                    await guild.members.ban(user.id, { reason: `Global banned by ${interaction.user.username} for No reason provided ` });
                } catch (error) {
                    console.error(`Failed to ban user ${user.id} in guild ${guild.id}:`, error);
                }
            });
        
        }
    }
};