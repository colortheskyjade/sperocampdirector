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

const ADMIN_ID_ = '49395063955914752';

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

const debugMessage_ = (db, msg) => {
  if (msg.author.id === ADMIN_ID_ && msg.content.startsWith('!DEBUG')) {
    const embed = new RichEmbed().setTitle('D E B U G');

    if (msg.content.startsWith('!DEBUG gimme campers')) {
      embed.setDescription(
        '```' + JSON.stringify(db.get('campers').value(), null, 2) + '```'
      );
    }

    msg.channel.send(embed);
  }
};

const clearGacha = (db, msg) => {
  db.get('campers')
    .filter({used_gacha_token: true})
    .value()
    .forEach((entry) => {
      delete entry.used_gacha_token;
    });
  db.write();
  msg.channel.send(new RichEmbed().setTitle('Clearing gacha tokens... done!'));
};

const resetGachaTokens = (db, msg) => {
  db.get('campers')
    .value()
    .forEach((entry) => {
      entry.gacha_tokens = 10;
    });
  db.write();
  msg.channel.send(new RichEmbed().setTitle('Updating gacha tokens... done!'));
};

bot.on('message', (msg) => {
  if (msg.author.bot) return;
  debugMessage_(db, msg);
  registerUserActivity(db, msg);

  // Do this better later.
  if (msg.content.startsWith('Q: ')) {
    yesOrNo(db, msg);
  } else if (msg.content.startsWith('Vote: ')) {
    voteButtons(bot, msg);
  } else if (msg.content.startsWith('!gacha')) {
    const bot_channel =  db.get('options.bot_channel_id').value();
    if (msg.channel.id !== bot_channel) {
      msg.channel.send(`Use <#${bot_channel}> for \`!gacha\`.`);
      return;
    }
    if (
      msg.content.startsWith('!gacha clearall') &&
      msg.author.id === ADMIN_ID_
    ) {
      clearGacha(db, msg);
    } else if (
      msg.content.startsWith('!gacha resettokens') &&
      msg.author.id === ADMIN_ID_
    ) {
      resetGachaTokens(db, msg);
    } else {
      colorGacha(db, msg);
    }
  } else {
    reactToMention(db, bot, msg);
  }
});

bot.login(auth.token);
