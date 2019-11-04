const lib = require('./lib.js');
const auth = require('./auth.json');
const config = require('./config.json');
const { Client, RichEmbed } = require('discord.js');

const bot = new Client();
const {reactToMention, voteButtons, yesOrNo} = lib;

bot.on('ready', () => {
  console.log(`[INFO] Logged in as ${bot.user.tag}.`);
  bot.user.setActivity('c a m p i n g');
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
  if (msg.author.bot) return;

  reactToMention(bot, msg, config.react_to_user_mentions);

  if (msg.author.id === '49395063955914752' && msg.content.startsWith('!DEBUG')) {
    msg.channel.send(new RichEmbed().setTitle('D E B U G'));
  }

  // Do this better later.
  if (msg.content.startsWith('Q: ')) {
    yesOrNo(bot, msg);
  } else if (msg.content.startsWith('Vote: ')) {
    voteButtons(bot, msg);
  }
});

bot.login(auth.token);
