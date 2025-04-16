const { Client, GatewayIntentBits, Partials, ActivityType, ChannelType, InteractionType, ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CHECK_URL = 'https://shredsauce.com/test.php';
const CHECK_INTERVAL = 10 * 60 * 1000;

let wasDown = false;
let selectedChannelId = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('shredsauce servers', { type: ActivityType.Watching });
});

client.on('interactionCreate', async interaction => {
  if (interaction.type === InteractionType.ApplicationCommand) {
    if (interaction.commandName === 'setchannel') {
      const channels = interaction.guild.channels.cache
        .filter(ch => ch.type === ChannelType.GuildText)
        .map(ch => ({ label: ch.name, value: ch.id }))
        .slice(0, 25); // max Discord dropdown limit

      const menu = new StringSelectMenuBuilder()
        .setCustomId('channel_select')
        .setPlaceholder('Choose a channel to send updates')
        .addOptions(channels);

      const row = new ActionRowBuilder().addComponents(menu);

      await interaction.reply({ content: 'Pick a channel:', components: [row], ephemeral: true });
    }

    if (interaction.commandName === 'status') {
      const up = await checkServer();
      const msg = up ? '✅ Sauce server is **up**.' : '❌ Sauce server is **down**.';
      await interaction.reply(msg);
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'channel_select') {
    selectedChannelId = interaction.values[0];
    await interaction.update({ content: `📡 Updates will be sent to <#${selectedChannelId}>`, components: [] });
    runCheck(); // run once after setup
  }
});

async function checkServer() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    await fetch(CHECK_URL, { signal: controller.signal });
    clearTimeout(timeout);
    return true; // got any response = up
  } catch {
    return false; // timeout or fetch failed = down
  }
}

async function runCheck() {
  const isUp = await checkServer();
  if (!selectedChannelId) return;

  const channel = await client.channels.fetch(selectedChannelId);
  if (!channel) return;

  if (isUp && wasDown) {
    channel.send('✅ **Shredsauce is back up.**');
  } else if (!isUp && !wasDown) {
    channel.send('❌ **Shredsauce might be down.**');
  }

  wasDown = isUp;
}

setInterval(runCheck, CHECK_INTERVAL);

client.login(TOKEN);
