// deploy-commands.js
const { SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder().setName('status').setDescription('Check if the Sauce server is up'),
  new SlashCommandBuilder().setName('setchannel').setDescription('Set the channel to send Sauce server status alerts')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Deploying slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash commands deployed.');
  } catch (err) {
    console.error('❌ Failed to deploy commands:', err);
  }
})();
