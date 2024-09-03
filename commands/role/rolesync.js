const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, WebhookClient } = require('discord.js');
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
    category: 'role',
    data: new SlashCommandBuilder()
        .setName('rolesync')
        .setDescription('Syncs roles between department and main')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to sync.')
                .setRequired(true)),
    async execute(interaction) {
        const application = await interaction.client.application?.fetch();
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id, { force: true });
        const guildId = "1221116174637727784";
        const [results] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${interaction.user.id}'`);
        const hasPermission = results.length > 0 && results[0].rolesync === 1;
        if (!hasPermission) {
            const embed = new EmbedBuilder()
                .setTitle('You do not have permission to use this command')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const guild = await interaction.client.guilds.fetch(guildId);
        const memberInGuild = await guild.members.fetch(user.id, { force: true });
        const roles = memberInGuild.roles.cache.map(role => role.id);
        let connectedTags = [];
        const [results2] = await pool.query(`SELECT * FROM roleconnect`);
        for (const role of roles) {
            const roleRows = results2.filter(row => row.roleid === role);
            if (roleRows.length > 0 && roleRows[0].connected) {
                connectedTags = connectedTags.concat(roleRows[0].connected.split(","));
            }
        }
        if (results2.length > 0) {
            let allGuilds = new Set();
            let rolesToAssign = new Set();
            let rolesToRemove = new Set();
            results2.forEach(row => {
                if (row.id !== guildId) {
                    allGuilds.add(row.id);
                }
            });
            connectedTags.forEach(tag => {
                results2.forEach(row => {
                    const rowSplit = row.connected.split(',');
                    if (rowSplit.some(item => item.trim() === tag) && row.id !== guildId) {
                        rolesToAssign.add(row.roleid);
                    }
                });
            });
            for (const guildId of allGuilds) {
                const guild = await interaction.client.guilds.fetch(guildId);
                const member = await guild.members.fetch(user.id, { force: true });
                const currentRoles = new Set(member.roles.cache.map(role => role.id));
                currentRoles.forEach(roleId => {
                    if (!rolesToAssign.has(roleId) && results2.some(row => row.roleid === roleId)) {
                        rolesToRemove.add(roleId);
                    }
                });
                for (const roleId of rolesToRemove) {
                    const role = await guild.roles.fetch(roleId);
                    if (role) {
                        await member.roles.remove(role);
                    }
                }
                for (const roleId of rolesToAssign) {
                    if (!currentRoles.has(roleId)) {
                        const role = await guild.roles.fetch(roleId);
                        if (role) {
                            await member.roles.add(role);
                        }
                    }
                }
            }
        }
        const embed = new EmbedBuilder()
            .setTitle('Roles synced')
            .setDescription(`Roles have been synced for ${user}`)
            .setColor('#00FF00');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        const [results3] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
        if (results3[0].log_channel !== 0 && results3[0].log_channel !== null && results3[0].log_channel !== undefined && results3[0].log_channel !== 'null' && results3[0].log_channel !== '') {
            try {
                const webhookClient = new WebhookClient({ id: results3[0].logging_id, token: results3[0].logging_token });

                if (!webhookClient) {
                    console.log('No webhook found error');
                    return;
                }
                const embed5 = new EmbedBuilder()
                    .setTitle('Role Synced')
                    .setDescription(`Roles have been synced for ${user}`)
                    .addFields({ name: 'Changed By', value: `${interaction.user} | ${interaction.user.id}` })
                    .setColor('#037bfc')
                    .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                webhookClient.send({ embeds: [embed5] }).catch(console.error);
            } catch (error) {
                console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [ERROR] | Command: Role Sync | Command Section: Role Sync | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
            }
        }
    }
};