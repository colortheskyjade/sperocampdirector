const FileSync = require('lowdb/adapters/FileSync');
const lib = require('./lib.js');
const lodashId = require('lodash-id');
const low = require('lowdb');
const auth = require('./data/auth.json');
const {Client, RichEmbed} = require('discord.js');

const {
  colorGacha,
  reactToMention,
  registerUserActivity,
  voteButtons,
  yesOrNo,
} = lib;

const bot = new Client();
const adapter = new FileSync('./data/db.json');
const db = low(adapter);

db._.mixin(lodashId);

bot.on('ready', () => {
  console.log(`[INFO] Logged in as ${bot.user.tag}.`);
  bot.user.setActivity('gacha x camping');
});

bot.on('disconected', () => {
  console.log(
    '[INFO] Disconnected from API service, attempted to reconnect...'
  );
});

bot.on('warn', (msg) => {
  console.log('[WARN] ' + msg);
});

bot.on('error', function(err) {
  console.log('[ERROR] ' + err.message);
  process.exit(1);
});

const debugMessage_ = (msg) => {
  if (
    msg.author.id === '49395063955914752' &&
    msg.content.startsWith('!DEBUG')
  ) {
    msg.channel.send(new RichEmbed().setTitle('D E B U G'));
  }
};

bot.on('message', (msg) => {
  if (msg.author.bot) return;
  debugMessage_(msg);
  registerUserActivity(db, msg);
  reactToMention(db, bot, msg);

  // Do this better later.
  if (msg.content.startsWith('Q: ')) {
    yesOrNo(db, msg);
  } else if (msg.content.startsWith('Vote: ')) {
    voteButtons(bot, msg);
  } else if (
    msg.channel.id === db.get('options.bot_channel_id').value() &&
    msg.content.startsWith('!gacha')
  ) {
    colorGacha(db, msg);
  }
});

bot.login(auth.token);
