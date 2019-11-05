const lib = require('./lib.js');
const auth = require('./auth.json');
const config = require('./config.json');
const {Client, RichEmbed} = require('discord.js');

const bot = new Client();
const {colorGacha, reactToMention, voteButtons, yesOrNo} = lib;

let noRefunds;

bot.on('ready', () => {
  console.log(`[INFO] Logged in as ${bot.user.tag}.`);
  bot.user.setActivity('gacha x camping');
  noRefunds = new Set();
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

bot.on('message', (msg) => {
  if (msg.author.bot) return;

  reactToMention(bot, msg, config.react_to_user_mentions);

  if (
    msg.author.id === '49395063955914752' &&
    msg.content.startsWith('!DEBUG')
  ) {
    msg.channel.send(new RichEmbed().setTitle('D E B U G'));
  }

  // Do this better later.
  if (msg.content.startsWith('Q: ')) {
    yesOrNo(bot, msg);
  } else if (msg.content.startsWith('Vote: ')) {
    voteButtons(bot, msg);
  } else if (
    msg.channel.id === config.bot_channel_id &&
    msg.content.startsWith('!gacha')
  ) {
    const guildMember = msg.channel.guild.member(msg.author);
    const p2w = guildMember.roles.some((role) => {
      return role.name === 'p2w';
    });
    if (!p2w && noRefunds.has(msg.author.id)) {
      msg.channel.send(
        new RichEmbed()
          .setTitle('Sorry, no refunds.')
          .setThumbnail('https://imgur.com/r6TbfOg.png')
      );
      return;
    }
    noRefunds.add(msg.author.id);
    colorGacha(bot, msg);
  }
});

bot.login(auth.token);
