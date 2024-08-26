const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ContextMenuCommandBuilder, ApplicationCommandType, REST, Routes,  WebhookClient } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit } = require('../../config.json');
const { execute } = require('./info');

const pool = createPool({
    host: database_host,
    user: database_user,
    password: database_password,
    database: database_name,
    connectionLimit: connection_limit,
});

module.exports = {
    cooldown: 5,
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('permissionspecial')
        .setDescription('Changes the permission of a role.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('discord')
                .setDescription('Gives all permissions to the role or user.')
                .addMentionableOption(option =>
                    option.setName('roleoruser')
                        .setDescription('The role or user to change the permission of.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('The action to take.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' })
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('roles')
                .setDescription('Gives all permissions to the discord role or user.')
                .addMentionableOption(option =>
                    option.setName('roleoruser')
                        .setDescription('The role or user to change the permission of.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('The action to take.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' })
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
    async execute(interaction) {
        const application = await interaction.client.application?.fetch();
        const teamMember = application.owner.members;
        if (!teamMember.has(interaction.user.id)) {
            await interaction.reply({ content: 'You are not authorized to use this command.', ephemeral: true });
            return;
        }
        const subcommand = interaction.options.getSubcommand();
        const action = interaction.options.getString('action');
        const roleoruser = interaction.options.getMentionable('roleoruser');
        const guildid = interaction.guild.id;
        
        if (subcommand === 'discord') {
            if (action === 'add'){
                const [rows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${roleoruser.id}'`);
                if (rows.length === 0) {
                    await pool.query(`INSERT INTO permissions_discord (id) VALUES ('${roleoruser.id}')`);
                }
                await pool.query(`UPDATE permissions_discord SET netg = 1, net = 1, blacklist = 1, rolesync = 1, kick = 1, global_kick = 1 WHERE id = '${roleoruser.id}'`);
                await interaction.reply({ content: `Added all permissions to ${roleoruser}`, ephemeral: true });
            } else if (action === 'remove') {
                await pool.query(`DELETE FROM permissions_discord WHERE id = '${roleoruser.id}'`);
                await interaction.reply({ content: `Removed all permissions from ${roleoruser}`, ephemeral: true });
            }
        } else if (subcommand === 'roles') {
            if (action === 'add') {
                // Loop through all roles in the server
                interaction.guild.roles.cache.forEach(async (role) => {
                    const [rows] = await pool.query(`SELECT * FROM permissions_role WHERE guildid = '${guildid}' AND id = '${role.id}'`);
                    let permissions = '';
            
                    if (rows.length === 0) {
                        // Insert new role with permissions
                        permissions = roleoruser.id;
                        await pool.query(`INSERT INTO permissions_role (id, guildid, permission) VALUES ('${role.id}', '${guildid}', '${permissions}')`);
                    } else {
                        // Update existing role with new permissions
                        permissions = rows[0].permission;
                        if (!permissions.includes(roleoruser.id)) {
                            permissions = permissions ? `${permissions},${roleoruser.id}` : roleoruser.id;
                            await pool.query(`UPDATE permissions_role SET permission = '${permissions}' WHERE id = '${role.id}' AND guildid = '${guildid}'`);
                        }
                    }
                });
            
                await interaction.reply({ content: `Checked all roles and updated permissions for ${roleoruser}`, ephemeral: true });
            }
            }
        }
};

