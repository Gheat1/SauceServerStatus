const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const fetch = require('node-fetch');

const TOKEN = process.env.TOKEN;
const CHECK_URL = 'https://shredsauce.com/test.php';
const CHECK_INTERVAL = 10 * 60 * 1000; // 10 mins
let broadcastChannel = null;
let wasDown = false;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('shredsauce servers', { type: 3 });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'setup') {
      const channel = interaction.channel;

      if (channel.type !== ChannelType.GuildText) {
        await interaction.reply({ content: '❌ You must run this in a text channel.', ephemeral: true });
        return;
      }

      broadcastChannel = channel;
      await interaction.reply(`✅ Setup complete. This channel (${channel}) will now receive alerts.`);
    }

    if (interaction.commandName === 'status') {
      try {
        await interaction.deferReply(); // prevent timeout crash

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(CHECK_URL, { signal: controller.signal });
        clearTimeout(timeout);

        const msg = res.ok ? '✅ Sauce server is **up**.' : '❌ Sauce server is **down**.';
        await interaction.editReply(msg);
      } catch {
        await interaction.editReply('❌ Sauce server is **down**.');
      }
    }
  });
});

setInterval(async () => {
  if (!broadcastChannel) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(CHECK_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok && wasDown) {
      broadcastChannel.send('✅ **Shredsauce is back up.**');
      wasDown = false;
    } else if (!res.ok && !wasDown) {
      broadcastChannel.send('❌ **Shredsauce might be down.**');
      wasDown = true;
    }
  } catch {
    if (!wasDown) {
      broadcastChannel.send('⚠️ **Could not reach Shredsauce.**');
      wasDown = true;
    }
  }
}, CHECK_INTERVAL);

client.login(TOKEN);
