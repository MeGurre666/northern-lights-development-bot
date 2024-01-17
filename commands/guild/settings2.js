const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name } = require('../../config.json');
const path = require('path');
const fs = require('fs');

const pool = createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: database_name,
    connectionLimit: 100,
});

async function checkValidationStatus(userId, connection) {
    try {
        const [results] = await connection.execute('SELECT validate FROM users WHERE id = ?', [userId]);
        const isValidateTrue = results.length > 0 && results[0].validate;
        return isValidateTrue;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

module.exports = {
    cooldown: 5,
    category: 'guild',
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('The settings for the bot!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The category to edit!')
                .setRequired(true)
                .addChoices(
                    { name: '2FA', value: '2fa' },
                    { name: 'Logging', value: 'logging' },
                    { name: 'Ban Permissions', value: 'banpermissions' },
                    { name: 'Basic Moderation Permissions', value: 'basicmoderationpermissions' },
                    { name: 'Advanced Moderation Permissions', value: 'advancedmoderationpermissions' },
                    { name: 'Developer Roles', value: 'developerroles' },
                    { name: 'Raid Mode Channels', value: 'raidmodechannels' },
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
    async execute(interaction) {
        const userId = interaction.user.id;
        const logPath = path.join(__dirname, '../../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);
        const category = interaction.options.getString('category');
        const application = await interaction.client.application?.fetch();
        
        try {
            const connection = await pool.getConnection();
            const guildId = interaction.guild.id;
            const query = 'SELECT * FROM guilds WHERE guild_id = ?';
            const [results] = await connection.execute(query, [guildId]);
            const query2 = 'SELECT * FROM users WHERE id = ?';
            const [results2] = await connection.execute(query2, [userId]);

            if (category === '2fa'){
                if (results[0].fa_req === 1) {
                    const embed = new EmbedBuilder()
                            .setTitle('2FA Settings')
                            .setDescription('2FA is currently required for this server!')
                            .addFields({ name: 'Disable 2FA', value: 'To Disable 2FA being required for this server, click the button below!' })
                            .setColor('#037bfc')
                            .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('disable2fa')
                                    .setLabel('Disable 2FA')
                                    .setStyle(ButtonStyle.Danger)
                            );
                        interaction.reply({ embeds: [embed], components: [row], ephemeral:true });
                        const collection = interaction.channel.createMessageComponentCollector({ time: 15000 });
                        collection.on('collect', async i => {
                            if (i.customId === 'disable2fa' && i.user.id === userId) {
                                if (results2.length === 0) {
                                    const embed2 = new EmbedBuilder()
                                        .setTitle('2FA Settings')
                                        .setDescription('You need to have 2FA setup for your account due to it being required to make changes to the server!')
                                        .setColor('#037bfc')
                                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                    interaction.editReply({ embeds: [embed2], components: [], ephemeral: true });
                            } else {

                        }
                }
            });
        }
    }
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }
};