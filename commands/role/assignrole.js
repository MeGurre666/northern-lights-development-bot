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
        .setName('assignrole')
        .setDescription('Assigns a role to a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to assign a role to.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to assign to the user.')
                .setRequired(true)),
    async execute(interaction) {

        const application = await interaction.client.application?.fetch();
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const member = await interaction.guild.members.fetch(user.id, { force: true });
        const hasRole = member.roles.cache.has(role.id);
        const guildId = interaction.guild.id;

        if (hasRole) {
            const embed = new EmbedBuilder()
                .setTitle('User already has the role')
                .setDescription('The user you are trying to assign the role to already has the role.')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if the user can give out that role
        const [userRows] = await pool.query(`SELECT * FROM permissions_role WHERE id = '${role.id}'`);
        const userHasPermission = userRows[0]?.permission.includes(interaction.user.id) || interaction.member.roles.cache.some(role => userRows[0]?.permission.includes(role.id));
        if (!userHasPermission) {
            const embed = new EmbedBuilder()
                .setTitle('You do not have permission to assign this role')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            await member.roles.add(role);
            const embed = new EmbedBuilder()
                .setTitle('Role assigned')
                .setDescription(`The role ${role} has been assigned to ${user}.`)
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
                        .setTitle('Role assigned')
                        .setDescription(`The role ${role} has been assigned to ${user}.`)
                        .addFields({ name: 'Changed By', value: `${interaction.user} | ${interaction.user.id}` })
                        .setColor('#037bfc')
                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                    webhookClient.send({ embeds: [embed5] }).catch(console.error);
                } catch (error) {
                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                    fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [ERROR] | Command: Settings | Command Section: Assign Role | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                }
            }
            if (interaction.guild.id === "1221116174637727784") {
                const [results2] = await pool.query(`SELECT * FROM roleconnect WHERE roleid = '${role.id}'`);
                if (results2.length > 0) {
                    const connectedRoles = results2[0].connected;
                    const connectedRolesArray = connectedRoles.split(',');
                    for (const tag of connectedRolesArray) {
                        const [results3] = await pool.query(`SELECT * FROM roleconnect`);
                        for (const row of results3) {
                            const rowSplit = row.connected.split(',');
                            if (rowSplit.some(item => item.trim() === tag) && row.id !== guildId) {
                                const guild = interaction.client.guilds.cache.get(row.id);
                                if (!guild) continue;
                                const roleToAssignId = row.roleid;
                                const roleToAssign = guild.roles.cache.get(roleToAssignId);
                                if (!roleToAssign) continue;
                                const memberToAssign = await guild.members.fetch(user.id, { force: true }).catch(() => null);
                                if (!memberToAssign) continue;
                                await memberToAssign.roles.add(roleToAssign);
                            }
                        }
                    }
                }
            }
        }
    }
};