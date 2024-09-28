const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit } = require('../../config.json');
const fs = require('fs');
const path = require('path');
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
        .setName('sticky')
        .setDescription('Sticky a message to the channel.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to sticky.')
                .setRequired(true)),
    async execute(interaction) {
        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${interaction.user.id}'`);
        const application = await interaction.client.application?.fetch();
        let hasPermission = userRows.length > 0 && userRows[0].sticky === 1;
        const messageContent = interaction.options.getString('message');
        if (!hasPermission) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const roleIds = member.roles.cache.map(role => role.id);
            if (roleIds.length > 0) {
                const [roleRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id IN (${roleIds.map(id => `'${id}'`).join(', ')})`);
                hasPermission = roleRows.some(row => row.sticky === 1);
            }
        }
        if (!hasPermission){
            const embed = new EmbedBuilder()
                .setTitle('You do not have permission to use this command')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const channel = interaction.channel;

            const [existingMessageRows] = await pool.query(`SELECT * FROM sticky WHERE channel_id = '${channel.id}'`);
            if (existingMessageRows.length > 0) {
                for (const row of existingMessageRows) {
                    try {
                        const previousMessage = await channel.messages.fetch(row.id);
                        if (previousMessage) {
                            await previousMessage.delete();
                        }
                    } catch (error) {
                        console.error(`Failed to delete previous message with ID ${row.id}: ${error}`);
                    }
                }
                // Delete all previous message records from the database for the same channel
                await pool.query(`DELETE FROM sticky WHERE channel_id = '${channel.id}'`);
            }

            // Add "Sticked Message" header and then 2 lines space before the message
            const stickiedMessageContent = `__**Sticked Message**__\n\n${messageContent}`;

            // Send the new stickied message
            const sentMessage = await channel.send(stickiedMessageContent);

            // Save the new message and channel ID to the database
            await pool.query(`INSERT INTO sticky (id, guild_id, channel_id, message) VALUES ('${sentMessage.id}', '${interaction.guild.id}', '${channel.id}', '${messageContent}')`);

            const embed = new EmbedBuilder()
                .setTitle('Message stickied')
                .setDescription(`The message has been stickied to this channel.`)
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
                        .setTitle('Message Stickied')
                        .setDescription(`Message has been stickied`)
                        .addFields(
                            { name: 'Stickied By', value: `${interaction.user} | ${interaction.user.id}` },
                            { name: 'Message', value: `${stickiedMessageContent}` },
                            { name: 'Channel', value: `${interaction.channel}` },
                        )
                        .setColor('#037bfc')
                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip', iconURL: application.iconURL({ dynamic: true }) });
                    webhookClient.send({ embeds: [embed5] }).catch(console.error);
                } catch (error) {
                    console.error(`Error happened in ${interaction.guild.id}, check logs for error code ${error}`);
                    const logPath = path.join(__dirname, '../../logs');
                    const date = new Date();
                    const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                    const logFilePath = path.join(logPath, `${dateStr}.log`);
                    fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: Sticky | Command Section: Sticky | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                }
            }
        }
    }
}