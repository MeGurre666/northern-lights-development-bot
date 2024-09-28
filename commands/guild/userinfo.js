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
    category: 'guild',
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Displays information about a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check.')
                .setRequired(true)),
    async execute(interaction) {
        const guild = interaction.guild;
        const user = interaction.options.getUser('user');
        const [results] = await pool.query(`SELECT * FROM global_ban WHERE id = '${user.id}'`);
        const bans = await guild.bans.fetch();
        const ban = bans.get(user.id);

        let member;
        try {
            member = await guild.members.fetch(user.id);
        } catch (error) {
            if (error.code === 10007) {
                member = null;
            } else {
                throw error;
            }
        }

        let roles = 'None';
        let joinedServer = 'Unknown';
        if (member) {
            roles = member.roles.cache
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position) // Sort roles by position
                .map(role => `<@&${role.id}>`)
                .join(', ');
        
            if (!roles) {
                roles = 'None';
            }
            joinedServer = member.joinedAt ? member.joinedAt.toUTCString() : 'Unknown';
        }

        const joinedDiscord = user.createdAt ? user.createdAt.toUTCString() : 'Unknown';

        const embed = new EmbedBuilder()
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'User ID', value: user.id, inline: false },
                { name: 'Joined Discord', value: joinedDiscord, inline: false },
                { name: 'Joined Server', value: joinedServer, inline: false },
                { name: 'Roles', value: roles, inline: false }
            )
            .setColor('#00FF00');

        if (ban) {
            if (ban.reason.includes('NETG-')) {
                const banId = ban.reason.match(/NETG-\d{7}/g);
                const [rows] = await pool.query(`SELECT * FROM global_ban WHERE ban_id = '${banId}'`);
                if (rows.length > 0) {
                    rows.sort((a, b) => b.id - a.id);
                    const row = rows[0];
                    embed.addFields(
                        { name: 'Banned', value: 'Global Banned', inline: false },
                        { name: 'Reason', value: row.reason, inline: false }
                    );
                } else {
                    embed.addFields(
                        { name: 'Banned', value: 'Yes', inline: false },
                        { name: 'Reason', value: ban.reason, inline: false }
                    );
                }
            } else {
                embed.addFields(
                    { name: 'Banned', value: 'Yes', inline: false },
                    { name: 'Reason', value: ban.reason, inline: false }
                );
            }
        } else {
            embed.addFields(
                { name: 'Banned', value: 'No', inline: false },
            );
        }

        interaction.reply({ embeds: [embed] });
    }
};