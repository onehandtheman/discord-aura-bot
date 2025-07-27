const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = 'MTM4NzI4NjQyMzMzMzUwNzA5Mg.GVud92.cHwz1OrkerV8fh5nGE4O9XNhATaIntdOh25wC8'; // Replace with your bot token
const TARGET_USER_ID = '1136069725546352681'; // The user to kick with ?kars or kickkars
const ALLOWED_ROLE_NAMES = ['Game Owner']; // Roles allowed to use ?kars and aura shop kickkars
const AURA_CHAT_CHANNEL_ID = '1398864133520097340';
const AURA_CHANNEL_ID = '1398864133520097340'; // Channel where aura commands and aura gain works

const activeKicks = new Set();

const auraLevels = [
  { roleName: 'GOD aura', threshold: 2500 },
  { roleName: 'Raditent Aura', threshold: 750 },
  { roleName: 'Average Aura', threshold: 250 },
  { roleName: 'stink aura', threshold: 100 }
];

// Path to save aura data
const auraDataPath = path.resolve(__dirname, 'auraData.json');

// Load aura data from file, or create empty object
let auraScores = new Map();

function loadAuraData() {
  try {
    if (fs.existsSync(auraDataPath)) {
      const raw = fs.readFileSync(auraDataPath, 'utf8');
      const parsed = JSON.parse(raw);
      // Convert back to Map
      auraScores = new Map(Object.entries(parsed));
      // Convert values from string to number (JSON stores numbers as numbers but Map keys are strings)
      for (const [key, value] of auraScores) {
        auraScores.set(key, Number(value));
      }
      console.log('✅ Loaded aura data.');
    } else {
      auraScores = new Map();
    }
  } catch (err) {
    console.error('❌ Failed to load aura data:', err);
  }
}

function saveAuraData() {
  try {
    // Convert Map to plain object
    const obj = Object.fromEntries(auraScores);
    fs.writeFileSync(auraDataPath, JSON.stringify(obj, null, 2), 'utf8');
    // console.log('💾 Saved aura data.');
  } catch (err) {
    console.error('❌ Failed to save aura data:', err);
  }
}

function getAura(userId) {
  return auraScores.get(userId) || 0;
}

function updateAura(userId, change) {
  const current = getAura(userId);
  const newAura = current + change;
  auraScores.set(userId, newAura);
  saveAuraData(); // Save on every update
  return newAura;
}

async function updateAuraRoles(member, aura) {
  if (!member) return;
  for (const level of auraLevels) {
    const role = member.guild.roles.cache.find(r => r.name === level.roleName);
    if (!role) continue;

    if (level.roleName === 'stink aura') {
      if (aura <= level.threshold && !member.roles.cache.has(role.id)) {
        await member.roles.add(role).catch(() => {});
      } else if (aura > level.threshold && member.roles.cache.has(role.id)) {
        await member.roles.remove(role).catch(() => {});
      }
    } else {
      if (aura >= level.threshold && !member.roles.cache.has(role.id)) {
        await member.roles.add(role).catch(() => {});
      } else if (aura < level.threshold && member.roles.cache.has(role.id)) {
        await member.roles.remove(role).catch(() => {});
      }
    }
  }
}

// Aura shop items (as you gave)
const auraShop = {
  tole: {
    cost: 150,
    message: 'TOLE TOLE TOLE TOLE TOLE'
  },
  wasteuraura: {
    cost: 1500,
    message: 'Noob i took your aura'
  },
  insult: {
    cost: 100,
    message: 'I HATE HAND'
  },
  thedog: {
    cost: 300,
    message: 'Gentleman is my favorite dog!'
  },
  kickkars: {
    cost: 1500,
    message: 'I kicked kars hahaha'
  },
  auraflex: {
    cost: 100,
    execute: async (message, userId, userAura) => {
      await message.channel.send(`🌟 ${message.author} flexes with **${userAura} aura**. Power radiates from their presence.`);
    }
  },
  auraheist: {
    cost: 250,
    requiresMention: true,
    execute: async (message, userId, userAura, mentionedUser) => {
      const mentionedId = mentionedUser.id;
      if (mentionedId === userId) return message.channel.send('❌ You can’t steal from yourself.');

      const victimAura = getAura(mentionedId);
      if (victimAura <= 0) return message.channel.send('❌ Target has no aura to steal.');

      const success = Math.random() < 0.5;

      if (success) {
        const stolenAmount = Math.floor(victimAura * 0.4);
        updateAura(userId, stolenAmount);
        updateAura(mentionedId, -stolenAmount);
        await message.channel.send(`💰 ${message.author} successfully stole **${stolenAmount} aura** from ${mentionedUser}!`);
      } else {
        updateAura(userId, -150);
        await message.channel.send(`💀 ${message.author} failed the heist and **lost 150 aura**.`);
      }
    }
  },
  mysterybox: {
    cost: 300,
    execute: async (message, userId) => {
      const rng = Math.random();
      const amount = Math.floor(Math.random() * 500) + 1;
      const gained = rng < 0.5;

      if (gained) {
        updateAura(userId, amount);
        await message.channel.send(`🎁 You opened a mystery box and **gained ${amount} aura**!`);
      } else {
        updateAura(userId, -amount);
        await message.channel.send(`💣 Mystery box backfired... you **lost ${amount} aura**!`);
      }
    }
  },
  callout: {
    cost: 100,
    requiresMention: true,
    execute: async (message, userId, _, mentionedUser) => {
      const phrases = [
        'got absolutely called out for weak aura.',
        'just got caught with 0 aura and vibes.',
        'is being roasted for their aura stench.',
        'was flexing but had no aura in the bank.'
      ];
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      await message.channel.send(`📣 ${mentionedUser} ${phrase}`);
    }
  }
};

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  loadAuraData();
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // Aura gain ONLY in aura channel
  if (message.channel.id === AURA_CHANNEL_ID) {
    const userId = message.author.id;
    const newAura = updateAura(userId, 1);
    await updateAuraRoles(message.member, newAura);
  }

  const member = message.member;
  const args = message.content.trim().split(/\s+/);
  const cmd = args[0].toLowerCase();

  const hasAllowedRole = member.roles.cache.some(role =>
    ALLOWED_ROLE_NAMES.includes(role.name)
  );

  // ?kars command
  if (cmd === '?kars') {
    if (!hasAllowedRole) return message.reply('❌ You don’t have permission to use this command.');
    if (activeKicks.has(message.guild.id)) return message.reply('⏳ Please wait before kicking again.');

    activeKicks.add(message.guild.id);
    try {
      const target = await message.guild.members.fetch(TARGET_USER_ID).catch(() => null);
      if (!target) return message.reply('❌ User not found.');
      if (!target.kickable) return message.reply('❌ I can’t kick this user (role hierarchy issue).');

      await target.kick('Kicked by custom ?kars command');
      await message.channel.send(`<@${TARGET_USER_ID}> has been kicked.`);
    } catch (err) {
      console.error(err);
      await message.channel.send('❌ Failed to kick the user.');
    } finally {
      activeKicks.delete(message.guild.id);
    }
    return;
  }

  // ?auragain and ?auraloss commands
  if ((cmd === '?auragain' || cmd === '?auraloss') && args.length >= 3) {
    if (!hasAllowedRole) return message.reply('❌ You don’t have permission to use this command.');

    const amount = parseInt(args[1]);
    const target = message.mentions.members.first();
    if (isNaN(amount) || !target) {
      return message.reply('❌ Usage: `?auragain <amount> @user` or `?auraloss <amount> @user`');
    }

    const userId = target.id;
    const currentAura = getAura(userId);
    const newAura = cmd === '?auragain' ? currentAura + amount : currentAura - amount;

    auraScores.set(userId, newAura);
    saveAuraData();
    await updateAuraRoles(target, newAura);
    return message.channel.send(`${target} now has **${newAura} aura**.`);
  }

  // ?aura command (show your aura)
  if (cmd === '?aura') {
    if (message.channel.id !== AURA_CHANNEL_ID) {
      return message.reply('❌ You can only use this command in the aura channel.');
    }
    const userId = message.author.id;
    const aura = getAura(userId);
    return message.channel.send(`${message.author}, you currently have **${aura} aura**.`);
  }

  // ?aurashop command

   if (cmd === '?gamble' && args[1]) {
    const amount = parseInt(args[1]);
    if (!amount || amount <= 0) return message.reply('❌ Invalid amount.');
    const current = getAura(message.author.id);
    if (amount > current) return message.reply(`❌ You only have ${current} aura.`);
    const win = Math.random() < 0.25;
    const delta = win ? amount : -amount;
    const newAura = updateAura(message.author.id, delta);
    return message.channel.send(
      win
        ? `🎰 You won **${amount} aura**! You now have **${newAura} aura**.`
        : `💣 You lost **${amount} aura**. You now have **${newAura} aura**.`
    );
  }

  // Existing commands (?aura, ?aurashop, etc.)

  if (cmd === '?aurahelp') {
    return message.channel.send(`📘 **Aura Bot Command List**
• \`?aura\` – Show your aura (shop channel only)
• \`?gamble <amount>\` – Gamble aura for chance to win
• \`?aurashop\` – View shop items
• \`?aurashop <item> [@user]\` – Use an item
• \`?aurahelp\` – Show this help menu`);
  }


  if (cmd === '?aurashop') {
    if (message.channel.id !== AURA_CHANNEL_ID) {
      return message.reply('❌ You can only use the aura shop in the designated aura channel.');
    }

    const userId = message.author.id;
    const currentAura = getAura(userId);

    if (args.length === 1) {
      const list = Object.entries(auraShop)
        .map(([item, data]) => `• \`${item}\` - ${data.cost} aura`)
        .join('\n');
      return message.channel.send(`🛒 **Aura Shop**\n${list}\n\nUse \`?aurashop <item>\` to buy.`);
    }

    const itemName = args[1].toLowerCase();
    const item = auraShop[itemName];
    if (!item) {
      return message.reply(`❌ That item doesn't exist. Use \`?aurashop\` to see available items.`);
    }

    if (currentAura < item.cost) {
      return message.reply(`❌ You need ${item.cost} aura to buy \`${itemName}\`. You only have ${currentAura}.`);
    }

    const mentionedUser = message.mentions.members?.first() || null;
    if (item.requiresMention && !mentionedUser) {
      return message.reply('❌ You must mention a user to use this item.');
    }

    // Deduct aura cost and save
    const newAura = currentAura - item.cost;
    auraScores.set(userId, newAura);
    saveAuraData();

    // If item has custom execute function
    if (typeof item.execute === 'function') {
      await item.execute(message, userId, currentAura, mentionedUser);
      return message.channel.send(`🪙 ${item.cost} aura spent. You now have **${newAura} aura**.`);
    }

    // Default: just send the item's message
    return message.channel.send(`${item.message}\n🪙 ${item.cost} aura spent. You now have **${newAura} aura**.`);
  }
});

client.on('ready', () => {
  console.log(`✅ ${client.user.tag} is online!`);
  const channel = client.channels.cache.get(AURA_CHAT_CHANNEL_ID);
  if (channel) channel.send('🌟 Aura Bot is now online!');
});

const shutdown = () => {
  const channel = client.channels.cache.get(AURA_CHAT_CHANNEL_ID);
  if (channel) channel.send('⚠️ Aura Bot is going offline...');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);


client.login(TOKEN);
