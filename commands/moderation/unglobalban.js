const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
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
        .setName('unglobalban')
        .setDescription('Unglobal bans a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unglobal ban.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the unglobal ban.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('ban_id')
                .setDescription('The ban id to unglobal ban. NETG-XXXXXX')
                .setRequired(false)),
    async execute(interaction) {
        const [userRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id = '${interaction.user.id}'`);
        const reason = interaction.options.getString('reason') || 'No reason provided';
        let banId = interaction.options.getString('ban_id');
        let hasPermission = userRows.length > 0 && userRows[0].netg === 1;
        const guildId = interaction.guild.id;
        const application = await interaction.client.application?.fetch();
        if (!hasPermission) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const roleIds = member.roles.cache.map(role => role.id);
            if (roleIds.length > 0) {
                const [roleRows] = await pool.query(`SELECT * FROM permissions_discord WHERE id IN (${roleIds.map(id => `'${id}'`).join(', ')})`);
                hasPermission = roleRows.some(row => row.netg === 1);
            }
        }

        if (!hasPermission) {
            const embed = new EmbedBuilder()
                .setTitle('You do not have permission to use this command')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const user = interaction.options.getUser('user');
            if (!user && !banId) {
                const embed = new EmbedBuilder()
                    .setTitle('You must provide a user or a ban id')
                    .setColor('#FF0000');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (user && !banId) {
                const [latestBan] = await pool.query(`SELECT * FROM global_ban WHERE id = '${user.id}' ORDER BY ban_time DESC LIMIT 1`);
                if (latestBan.length > 0 && latestBan[0].ownership === 1) {
                    const teamMember2 = application.owner.members;
                    if (!interaction.member.roles.cache.has('1175245316992274492') && !teamMember2.has(interaction.user.id)) {
                        const embed = new EmbedBuilder()
                            .setTitle('You do not have permission to unglobal ban this user')
                            .setColor('#FF0000');
                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle('User unbanned')
                    .setDescription(`The user ${user} has been unbanned from all servers.`)
                    .setColor('#00FF00');
                interaction.reply({ embeds: [embed], ephemeral: true });

                const guilds = interaction.client.guilds.cache;
                guilds.forEach(async (guild) => {
                    try {
                        const bans = await guild.bans.fetch();
                        if (!bans.has(user.id)) {
                            return;
                        }
                        await guild.members.unban(user.id, { reason: `Global unbanned by ${interaction.user.username} for ${reason}` });
                    } catch (error) {
                        if (error.code === 10007) {
                            console.log(`User ${user.id} is not a member of guild ${guild.id}`);
                        } else {
                            console.log(error);
                        }
                    }
                });

                await pool.query(`DELETE FROM global_ban WHERE id = '${user.id}'`);
            } else if (!user && banId) {
                if (!banId.startsWith('NETG-')) {
                    banId = `NETG-${banId}`;
                }
                const [rows] = await pool.query(`SELECT * FROM global_ban WHERE ban_id = '${banId}'`);
                if (rows.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('Ban id not found')
                        .setDescription('The ban id provided was not found.')
                        .setColor('#FF0000');
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                const user_id = rows[0].id;
                const user = await interaction.client.users.fetch(user_id);

                if (rows[0].ownership === 1) {
                    const teamMember2 = application.owner.members;
                    if (!interaction.member.roles.cache.has('1175245316992274492') && !teamMember2.has(interaction.user.id)) {
                        const embed = new EmbedBuilder()
                            .setTitle('You do not have permission to unglobal ban this user')
                            .setColor('#FF0000');
                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle('User unbanned')
                    .setDescription(`The user ${user} has been unbanned from all servers.`)
                    .setColor('#00FF00');
                interaction.reply({ embeds: [embed], ephemeral: true });

                const guilds = interaction.client.guilds.cache;
                guilds.forEach(async (guild) => {
                    try {
                        const bans = await guild.bans.fetch();
                        if (!bans.has(user.id)) {
                            return;
                        }
                        await guild.members.unban(user.id, { reason: `Global unbanned by ${interaction.user.username} for ${reason}` });
                    } catch (error) {
                        if (error.code === 10007) {
                            console.log(`User ${user.id} is not a member of guild ${guild.id}`);
                        } else {
                            console.log(error);
                        }
                    }
                });

                await pool.query(`DELETE FROM global_ban WHERE ban_id = '${banId}'`);
            }

            const [results] = await pool.query(`SELECT * FROM guilds WHERE id = '${interaction.guild.id}'`);
            if (results[0].log_channel !== 0 && results[0].log_channel !== null && results[0].log_channel !== undefined && results[0].log_channel !== 'null' && results[0].log_channel !== '') {
                try {
                    const webhookClient = new WebhookClient({ id: results[0].logging_id, token: results[0].logging_token });

                    if (!webhookClient) {
                        console.log('No webhook found error');
                        return;
                    }
                    const embed5 = new EmbedBuilder()
                        .setTitle('User UnGlobal Banned')
                        .setDescription(`User ${user} has been unglobalbanned with ban id ${banId}`)
                        .addFields({ name: 'UnGloballed By', value: `${interaction.user} | ${interaction.user.id}` },
                            { name: 'Reason', value: `${reason}` })
                        .setColor('#037bfc')
                        .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                    webhookClient.send({ embeds: [embed5] }).catch(console.error);
                } catch (error) {
                    console.error(`Error happened in ${guildId}, check logs for error code ${error}`);
                    fs.appendFileSync(logFilePath, `[${date.toLocaleString()}] [ERROR] | Command: UnGlobal Ban | Command Section: UnGlobal ban | ${interaction.user.tag} (${interaction.user.id}) received an error: ${error}\n`);
                }
            }
        }
    }
};