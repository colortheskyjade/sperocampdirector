const auth = require('./auth.json');
// LOL :C
// const lib = require('./lib.js');
const { Client, RichEmbed } = require('discord.js');

const bot = new Client();

// sorry dude
const react_to_me = '173523956173766656';
const booty_emote = '445820252245196810';
// const react_to_me = '49395063955914752';

bot.on('ready', () => {
  console.log(`[INFO] Logged in as ${bot.user.tag}.`);
});

bot.on('disconected', () => {
  console.log(
    '[INFO] Disconnected from API service, attempted to reconnect...'
  );
});

bot.on('warn', msg => {
  console.log('[WARN] ' + msg);
});

bot.on('error', function(err) {
  console.log('[ERROR] ' + err.message);
  process.exit(1);
});

bot.on('message', msg => {
  // NOTE: consider checking msg.author.id === bot.user.id for scope
  if (msg.author.bot) return;

  // TODO: refactor, this will be changed in v12
  const target = msg.guild.member(bot.users.get(react_to_me));
  if (target && msg.isMemberMentioned(target)) {
    msg
      .react('640745183238946867')
      .then(() => msg.react('🍽'))
      .catch(() =>
        // TODO: possibly clear reactions
        console.log('[ERROR] Failed to react properly with emojis.')
      );
  }
});

bot.login(auth.token);
