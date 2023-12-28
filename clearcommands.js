const { token, clientId} = require('./config.json');
const {REST, Routes} = require('discord.js');
const {Client, GatewayIntentBits} = require('discord.js');
const commands = [];
const rest = new REST({ version: '10' }).setToken(token);
try {
  console.log('Started refreshing application (/) commands.');

  rest.put(Routes.applicationCommands(clientId), { body: commands });

  console.log('Successfully reloaded application (/) commands.');
} catch (error) {
  console.error(error);
}
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    interaction.reply('Pong!');
  }
});
client.login(token);