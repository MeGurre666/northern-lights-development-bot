const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mysql = require('mysql2');
const { database_name} = require('../../config.json');
const path = require('path');
const fs = require('fs');
const { type } = require('os');
module.exports = {
    cooldown: 5,
	category: 'project',
	data: new SlashCommandBuilder()
		.setName('todo')
		.setDescription('Different options for the todo command!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a Todo!')
                .addStringOption(option =>
                    option
                        .setName('todo')
                        .setDescription('The Todo to add!')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option
                        .setName('priority')
                        .setDescription('The priority of the Todo! (1-5)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a Todo!')
                .addStringOption(option =>
                    option
                        .setName('todo')
                        .setDescription('The Todo to remove!')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all Todo!'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all Todo!')),
	async execute(interaction) {
        const logPath = path.join(__dirname, '../../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);
		const application = await interaction.client.application?.fetch();
        const guildId = interaction.guild.id;
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: database_name,
        });
        const querystart = `SELECT * FROM guilds WHERE id = '${guildId}'`;
        connection.query(querystart, (err, results) => {
            if (err) {
                console.error('Error getting guild data from the database:', err);
                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while getting guild data from the database | ${err.stack}\n`);
                return;
            }
            const dev = results[0].dev
            if (dev === null) {
                interaction.reply({ content: 'You need to set a developer role before using this command!', ephemeral: true });
                return;
            }
            const devsplit = dev.split(',')
            if (interaction.member.roles.cache.some(role => devsplit.includes(role.id))) {
                const subCommand = interaction.options.getSubcommand();
                connection.connect((err) => {
                    if (err) {
                        console.error('Error connecting to the database:', err);
                        fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while connecting to the database | ${err.stack}\n`);
                        return;
                    }
                    const userId = interaction.user.id.toString();
                    const todo = interaction.options.getString('todo');
                    const currentTime = Math.floor(Date.now() / 1000);
                    if (subCommand === 'add') {
                        const priorityOption = interaction.options.get('priority');
                        if (!priorityOption || isNaN(priorityOption.value)) {
                            return interaction.reply({ content: 'Please provide an integer value for the priority option.', ephemeral: true });
                        }
                        if (priorityOption.value < 1 || priorityOption.value > 5) {
                            return interaction.reply({ content: 'Please provide an integer value between 1 and 5 for the priority option.', ephemeral: true });
                        }
                        const checkTodoQuery = `
                            SELECT todo
                            FROM todo_list
                            WHERE user_id = '${userId}' AND todo = '${todo}' and id = '${guildId}'
                        `;
                        connection.query(checkTodoQuery, (err, results) => {
                            if (err) {
                                console.error('Error checking todo in the database:', err);
                                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while checking a todo in the database | ${err.stack}\n`);
                                return;
                            }
                            if (results.length > 0) {
                                return interaction.reply({ content: 'That todo already exists!', ephemeral: true });
                            }
                        });
                        const addTodoQuery = `
                            INSERT INTO todo_list (user_id, id, todo, time, priority)
                            VALUES ('${userId}', '${guildId}', '${todo}', '${currentTime}', '${priorityOption.value}')
                        `;
                        connection.query(addTodoQuery, (err, results) => {
                            if (err) {
                                console.error('Error adding todo to the database:', err);
                                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while adding a todo to the database | ${err.stack}\n`);
                                return;
                            }
                            const embed = new EmbedBuilder()
                                .setTitle('Todo Added!')
                                .setDescription(`You have added the todo \`${todo}\` to the team todo list!`)
                                .setColor('#037bfc')
                                .setFooter({text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true })});
                            interaction.reply({ embeds: [embed], ephemeral: true });
                        });
                    } else if (subCommand === 'remove') {
                        const checkTodoQuery = `
                            SELECT todo
                            FROM todo_list
                            WHERE user_id = '${userId}' AND todo = '${todo}' and id = '${guildId}'
                        `;
                        connection.query(checkTodoQuery, (err, results) => {
                            if (err) {
                                console.error('Error checking todo in the database:', err);
                                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while checking a todo in the database | ${err.stack}\n`);
                                return;
                            }
                            if (results.length === 0) {
                                return interaction.reply({ content: 'That todo does not exist!', ephemeral: true });
                            } else{

                            
                        
                            const removeTodoQuery = `
                                DELETE FROM todo_list
                                WHERE user_id = '${userId}' AND todo = '${todo}' AND id = '${guildId}'
                            `;
                            connection.query(removeTodoQuery, (err, results) => {
                                if (err) {
                                    console.error('Error removing todo from the database:', err);
                                    fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while removing a todo from the database | ${err.stack}\n`);
                                    return;
                                }
                                const embed = new EmbedBuilder()
                                    .setTitle('Todo Removed!')
                                    .setDescription(`You have removed the todo \`${todo}\` from the teams todo list!`)
                                    .setColor('#037bfc')
                                    .setFooter({text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true })});
                                interaction.reply({ embeds: [embed], ephemeral: true });
                            });
                        }
                        });
                        }
                    else if (subCommand === 'list') {
                        const listTodoQuery = `
                            SELECT todo, time, priority
                            FROM todo_list
                            WHERE user_id = '${userId}' and id = '${guildId}'
                            ORDER BY priority DESC
                        `;
                        connection.query(listTodoQuery, (err, results) => {
                            if (err) {
                                console.error('Error listing todo from the database:', err);
                                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while listing a todo from the database | ${err.stack}\n`);
                                return;
                            }
                            fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | ${interaction.user.tag} (${interaction.user.id}) listed a todo from the database.\n`);
                            const embed = new EmbedBuilder()
                                .setTitle('Todo List!')
                                .setDescription(`Here is the team's todo list!`)
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                            if (results.length > 25) {
                                const embed2 = new EmbedBuilder()
                                    .setTitle('Todo List!')
                                    .setDescription(`Here is the team's todo list!`)
                                    .setColor('#037bfc')
                                    .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                                for (let i = 0; i < results.length; i++) {
                                    if (i < 25) {
                                        embed.addFields({ name: `Todo ${i + 1}`, value: `**Todo:** ${results[i].todo}\n**Time Added:** ${new Date(results[i].time * 1000).toLocaleString()}\n**Priority:** ${results[i].priority}` });
                                    } else {
                                        embed2.addFields({ name: `Todo ${i + 1}`, value: `**Todo:** ${results[i].todo}\n**Time Added:** ${new Date(results[i].time * 1000).toLocaleString()}\n**Priority:** ${results[i].priority}` });
                                    }
                                }
                                const button1 = new ButtonBuilder()
                                    .setCustomId('todo_list_1')
                                    .setLabel('Page 1')
                                    .setStyle(ButtonStyle.Primary);
                                const button2 = new ButtonBuilder()
                                    .setCustomId('todo_list_2')
                                    .setLabel('Page 2')
                                    .setStyle(ButtonStyle.Primary);
                                const buttonRow = new ActionRowBuilder()
                                    .addComponents(button1, button2);
                                interaction.reply({ embeds: [embed], components: [buttonRow], ephemeral: true });
                                const filter = i => i.customId === 'todo_list_1' || i.customId === 'todo_list_2';
                                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
                                collector.on('collect', async i => {
                                    if (i.customId === 'todo_list_1') {
                                        i.update({ embeds: [embed], components: [buttonRow], ephemeral: true });
                                    } else if (i.customId === 'todo_list_2') {
                                        i.update({ embeds: [embed2], components: [buttonRow], ephemeral: true });
                                    }
                                });
                                collector.on('end', collected => {
                                });
                            } else {
                                for (let i = 0; i < results.length; i++) {
                                    embed.addFields({ name: `Todo ${i + 1}`, value: `**Todo:** ${results[i].todo}\n**Time Added:** ${new Date(results[i].time * 1000).toLocaleString()}\n**Priority:** ${results[i].priority}` });
                                }
                                interaction.reply({ embeds: [embed], ephemeral: true });
                            }
                        });
                    } else if (subCommand === 'clear'){
                        const clearTodoQuery = `
                            DELETE FROM todo_list
                            WHERE user_id = '${userId}' and id = '${guildId}'
                        `;
                        connection.query(clearTodoQuery, (err, results) => {
                            if (err) {
                                console.error('Error clearing todo from the database:', err);
                                fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while clearing a todo from the database | ${err.stack}\n`);
                                return;
                            }
                            const embed = new EmbedBuilder()
                                .setTitle('Todo List Cleared!')
                                .setDescription(`You have cleared the team's todo list!`)
                                .setColor('#037bfc')
                                .setFooter({ text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true }) });
                            interaction.reply({ embeds: [embed], ephemeral: true });
                        });
                    }
            });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('Error!')
                    .setDescription(`You do not have permission to use this command!`)
                    .setColor('#037bfc')
                    .setFooter({text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true })});
                interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    )}
};