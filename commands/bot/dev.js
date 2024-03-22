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
function random(colors) {
    return colors[Math.floor(Math.random() * colors.length)];
};

module.exports = {
    cooldown: 5,
    category: 'bot',
    data: new SlashCommandBuilder()
        .setName('dev')
        .setDescription('Development purposes only!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all columns in the database.')
                .addStringOption(option =>
                    option.setName('table')
                            .setDescription('The table you want to display. Development purposes only!')
                            .setRequired(true)
                            .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('id')
                            .setDescription('The id you want to display. Development purposes only!')
                            .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a id from the database. Development purposes only!')
                .addStringOption(option =>
                    option.setName('table')
                            .setDescription('The guild you want to delete. Development purposes only!')
                            .setRequired(true)
                            .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('id')
                            .setDescription('The id you want to delete. Development purposes only!')
                            .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a id in the database. Development purposes only!')
                .addStringOption(option =>
                    option.setName('table')
                        .setDescription('The table you want to edit. Development purposes only!')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('The key you want to edit. Development purposes only!')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('The id you want to edit. Development purposes only!')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('The value you want to edit. Development purposes only!'))),
    async autocomplete(interaction) {
        const connection = await pool.getConnection();
        let choices;
        const [tables] = await connection.execute('SHOW TABLES');
        const keytable = tables.map(table => table.Tables_in_northern_lights);
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name === 'table') {
            choices = keytable.map(key => ({ name: key, value: key }));
        }
        if (focusedOption.name === 'key') {
            const [rows] = await connection.execute(`SHOW COLUMNS FROM ${interaction.options.getString('table')}`);
            const keyrow = rows.map(row => row.Field);
            choices = keyrow.map(key => ({ name: key, value: key }));
        }
        const filtered = choices.filter(choice => choice.name !== undefined && choice.name.startsWith(focusedOption.value));
        interaction.respond(filtered.map(choice => ({ name: choice.name, value: choice.value })));
        await connection.release();
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const application = await interaction.client.application?.fetch();
        const teamMember = application.owner.members;
        if (!teamMember.has(interaction.user.id)) {
            await interaction.reply({ content: 'You are not authorized to use this command.', ephemeral: true });
            return;
        }
        if (subcommand === 'list') {
            const table = interaction.options.getString('table');
            const id = interaction.options.getString('id');
            const connection = await pool.getConnection();
            const query = `SELECT * FROM ${table} WHERE id = ?`;
            const [results] = await connection.execute(query, [id]);
            await connection.release();
            if (results.length === 0) {
                await interaction.reply({ content: `There is no id with the id \`${id}\`!`, ephemeral: true });
                return;
            }
            const fields = [];
            if (typeof results[0] === 'object' && results[0] !== null) {
                for (const [key, value] of Object.entries(results[0])) {
                    fields.push({ name: key, value: String(value)});
                }
            }
            const embed = new EmbedBuilder()
                .setTitle(`List of table: ${table}`)
                .setDescription(`ID: ${id}`)
                .setColor(random(['#008000', '#E50000']))
                .addFields(fields);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (subcommand === 'delete') {
            const table = interaction.options.getString('table');
            const id = interaction.options.getString('id');
            const connection = await pool.getConnection();
            const query = `DELETE FROM ${table} WHERE id = ?`;
            await connection.execute(query, [id]);
            await connection.release();
            const embed = new EmbedBuilder()
                .setTitle(`Table: ${table}`)
                .setDescription(`ID: ${id}`)
                .setColor(random(['#008000', '#E50000']))
                .addFields(
                    {name:'Action', value:'Deleted'});
            await interaction.reply({ embeds: [embed], ephemeral: true});
        } else if (subcommand === 'edit') {
            const table = interaction.options.getString('table');
            const key = interaction.options.getString('key');
            const id = interaction.options.getString('id');
            const value = interaction.options.getString('value');
            const connection = await pool.getConnection();
            const query = `UPDATE ${table} SET ${key} = ? WHERE id = ?`;
            const query2 = `SELECT * FROM ${table} WHERE id = ?`;
            const [results] = await connection.execute(query2, [id]);
            await connection.execute(query, [value, id]);
            await connection.release();
            const embed = new EmbedBuilder()
                .setTitle(`Table: ${table}`)
                .setDescription(`The ${table} with the id ${id} has been updated!`)
                .setColor(random(['#008000', '#E50000']))
                .addFields(
                    { name: `New`, value: `${key}: ${value}`, inline: true },
                    { name: `Old`, value: `${key}: ${results[0][key]}`, inline: true });
            await interaction.reply({ embeds: [embed], ephemeral: true});
        }
    }
};