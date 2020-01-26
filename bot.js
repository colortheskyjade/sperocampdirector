const FileSync = require('lowdb/adapters/FileSync');
const lib = require('./lib.js');
const lodashId = require('lodash-id');
const low = require('lowdb');
const auth = require('./data/auth.json');
const {Client, RichEmbed} = require('discord.js');

const {
  ActivityMonitor,
  ConfigManager,
  colorGacha,
  reactToMention,
  voteButtons,
  yesOrNo,
} = lib;

const adapter = new FileSync('./data/db.json');
const bot = new Client();
const db = low(adapter);
const prefix = '!!';

db._.mixin(lodashId);

// :^)
const ADMIN_ID_ = '49395063955914752';

bot.on('ready', () => {
  console.log(`[INFO] Logged in as ${bot.user.tag}.`);
  bot.user.setActivity(' gacha x camping');
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
  if (msg.author.id !== ADMIN_ID_) return;

  if (msg.author.id === ADMIN_ID_ && msg.content.startsWith('!DEBUG')) {
    const embed = new RichEmbed().setTitle('D E B U G');

    let prefix = '!DEBUG repeat ';
    if (msg.content.startsWith('!DEBUG gimme campers')) {
      embed.setDescription(
        '```' + JSON.stringify(db.get('campers').value(), null, 2) + '```'
      );
    } else if (msg.content.startsWith(prefix)) {
      embed.setDescription(
        '```' + msg.content.slice(prefix.length).match(/<#(\d+)>/)[1] + '```'
      );
    }

    msg.channel.send(embed);
  }
};

bot.on('message', (msg) => {
  if (msg.author.bot) return;
  ActivityMonitor.registerUserActivity(db, msg);
  if (!msg.content.startsWith(prefix)) return;

  const tokens = msg.content
    .slice(prefix.length)
    .trim()
    .split(/\s+/);

  switch (tokens[0]) {
    case 'config':
      if (msg.author.id !== ADMIN_ID_) {
        const embed = new RichEmbed().setTitle('Hey...').setDescription(
          `You're not the boss of me! :C`
        );
        msg.channel.send(embed);
        return;
      }
      ConfigManager.execute(db, msg, tokens);
      break;
    default:
      const embed = new RichEmbed()
        .setTitle('Error: Unrecognized Command')
        .setDescription('```' + msg.content + '```')
        .setColor('#ff0000'); // Red
      msg.channel.send(embed);
      return;
  }

  //   debugMessage_(db, msg);

  //   // Do this better later.
  //   if (msg.content.startsWith('Q: ')) {
  //     yesOrNo(db, msg);
  //   } else if (msg.content.startsWith('Vote: ')) {
  //     voteButtons(bot, msg);
  //   } else if (msg.content.startsWith('!gacha')) {
  //     const bot_channel =  db.get('options.bot_channel_id').value();
  //     if (msg.channel.id !== bot_channel) {
  //       msg.channel.send(`Use <#${bot_channel}> for \`!gacha\`.`);
  //       return;
  //     }
  //     if (
  //       msg.content.startsWith('!gacha resettokens') &&
  //       msg.author.id === ADMIN_ID_
  //     ) {
  //       resetGachaTokens(db, msg);
  //     } else {
  //       colorGacha(db, msg);
  //     }
  //   } else {
  //     reactToMention(db, bot, msg);
  //   }
});

bot.login(auth.token);
