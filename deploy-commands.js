const { SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check Shredsauce server status'),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Choose a channel to receive alerts'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('⏳ Deploying commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log('✅ Commands deployed');
  } catch (err) {
    console.error(err);
  }
})();
