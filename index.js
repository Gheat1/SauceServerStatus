// index.js
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  InteractionType
} = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

const TOKEN            = process.env.TOKEN;
const CHECK_URL        = 'https://shredsauce.com/test.php';
const CHECK_INTERVAL   = 10 * 60 * 1000; // 10 minutes

// Your two fixed alert channels:
const ALERT_CHANNEL_IDS = [
  '1362505260945379398',
  '1360242307185774802'
];

let wasDown = false;
const client = new Client({
  intents: [ GatewayIntentBits.Guilds ],
  partials: [ Partials.Channel ]
});

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('shredsauce servers', { type: ActivityType.Watching });

  // Determine current state
  const up = await checkServer();
  wasDown = !up;

  // Send initial status into each channel
  const initMsg = up
    ? '✅ **Shredsauce is currently up.**'
    : '❌ **Shredsauce is currently down.**';

  for (const id of ALERT_CHANNEL_IDS) {
    try {
      const ch = await client.channels.fetch(id);
      if (ch?.isText()) await ch.send(initMsg);
    } catch (err) {
      console.error(`❌ Could not send initial status to ${id}:`, err);
    }
  }

  // Schedule future checks
  setInterval(runCheck, CHECK_INTERVAL);
});

// Slash /status
client.on('interactionCreate', async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;
  if (interaction.commandName !== 'status') return;

  await interaction.deferReply({ ephemeral: true });
  const up = await checkServer();
  await interaction.editReply(
    up
      ? '✅ Sauce server is **up**.'
      : '❌ Sauce server is **down**.'
  );
});

// Helper to check server (any response within 8s = up)
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

// Run every interval, send message only on flip
async function runCheck() {
  const up = await checkServer();
  if (up === !wasDown) {
    // no change
    return;
  }
  wasDown = !up;

  const flipMsg = up
    ? '✅ **Shredsauce is back up.**'
    : '❌ **Shredsauce might be down.**';

  for (const id of ALERT_CHANNEL_IDS) {
    try {
      const ch = await client.channels.fetch(id);
      if (ch?.isText()) await ch.send(flipMsg);
    } catch (err) {
      console.error(`❌ Could not send alert to ${id}:`, err);
    }
  }
}

client.login(TOKEN);
