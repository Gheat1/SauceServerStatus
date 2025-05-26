// index.js
const { Client, GatewayIntentBits, ActivityType, InteractionType, Partials } = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();
const express = require('express'); // Import express

const app = express(); // Create an express application
const port = process.env.PORT || 3000; // Use the PORT environment variable or default to 3000

const TOKEN             = process.env.TOKEN;
const CHECK_URL         = 'https://shredsauce.com/test.php';
const CHECK_INTERVAL = 10 * 60 * 1000;  // 10 minutes

// your two alert channels
const ALERT_CHANNEL_IDS = [
  '1362505260945379398',
  '1360242307185774802',
  '1367713718267285515'
];

let wasDown = false;
const client = new Client({
  intents: [ GatewayIntentBits.Guilds ],
  partials: [ Partials.Channel ]
});

// --- Health Check Endpoint ---
app.get('/healthz', (req, res) => {
  res.status(200).send('OK'); // Respond with a 200 OK status
});

app.listen(port, () => {
  console.log(`Health check server listening on port ${port}`);
});
// --- End Health Check Endpoint ---

// checkServer: any HTTP response within 8s = UP
async function checkServer() {
  try {
    const controller = new AbortController();
    const timeout     = setTimeout(() => controller.abort(), 8000);
    await fetch(CHECK_URL, { signal: controller.signal });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

// runCheck: send flip-alerts to both channels
async function runCheck() {
  const up = await checkServer();
  // only fire if state changed
  if (up === !wasDown) return;
  wasDown = !up;

  const flipMsg = up
    ? '✅ **Shredsauce Website is back up.**'
    : '❌ **Shredsauce might be down.**';

  for (const id of ALERT_CHANNEL_IDS) {
    try {
      const ch = await client.channels.fetch(id);
      if (ch?.isTextBased()) await ch.send(flipMsg);
    } catch (e) {
      console.error(`Failed to alert ${id}:`, e);
    }
  }
}

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('shredsauce servers', { type: ActivityType.Watching });

  // initial status post
  const up = await checkServer();
  wasDown = !up;
  const initMsg = up
    ? '✅ **Shredsauce Website is up.**'
    : '❌ **Shredsauce is currently down.**';

  for (const id of ALERT_CHANNEL_IDS) {
    try {
      const ch = await client.channels.fetch(id);
      if (ch?.isTextBased()) await ch.send(initMsg);
    } catch (e) {
      console.error(`Failed to send initial status to ${id}:`, e);
    }
  }

  // schedule periodic checks
  setInterval(runCheck, CHECK_INTERVAL);
});

client.on('interactionCreate', async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;
  if (interaction.commandName !== 'status') return;

  await interaction.deferReply({ ephemeral: true });
  const up = await checkServer();
  await interaction.editReply(
    up
      ? '✅ Sauce website is **up**.'
      : '❌ Sauce is **down**.'
  );
});

client.login(TOKEN);
