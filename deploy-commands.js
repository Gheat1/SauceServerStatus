// deploy-commands.js
// Registers only the /status command
const { SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check if the Shredsauce server is up')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 Deploying /status...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ /status deployed.');
  } catch (err) {
    console.error('❌ Error deploying commands:', err);
  }
})();
