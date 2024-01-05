const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const mysql = require('mysql2');
const { database_name} = require('../../config.json');
const path = require('path');
const fs = require('fs');
module.exports = {
    cooldown: 5,
	category: 'project',
	data: new SlashCommandBuilder()
		.setName('todo')
		.setDescription('Different options for the todo command!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a To Do!')
                .addStringOption(option =>
                    option
                        .setName('todo')
                        .setDescription('The To Do to add!')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option
                        .setName('priority')
                        .setDescription('The priority of the To Do!')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a To Do!')
                .addStringOption(option =>
                    option
                        .setName('todo')
                        .setDescription('The To Do to remove!')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all To Do!'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all To Do!')),
	async execute(interaction) {
        const logPath = path.join(__dirname, '../../logs');
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const logFilePath = path.join(logPath, `${dateStr}.log`);
		const application = await interaction.client.application?.fetch();
		const teamMember = application.owner.members;
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: database_name,
        }); 
        if (teamMember.has(interaction.user.id)) {
            const subCommand = interaction.options.getSubcommand();
            connection.connect((err) => {
                if (err) {
                    console.error('Error connecting to the database:', err);
                    fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while connecting to the database | ${err.stack}\n`);
                    return;
                }

                fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | ${interaction.user.tag} (${interaction.user.id}) connected to the database.\n`);
                const userId = interaction.user.id.toString();
                const todo = interaction.options.getString('todo');
                const currentTime = Math.floor(Date.now() / 1000);
                

                if (subCommand === 'add') {
                    const priorityOption = interaction.options.get('priority');
                    if (!priorityOption || isNaN(priorityOption.value)) {
                        return interaction.reply({ content: 'Please provide an integer value for the priority option.', ephemeral: true });
                    }
                    const addTodoQuery = `
                        INSERT INTO todo_list (user_id, todo, time, priority)
                        VALUES ('${userId}', '${todo}', '${currentTime}', '${priorityOption.value}')
                    `;
                    connection.query(addTodoQuery, (err, results) => {
                        if (err) {
                            console.error('Error adding todo to the database:', err);
                            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while adding a todo to the database | ${err.stack}\n`);
                            return;
                        }

                        fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | ${interaction.user.tag} (${interaction.user.id}) added a todo to the database.\n`);
                        const embed = new EmbedBuilder()
                            .setTitle('Todo Added!')
                            .setDescription(`You have added the todo \`${todo}\` to the team to do list!`)
                            .setColor('#037bfc')
                            .setFooter({text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true })});
                        interaction.reply({ embeds: [embed], ephemeral: true });
                    });
                } else if (subCommand === 'remove') {
                    const removeTodoQuery = `
                        DELETE FROM todo_list
                        WHERE user_id = '${userId}' AND todo = '${todo}'
                    `;
                    connection.query(removeTodoQuery, (err, results) => {
                        if (err) {
                            console.error('Error removing todo from the database:', err);
                            fs.appendFileSync(logFilePath, `[ERROR] ${new Date().toLocaleTimeString()} | Command: Todo | ${interaction.user.tag} (${interaction.user.id}) received an error while removing a todo from the database | ${err.stack}\n`);
                            return;
                        }

                        fs.appendFileSync(logFilePath, `[INFO] ${new Date().toLocaleTimeString()} | ${interaction.user.tag} (${interaction.user.id}) removed a todo from the database.\n`);
                        const embed = new EmbedBuilder()
                            .setTitle('Todo Removed!')
                            .setDescription(`You have removed the todo \`${todo}\` from the teams to do list!`)
                            .setColor('#037bfc')
                            .setFooter({text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true })});
                        interaction.reply({ embeds: [embed], ephemeral: true });
                    });
                }
                else if (subCommand === 'list') {
                    const listTodoQuery = `
                        SELECT todo, time, priority
                        FROM todo_list
                        WHERE user_id = '${userId}'
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
                            .setTitle('To Do List!')
                            .setDescription(`Here is the team's to do list!`)
                            .setColor('#037bfc')
                            .setFooter({text: 'Get your own custom bot today at https://megurre666.zip ', iconURL: application.iconURL({ dynamic: true })});
                        //if there is more than 25 results create a second page which you can go to with buttons
                    
                        interaction.reply({ embeds: [embed], ephemeral: true });
                    });
                } else if (subCommand === 'clear') {

                    //clears all to dos
                }
            })
        }
    }
}






    




    function formatUptime(uptime) {
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }