const speakeasy = require('speakeasy');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder } = require('discord.js');
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
    }
}
