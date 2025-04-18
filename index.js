// index.js
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  ChannelType,
  InteractionType,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CHECK_URL = 'https://shredsauce.com/test.php';
const CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes
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
  // Slash commands
  if (interaction.type === InteractionType.ApplicationCommand) {
    // /setchannel handler
    if (interaction.commandName === 'setchannel') {
      const channels = interaction.guild.channels.cache
        .filter(ch => ch.type === ChannelType.GuildText)
        .map(ch => ({ label: ch.name, value: ch.id }))
        .slice(0, 25);

      const menu = new StringSelectMenuBuilder()
        .setCustomId('channel_select')
        .setPlaceholder('Choose a channel to send updates')
        .addOptions(channels);

      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.reply({ content: '📡 Pick a channel:', components: [row], ephemeral: true });
    }

    // /status handler (fixed to defer & editReply)
    if (interaction.commandName === 'status') {
      try {
        await interaction.deferReply();                               // 👈 defer first
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(CHECK_URL, { signal: controller.signal });
        clearTimeout(timeout);

        const msg = res.ok
          ? '✅ Sauce server is **up**.'
          : '❌ Sauce server is **down**.';
        await interaction.editReply(msg);                              // 👈 then editReply
      } catch {
        await interaction.editReply('❌ Sauce server is **down**.');
      }
    }
  }

  // Channel‑select menu callback
  if (interaction.isStringSelectMenu() && interaction.customId === 'channel_select') {
    selectedChannelId = interaction.values[0];
    await interaction.update({ content: `✅ Updates will be sent to <#${selectedChannelId}>`, components: [] });
    runCheck();   // send one immediate check
  }
});

// Returns true if any response within 8s
async function checkServer() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    await fetch(CHECK_URL, { signal: controller.signal });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

// Periodic up/down alerts
async function runCheck() {
  if (!selectedChannelId) return;
  const channel = await client.channels.fetch(selectedChannelId);
  if (!channel) return;

  const isUp = await checkServer();
  if (isUp && wasDown) {
    channel.send('✅ **Shredsauce is back up.**');
  } else if (!isUp && !wasDown) {
    channel.send('❌ **Shredsauce might be down.**');
  }
  wasDown = isUp;
}

// Schedule periodic checks
setInterval(runCheck, CHECK_INTERVAL);

client.login(TOKEN);
