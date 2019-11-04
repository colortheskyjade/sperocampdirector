const lib = require('./lib.js');
const auth = require('./auth.json');
const config = require('./config.json');
const { Client, RichEmbed } = require('discord.js');

const bot = new Client();
const {reactToMention} = lib;

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
  reactToMention(bot, msg, config.react_to_user_mentions);
});

bot.login(auth.token);
