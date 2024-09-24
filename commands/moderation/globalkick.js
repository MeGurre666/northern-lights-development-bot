const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ContextMenuCommandBuilder, ApplicationCommandType, REST, Routes, WebhookClient, blockQuote, bold, italic, quote, spoiler, strikethrough, underline } = require('discord.js');
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
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('globalkick')
        .setDescription('Global kicks a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to global kick.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the global kick.')
                .setRequired(false)),
    async execute(interaction) {
        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${interaction.user.id}'`);
        const application = await interaction.client.application?.fetch();
        let hasPermission = userRows.length > 0 && userRows[0].global_kick === 1;
        
        if (!hasPermission) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const roleIds = member.roles.cache.map(role => role.id);
            if (roleIds.length > 0) {
                const [roleRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id IN (${roleIds.map(id => `'${id}'`).join(', ')})`);
                hasPermission = roleRows.some(row => row.global_kick === 1);
            }
        }
        
        if (!hasPermission) {
            const embed = new EmbedBuilder()
                .setTitle('You do not have permission to use this command')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const memberToKick = await interaction.guild.members.fetch(user.id);
            const memberKicking = await interaction.guild.members.fetch(interaction.user.id);
            const guildId = interaction.guild.id;

            // Check if the command executor's highest role is higher than the target user's highest role
            if (memberToKick.roles.highest.position >= memberKicking.roles.highest.position) {
                const embed = new EmbedBuilder()
                    .setTitle('You cannot kick this user')
                    .setDescription('The user you are trying to global kick has a role higher or equal to yours.')
                    .setColor('#FF0000');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const guilds = interaction.client.guilds.cache;
            for (const guild of guilds) {
                const member = await guild.members.fetch(user.id);
                if (member) {
                    await member.kick(reason);
                }
            }
            const embed = new EmbedBuilder()
                .setTitle(`User ${user.username} has been kicked`)
                .setDescription(`The user has been kicked from all servers.`)
                .setColor('#00FF00');
            interaction.reply({ embeds: [embed], ephemeral: true });
            const [results] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
            if (results[0].log_channel !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !== '') {
                try {
                    const webhookClient = new WebhookClient({ id: results[0].logging_id, token: results[0].logging_token });

                    if (!webhookClient) {
                        console.log('No webhook found error');
                        return;
                    }
                    const embed5 = new EmbedBuilder()
                        .setTitle('User Global Kicked')
                        .setDescription(`The user ${user} has been global kicked from all servers.`)
                        .addFields({ name: 'Global Kicked By', value: `${interaction.user} | ${interaction.user.id}` },
                            { name: 'Reason', value: `${reason}` })
                        .setColor('#037bfc')
                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: application.iconURL({ dynamic: true }) });
                    webhookClient.send({ embeds: [embed5] }).catch(console.error);
                } catch (error) {
                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                    fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [ERROR] | Command: Global Kick | Command Section: Global kick | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                }
            }
        }
    }
};