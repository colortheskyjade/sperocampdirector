const FileSync = require('lowdb/adapters/FileSync');
const lib = require('./lib.js');
const lodashId = require('lodash-id');
const low = require('lowdb');
const auth = require('./data/auth.json');
const {Client, RichEmbed} = require('discord.js');

const {ActivityMonitor, ConfigManager} = lib;

const adapter = new FileSync('./data/db.json');
const bot = new Client();
const db = low(adapter);
const prefix = '!!';

db._.mixin(lodashId);

// :^)
const ADMIN_ID_ = '49395063955914752';

// Returns true if should return early / not admin.
const notAdmin = (msg) => {
  if (msg.author.id !== ADMIN_ID_) {
    const embed = new RichEmbed()
      .setTitle('Hey...')
      .setDescription(`You're not the boss of me! :C`);
    msg.channel.send(embed);
    return true;
  }
  return false;
}

bot.on('ready', () => {
  console.log(`[INFO] Logged in as ${bot.user.tag}.`);
  bot.user.setActivity(' with your heart :3c');
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
  ActivityMonitor.registerUserActivity(db, msg);

  if (
    msg.channel.id !== db.get('options.bot_channel_id').value() &&
    msg.channel.id !== db.get('options.admin_channel_id').value()
  ) {
    return;
  }
  if (!msg.content.startsWith(prefix)) return;

  const tokens = msg.content
    .slice(prefix.length)
    .trim()
    .split(/\s+/);

  switch (tokens[0]) {
    case 'config':
      if(notAdmin(msg)) return;
      ConfigManager.execute(db, msg, tokens);
      break;
    case 'active':
      if(notAdmin(msg)) return;
      ActivityMonitor.execute(db, msg, tokens);
      break;
    default:
      const embed = new RichEmbed()
        .setTitle('Error: Unrecognized Command')
        .setDescription('```' + msg.content + '```')
        .setColor('#ff0000'); // Red
      msg.channel.send(embed);
      return;
  }
});

bot.login(auth.token);
