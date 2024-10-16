const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ContextMenuCommandBuilder, ApplicationCommandType, REST, Routes, WebhookClient, blockQuote, bold, italic, quote, spoiler, strikethrough, underline } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit } = require('../../config.json');
const fs = require('fs');
const path = require('path');
const interactionStateFile = path.join(__dirname, '../../interactionState3.json');
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
        .setName('blacklist')
        .setDescription('Blacklists a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to blacklist.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the blacklist.')
                .setRequired(false)),
    async execute(interaction) {
        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${interaction.user.id}'`);
        const application = await interaction.client.application?.fetch();
        let hasPermission = userRows.length > 0 && userRows[0].blacklist === 1;
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const memberBlacklisting = await interaction.guild.members.fetch(interaction.user.id);
        const guildId = interaction.guild.id;
        let memberToBlacklist;
        try {
            memberToBlacklist = await interaction.guild.members.fetch(user.id);
        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle('User not found')
                .setDescription('The user you are trying to blacklist is not a member of this guild.')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        if (!hasPermission || memberToBlacklist.roles.highest.position >= memberBlacklisting.roles.highest.position) {
            const embed = new EmbedBuilder()
                .setTitle('You do not have permission to use this command')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const guilds = interaction.client.guilds.cache;
            for (const [guildId, guild] of guilds) {
                try {
                    const member = await guild.members.fetch(user.id);
                    if (guild.id === "1174863104115490919") {
                        const roles = member.roles.cache;
                        for (const role of roles.values()) {
                            if (role.id !== "1288185524560859208") {
                                await member.roles.remove(role.id);
                            }
                        }
                        await member.roles.add("1288185524560859208");
                    } else {
                        await member.kick(`Blacklisted by ${interaction.user.tag} for ${reason}`);
                    }
                } catch (error) {
                    if (error.code === 10007) {
                        continue;
                    } else {
                        console.error(`Failed to kick user ${user.id} in guild ${guild.id}:`, error);
                    }
                }
            }
            await pool.query(`INSERT INTO blacklist (id, blacklisted_by, blacklist_time, reason) VALUES ('${user.id}', '${interaction.user.id}', NOW(), '${reason}')`);
            const embed2 = new EmbedBuilder()
                .setTitle(`User ${user} has been blacklisted`)
                .setDescription(`The user has been blacklisted`)
                .setColor('#00FF00');
            interaction.reply({ embeds: [embed2], ephemeral: true });
            const [results] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
            if (results[0].log_channel !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !== '') {
                try {
                    const webhookClient = new WebhookClient({ id: results[0].logging_id, token: results[0].logging_token });
        
                    if (!webhookClient) {
                        console.log('No webhook found error');
                        return;
                    }
                    const embed5 = new EmbedBuilder()
                        .setTitle('User Blacklisted')
                        .setDescription(`User ${user} has been blacklisted`)
                        .addFields({ name: 'Blacklisted By', value: `${interaction.user} | ${interaction.user.id}` },
                            { name: 'Reason', value: `${reason}` })
                        .setColor('#037bfc')
                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: application.iconURL({ dynamic: true }) });
                    webhookClient.send({ embeds: [embed5] }).catch(console.error);
                } catch (error) {
                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                    fs.appendFileSync(logFilePath, `[${new Date().toLocaleString()}] [ERROR] | Command: UnGlobal Ban | Command Section: UnGlobal ban | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                }
            }
        }
    }
}