const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, Application } = require('discord.js');
const { createPool } = require('mysql2/promise');
const { database_name, database_host, database_password, database_user, connection_limit, issuer } = require('../../config.json');

const pool = createPool({
    host: database_host,
    user: database_user,
    password: database_password,
    database: database_name,
    connectionLimit: connection_limit,
});

module.exports = {
    cooldown: 5,
    category: 'bot',
    data: new SlashCommandBuilder()
        .setName('devuser')
        .setDescription('Development purposes only!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription(`List a use's attributes in the database. Development purposes only!`)
                .addStringOption(option =>
                    option.setName('user')
                            .setDescription('The user you want to display. Development purposes only!')
                            .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a user from the database. Development purposes only!')
                .addStringOption(option =>
                    option.setName('user')
                            .setDescription('The user you want to delete. Development purposes only!')
                            .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a user in the database. Development purposes only!')
                .addStringOption(option =>
                    option.setName('user')
                        .setDescription('The user you want to edit. Development purposes only!')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('The key you want to edit. Development purposes only!')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('The value you want to edit. Development purposes only!')
                        .setRequired(false))),
    async autocomplete(interaction) {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SHOW COLUMNS FROM users');
        await connection.release();
        const keys = rows.map(row => row.Field);
        const choices = keys.map(key => ({ name: key, value: key }));
        const focusedValue = interaction.options.getString('key');
        const filtered = choices.filter(choice => choice.name.startsWith(focusedValue));
        interaction.respond( filtered.map(choice => ({ name: choice.name, value: choice.value })));
    },
    async execute(interaction) {
        const userId = interaction.user.id;
        const application = await interaction.client.application?.fetch();
		const teamMember = application.owner.members;
		if (teamMember.has(interaction.user.id)) {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.options.getString('user');
            const connection = await pool.getConnection();
            const query = 'SELECT * FROM users WHERE id = ?';
            const [results] = await connection.execute(query, [guildId], error => {
                if (error) {
                    console.error('Error:', error);
                    return null;
                }
            });
            if (results.length === 0) {
                await interaction.reply({ content: `There is no user with the id \`${guildId}\`!`, ephemeral: true });
                return;
            }
            if (subcommand === 'list') { 
                const fields = [];
                const keys = Object.keys(results[0]);
                for (const key of keys) {
                    fields.push({ name: key, value: results[0][key] });
                }
                const embed = new EmbedBuilder()
                    .setTitle(`Table: Users`)
                for (let i = 0; i < results.length; i++)
                    embed.addFields({ name: `Row: ${guildId}`, value: fields.map(field => `${field.name}: ${field.value}`).join('\n') });

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else if (subcommand == 'edit'){
                const key = interaction.options.getString('key');
                const value = interaction.options.getString('value');
                const keys = Object.keys(results[0]);
                if (!keys.includes(key)) {
                    await interaction.reply({ content: `There is no key \`${key}\` in the users with the id \`${guildId}\`!`, ephemeral: true });
                    return;
                }
                const connection = await pool.getConnection();
                const query = `UPDATE users SET ${key} = ? WHERE id = ?`;
                await connection.execute(query, [value, guildId]);
                await connection.release();
                const embed = new EmbedBuilder()
                    .setTitle(`Table: Users`)
                    .setDescription(`The user with the id \`${userId}\` has been updated!`)
                    .addFields(
                        { name: `New`, value: `${key}: ${value}` },
                        { name: `Old`, value: `${key}: ${results[0][key]}` });
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else if (subcommand == 'delete'){
                const connection = await pool.getConnection();
                const query = 'DELETE FROM users WHERE id = ?';
                await connection.execute(query, [guildId]);
                await connection.release();
                const embed = new EmbedBuilder()
                    .setTitle(`Table: Users`)
                    .setDescription(`The user with the id \`${userId}\` has been deleted!`);
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
};