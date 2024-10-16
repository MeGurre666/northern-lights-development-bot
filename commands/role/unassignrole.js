const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
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
        .setName('unassignrole')
        .setDescription('Removes a role from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove a role from.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to remove from the user.')
                .setRequired(true)),
    async execute(interaction) {
        const application = await interaction.client.application?.fetch();
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const member = await interaction.guild.members.fetch(user.id);
        const hasRole = member.roles.cache.has(role.id);
        const guildId = "1221116174637727784";

        if (!hasRole) {
            const embed = new EmbedBuilder()
                .setTitle('User does not have the role')
                .setDescription('The user you are trying to remove the role from does not have the role.')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if the user can remove that role
        const [userRows] = await pool.query(`SELECT * FROM permissions_role WHERE id = '${role.id}'`);
        const userHasPermission = userRows[0]?.permission.includes(interaction.user.id) || interaction.member.roles.cache.some(role => userRows[0]?.permission.includes(role.id));
        if (!userHasPermission) {
            const embed = new EmbedBuilder()
                .setTitle('You do not have permission to remove this role')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            await member.roles.remove(role);
            const embed = new EmbedBuilder()
                .setTitle('Role removed')
                .setDescription(`The role ${role} has been removed from ${user}.`)
                .setColor('#00FF00');
            await interaction.reply({ embeds: [embed], ephemeral: true });

            const [results] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
            if (results[0]?.log_channel) {
                try {
                    const webhookClient = new WebhookClient({ id: results[0].logging_id, token: results[0].logging_token });

                    if (!webhookClient) {
                        console.log('No webhook found error');
                        return;
                    }
                    const embed5 = new EmbedBuilder()
                        .setTitle('Role removed')
                        .setDescription(`The role ${role} has been removed from ${user}.`)
                        .addFields({ name: 'Changed By', value: `${interaction.user} | ${interaction.user.id}` })
                        .setColor('#037bfc')
                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                    webhookClient.send({ embeds: [embed5] }).catch(console.error);
                } catch (error) {
                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                    fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [ERROR] | Command: Settings | Command Section: Unassign Role | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                }
            }
            if (interaction.guild.id === "1221116174637727784") {
                const roleOG = role
                await new Promise(resolve => setTimeout(resolve, 2000));

                const guild = await interaction.client.guilds.fetch(guildId);
                const memberInGuild = await guild.members.fetch(user.id, { force: true });
                const roles = memberInGuild.roles.cache.map(role => role.id);
                let connectedTags = [];
                const [results2] = await pool.query(`SELECT * FROM roleconnect`);
                for (const role of roles) {
                    const roleRows = results2.filter(row => row.roleid === role);
                    if (roleRows.length > 0 && roleRows[0].connected && roleRows[0].roleid !== roleOG.id) {
                        connectedTags = connectedTags.concat(roleRows[0].connected.split(","));
                    }
                }
                if (results2.length > 0) {
                    let allGuilds = new Set();
                    let rolesToAssign = new Set();
                    let rolesToRemove = new Set();
                    results2.forEach(row => {
                        if (row.id !== "1221116174637727784") {
                            allGuilds.add(row.id);
                        }
                    });
                    connectedTags.forEach(tag => {
                        results2.forEach(row => {
                            const rowSplit = row.connected.split(',');
                            if (rowSplit.some(item => item.trim() === tag) && row.id !== "1221116174637727784") {
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
                                const roleRows = results2.filter(row => row.roleid === roleId);
                                let shouldRemoveRole = true;
                                for (const roleRow of roleRows) {
                                    const connected = roleRow.connected.split(',');
                                    for (const tag of connected) {
                                        if (connectedTags.includes(tag)) {
                                            shouldRemoveRole = false;
                                            break;
                                        }
                                    }
                                    if (!shouldRemoveRole) break;
                                }
                                if (shouldRemoveRole) {
                                    await member.roles.remove(role);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};