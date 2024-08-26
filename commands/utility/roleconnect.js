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
        .setName('roleconnect')
        .setDescription('Connects roles between department and main')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to connect.')
                .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('The action to take.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' }))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of role')
                        .addChoices(
                            {name: "Department Coordinator", value: "cord"},
                            {name: "SLED", value: "sled"},
                            {name: "LEO Directors", value: "director"},
                            {name: "LEO AC+", value: "ac"},
                            {name: "LEO Supervisor", value: "supervisor"},
                            {name: "LEO", value: "leo"},
                            {name: "State Law (SCDPS)", value: "scdps"},
                            {name: "Local Law (MPPD/CCSO)", value: "mppd"},
                            {name: "SCDPS Application Review", value: "scdpsapp"},
                            {name: "MPPD/CCSO Application Review", value: "mppdapp"},
                            {name: "Fire Director", value: "firedirector"},
                            {name: "Fire AC+", value: "fireac"},
                            {name: "Fire/EMS", value: "fireems"},
                            {name: "Fire/EMS Application Reviewer", value: "fireemsapp"},
                            {name: "SCDOT Director", value: "scdotdirector"},
                            {name: "SCDOT Application Reviewer", value: "scdotapp"},
                            {name: "SCDOT/SHEP", value: "scdotshep"},
                            {name: "Waiting Fire Interview", value: "fireinterview"},
                            {name: "Waiting LEO Interview", value: "leointerview"},
                            {name: "Public Services", value: "publicservices"},
                            {name: "LEO Blacklist", value: "leoblacklist"},
                            {name: "Developer", value: "dev"})),
    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const action = interaction.options.getString('action');
        const type = interaction.options.getString('type');
        const guild = interaction.guild;
        const userid = interaction.user.id;
        const application = await interaction.client.application?.fetch();
        const teamMember = application.owner.members;
    
        if (!teamMember.has(interaction.user.id)) {
            return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
        }
    
        if (action === 'add') {
            const [results] = await pool.query('SELECT * FROM roleconnect WHERE roleid = ?', [role.id]);
            if (results.length === 0) {
                await pool.query('INSERT INTO roleconnect (id, roleid, connected) VALUES (?, ?, ?)', [guild.id, role.id, type]);
                return interaction.reply({ content: `Role ${role.name} has been connected to ${type}`, ephemeral: true });
            }
            if (results[0].connected.includes(type)) {
                return interaction.reply({ content: `Role ${role.name} is already connected to ${type}`, ephemeral: true });
            }
            let connected = results.length > 0 ? results[0].connected : '';
            connected = connected ? `${connected},${type}` : type;
            await pool.query(`UPDATE roleconnect SET connected = '${connected}' WHERE id = '${guild.id}' AND roleid = '${role.id}'`);
            return interaction.reply({ content: `Role ${role.name} has been connected to ${type}`, ephemeral: true });
        } else if (action === 'remove') {
            const [results] = await pool.query('SELECT * FROM roleconnect WHERE roleid = ?', [role.id]);
            if (results.length === 0) {
                return interaction.reply({ content: `Role ${role.name} is not connected to any roles.`, ephemeral: true });
            }
            if (!results[0].connected.includes(type)) {
                return interaction.reply({ content: `Role ${role.name} is not connected to ${type}`, ephemeral: true });
            }
            let connected = results[0].connected.split(',');
            connected = connected.filter((item) => item !== type);
            connected = connected.join(',');
            await pool.query(`UPDATE roleconnect SET connected = '${connected}' WHERE id = '${guild.id}' AND roleid = '${role.id}'`);
            return interaction.reply({ content: `Role ${role.name} has been disconnected from ${type}`, ephemeral: true });
        }
    }
};
