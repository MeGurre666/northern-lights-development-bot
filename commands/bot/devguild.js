const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
    category: 'bot',
    data: new SlashCommandBuilder()
        .setName('devguild')
        .setDescription('Development purposes only!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all guilds in the database.')
                .addStringOption(option =>
                    option.setName('guild')
                            .setDescription('The guild you want to display. Development purposes only!')
                            .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a guild from the database. Development purposes only!')
                .addStringOption(option =>
                    option.setName('guild')
                            .setDescription('The guild you want to delete. Development purposes only!')
                            .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a guild in the database. Development purposes only!')
                .addStringOption(option =>
                    option.setName('guild')
                        .setDescription('The guild you want to edit. Development purposes only!')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('The key you want to edit. Development purposes only!')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('The value you want to edit. Development purposes only!'))),
    async autocomplete(interaction) {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SHOW COLUMNS FROM guilds');
        await connection.release();
        const keys = rows.map(row => row.Field);
        const choices = keys.map(key => ({ name: key, value: key }));
        const focusedValue = interaction.options.getString('key');
        const filtered = choices.filter(choice => choice.name.startsWith(focusedValue));
        interaction.respond( filtered.map(choice => ({ name: choice.name, value: choice.value })));
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const application = await interaction.client.application?.fetch();
        const teamMember = application.owner.members;
        if (!teamMember.has(interaction.user.id)) {
            await interaction.reply({ content: 'You are not authorized to use this command.', ephemeral: true });
            return;
        }
        const guildId = interaction.options.getString('guild');
        const connection = await pool.getConnection();
        const query = 'SELECT * FROM guilds WHERE guild_id = ?';
        const [results] = await connection.execute(query, [guildId]);
        await connection.release();

        if (results.length === 0) {
            await interaction.reply({ content: `There is no guild with the id \`${guildId}\`!`, ephemeral: true });
            return;
        }
        if (subcommand === 'list'){
            const fields = [];
            const keys = Object.keys(results[0]);
            for (const key of keys) {
                fields.push({ name: key, value: results[0][key] });
            }

            const embed = new EmbedBuilder().setTitle(`Table: Guilds`);
            for (let i = 0; i < results.length; i++) {
                embed.addFields({ name: `Row: ${guildId}`, value: fields.map(field => `${field.name}: ${field.value}`).join('\n') });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (subcommand == 'edit'){
            const key = interaction.options.getString('key');
            const value = interaction.options.getString('value');
            const keys = Object.keys(results[0]);
            if (!keys.includes(key)) {
                await interaction.reply({ content: `There is no key \`${key}\` in the guild with the id \`${guildId}\`!`, ephemeral: true });
                return;
            }
            const connection = await pool.getConnection();
            const query = `UPDATE guilds SET ${key} = ? WHERE guild_id = ?`;
            await connection.execute(query, [value, guildId]);
            await connection.release();
            const embed = new EmbedBuilder()
                .setTitle(`Table: Guilds`)
                .setDescription(`The guild with the id \`${guildId}\` has been updated!`)
                .addFields(
                    { name: `New`, value: `${key}: ${value}` },
                    { name: `Old`, value: `${key}: ${results[0][key]}` });
            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } else if (subcommand == 'delete'){
            const connection = await pool.getConnection();
            const query = 'DELETE FROM guilds WHERE guild_id = ?';
            await connection.execute(query, [guildId]);
            await connection.release();
            const embed = new EmbedBuilder()
                .setTitle(`Table: Guilds`)
                .setDescription(`The guild with the id \`${guildId}\` has been deleted!`);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
