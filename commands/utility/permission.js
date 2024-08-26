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
        .setName('permission')
        .setDescription('Changes the permission of a role.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('discord')
                .setDescription('Add a permission to a role.')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('The action you want to perform.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' }))
                .addStringOption(option =>
                    option.setName('permission')
                        .setDescription('The permission you want to add/remove.')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addMentionableOption(option =>
                    option.setName('roleoruser')
                        .setDescription('The role or user you want to add/remove the permission to/from.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('roles')
                .setDescription('Adding who can give certain roles.')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('The action you want to perform.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' }))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role you want to add/remove the permission to/from.')
                        .setRequired(true))
                .addMentionableOption(option =>
                    option.setName('roleoruser')
                        .setDescription('The role or user you want to add/remove the permission to/from.')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async autocomplete(interaction) {
        const connection = await pool.getConnection();
        let choices;
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'permission') {
            const [columns] = await connection.query(`SHOW COLUMNS FROM permissions_discord`);
            const keyrow = columns.map(column => column.Field).filter(key => key.toLowerCase() !== 'id');
            choices = keyrow.map(key => ({
                name: key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
                value: key
            }));

            const filtered = choices.filter(choice => choice.name !== undefined && choice.name.startsWith(focusedOption.value));
            interaction.respond(filtered.map(choice => ({ name: choice.name, value: choice.value })));
        }
        await connection.release();
        return choices;
    },

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
        
        if (subcommand === 'discord') {
            const permission = interaction.options.getString('permission');
            const permission_name = permission.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
            if (action === 'add') {
                const [rows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${roleoruser.id}'`);
                if (rows.length === 0) {
                    await pool.query(`INSERT INTO permissions_discord (id) VALUES ('${roleoruser.id}')`);
                }
                await pool.query(`UPDATE permissions_discord SET ${permission} = 1 WHERE id = '${roleoruser.id}'`);
                const embed = new EmbedBuilder()
                    .setTitle('Permission Added')
                    .setDescription(`Permission ${permission_name} has been added to ${roleoruser}`)
                    .setColor('#00FF00');
                interaction.reply({ embeds: [embed], ephemeral: true });
            } else if (action === 'remove') {
                const [rows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${roleoruser.id}'`);
                if (rows.length === 0) {
                    await pool.query(`INSERT INTO permissions_discord (id) VALUES ('${roleoruser.id}')`);
                }
                await pool.query(`UPDATE permissions_discord SET ${permission} = 0 WHERE id = '${roleoruser.id}'`);
                const embed = new EmbedBuilder()
                    .setTitle('Permission Removed')
                    .setDescription(`Permission ${permission_name} has been removed from ${roleoruser}`)
                    .setColor('#00FF00');
                interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } else if (subcommand === 'roles') {
            const query = 'SELECT * FROM guilds WHERE id = ?';
            const role = interaction.options.getRole('role');
            const guildid = interaction.guild.id;
            const guildId = interaction.guild.id;
            const [rows] = await pool.query(`SELECT * FROM permissions_role WHERE id = '${role.id}' AND guildid = '${guildid}'`);
            let permissions = rows.length > 0 ? rows[0].permission : '';
            const connection = await pool.getConnection();
            const [results] = await connection.execute(query, [guildId], error => {
                if (error) {
                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                    fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Guild Loading | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                }
            })
            if (action === 'add') {
                if (!permissions.includes(roleoruser.id)) {
                    permissions = permissions ? `${permissions},${roleoruser.id}` : roleoruser.id;
                    if (rows.length === 0) {
                        await pool.query(`INSERT INTO permissions_role (id, guildid, permission) VALUES ('${role.id}', '${guildid}', '${permissions}')`);
                    } else {
                        await pool.query(`UPDATE permissions_role SET permission = '${permissions}' WHERE id = '${role.id}' AND guildid = '${guildid}'`);
                    }
                    const embed = new EmbedBuilder()
                        .setTitle('Permission Added')
                        .setDescription(`Permission to manage role <@&${role.id}> has been added to ${roleoruser}`)
                        .setColor('#00FF00');
                    interaction.reply({ embeds: [embed], ephemeral: true });
                    if (results[0].log_channeL !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !=='') {
                        try {
                            const webhookClient = new WebhookClient({id:results[0].logging_id, token:results[0].logging_token})

                            if (!webhookClient) {
                                console.log('No webhook found error')
                                return;
                            }
                            const embed5 = new EmbedBuilder()
                                .setTitle('Role Permission Added')
                                .setDescription(`Permission to manage role <@&${role.id}> has been added to ${roleoruser}`)
                                .addFields({ name: 'Changed By', value: `${interaction.user.tag} | ${interaction.user.id}` })
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                            webhookClient.send({ embeds: [embed5] }).catch(console.error);
                        } catch (error) {
                            console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                            fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Permission Roles | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                        }
                    }
                } else {
                    interaction.reply({ content: `Permission to manage role <@&${role.id}> already exists for ${roleoruser}`, ephemeral: true });
                }
            } else if (action === 'remove') {
                if (permissions.includes(roleoruser.id)) {
                    permissions = permissions.split(',').filter(id => id !== roleoruser.id).join(',');
                    await pool.query(`UPDATE permissions_role SET permission = '${permissions}' WHERE id = '${role.id}' AND guildid = '${guildid}'`);
                    const embed = new EmbedBuilder()
                        .setTitle('Permission Removed')
                        .setDescription(`Permission to manage role <@&${role.id}> has been removed from ${roleoruser}`)
                        .setColor('#00FF00');
                    interaction.reply({ embeds: [embed], ephemeral: true });
                    if (results[0].log_channeL !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !=='') {
                        try {
                            const webhookClient = new WebhookClient({id:results[0].logging_id, token:results[0].logging_token})

                            if (!webhookClient) {
                                console.log('No webhook found error')
                                return;
                            }
                            const embed5 = new EmbedBuilder()
                                .setTitle('Role Permission Removed')
                                .setDescription(`Permission to manage role <@&${role.id}> has been removed from ${roleoruser}`)
                                .addFields({ name: 'Changed By', value: `${interaction.user.tag} | ${interaction.user.id}` })
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                            webhookClient.send({ embeds: [embed5] }).catch(console.error);
                        } catch (error) {
                            console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                            fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Settings | Command Section: Permission Roles | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                        }
                    }
                } else {
                    interaction.reply({ content: `Permission to manage role ${role.id} does not exist for ${roleoruser}`, ephemeral: true });
                }
            }
        }
    }
};