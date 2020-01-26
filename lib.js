const colors = require('./colors.json');
const {RichEmbed} = require('discord.js');

const BLANK_FIELD_ = '\u200b';

// Returns an embed for an error message.
const errorEmbed = (title, body, footer) => {
  const embed = new RichEmbed().setColor('#ff0000'); // Red
  if (title) {
    embed.setTitle(title);
  }
  if (body) {
    embed.setDescription(body);
  }
  if (footer) {
    embed.setFooter(footer);
  }
  return embed;
};

class ActivityMonitor {
  /** Log last post time. Not enough users to care about throttling. */
  static registerUserActivity(db, msg) {
    if (
      !db
        .get('campers')
        .some({id: msg.author.id})
        .value()
    ) {
      db.get('campers')
        .push({id: msg.author.id})
        .write();
    }
    db.get('campers')
      .find({id: msg.author.id})
      .assign({last_post_timestamp: msg.createdTimestamp})
      .write();
  }
}

class ConfigManager {
  static execute(db, msg, tokens) {
    let embed = new RichEmbed();

    switch (tokens[1]) {
      // *** GENERIC GET/SET ***
      // Fairly dangerous! O -O
      case 'adminget': {
        if (!tokens[2]) {
          return;
        }
        if (tokens[2] === 'all') {
          embed.setTitle('Fetching the world...');
          embed.setDescription(
            '```' + JSON.stringify(db.value(), null, 2) + '```'
          );
        } else {
          embed.setTitle(`Fetching ${tokens[2]}...`);
          embed.setDescription(
            '```' + JSON.stringify(db.get(tokens[2]).value(), null, 2) + '```'
          );
        }
        break;
      }
      case 'adminset': {
        if (!tokens[2] || !tokens[3]) {
          return;
        }
        const prev = db.get(tokens[2]).value();
        db.set(tokens[2], tokens[3]).write();
        embed.setTitle(`Setting ${tokens[2]} to ${tokens[3]}...`);
        embed.setDescription(
          `Previously \`${token[2]}\` was set to:\n ` + '```' + prev + '```'
        );
        break;
      }
      // *** SETTING CHANNELS
      case 'botchannel': {
        const channel = db.get('options.bot_channel_id').value();
        embed.setDescription(`The current bot channel is <#${channel}>.`);
        embed.setFooter(`channel_id: ${channel}`);
        break;
      }
      case 'setbotchannel': {
        const channel = tokens[2].match(/<#(\d+)>/)[1];
        if (channel) {
          db.set('options.bot_channel_id', channel).write();
          embed.setDescription(`Setting bot channel to ${tokens[2]}.`);
          embed.setFooter(`channel_id: ${channel}`);
        } else {
          embed = errorEmbed(
            'Channel not found',
            "Given channel not found, are you sure you're mentioning it?",
            null
          );
        }
        break;
      }
      default:
        return;
    }

    msg.channel.send(embed);
  }
}

/**
 * React to emojis in sequence with optional callback.
 */
const chainReaction_ = async (msg, emojis, error_callback = () => {}) => {
  return emojis
    .reduce(async (prev, emoji) => {
      await prev;
      return msg.react(emoji);
    }, Promise.resolve())
    .then(() => msg)
    .catch(error_callback);
};

const reactToMention = (db, bot, msg) => {
  const config = db.get('options.react_to_user_mentions').value();
  const targets = Object.keys(config)
    .map((id) => msg.guild.member(bot.users.get(id)))
    .filter(Boolean)
    .filter((user) => msg.isMemberMentioned(user));
  if (!targets.length) return;

  // Just pick one or else they could conflict/be spammy.
  const sequence = config[targets[0].user.id];

  chainReaction_(msg, sequence, () => {
    console.error('[ERROR] Failed to react properly with emojis, clearing.');
    msg.clearReactions();
  });
};

const yesOrNo = (db, msg) => {
  const answers = db.get('options.yes_no_answers').value();
  const reaction = answers[Math.floor(Math.random() * answers.length)];
  chainReaction_(msg, reaction);
};

const voteButtons = (bot, msg) => {
  chainReaction_(msg, ['👍', '👎']);
};

const setColorRole_ = async (author, channel, color) => {
  const guildMember = channel.guild.member(author);
  const role = guildMember.roles.find((role) => {
    return role.name === author.tag;
  });
  if (role != undefined) {
    return role.setColor(color.value);
  }
  const roleData = {
    name: author.tag,
    color: color.value,
  };
  return channel.guild.createRole(roleData, 'Color gacha').then((role) => {
    guildMember.addRole(role, 'Color gacha');
  });
};

const rollColors_ = async (author, channel, db) => {
  const camper = db
    .get('campers')
    .find({id: author.id})
    .value();
  let remaining = camper.gacha_tokens || 10; // :thinking:
  if (!remaining) {
    const embed = new RichEmbed()
      .setTitle('Sorry, no refunds.')
      .setThumbnail('https://imgur.com/r6TbfOg.png');
    channel.send(embed);
    return;
  }
  remaining -= 1;
  camper.gacha_tokens = remaining;
  db.write();

  const color = colors.colors[Math.floor(Math.random() * colors.colors.length)];
  const embed = new RichEmbed();
  embed.setThumbnail('https://imgur.com/r6TbfOg.png');
  embed.setDescription(
    'Generating a random color for ' + author.username + '...'
  );
  embed.addField(
    'Got ' + color.name.toLowerCase() + '!',
    '👍 to apply or 🎲 to reroll'
  );
  embed.setColor(color.value);
  embed.setFooter('5 minute timeout. Rerolls left: ' + remaining);
  const filter = (reaction, user) => {
    return ['👍', '🎲'].includes(reaction.emoji.name) && user.id === author.id;
  };

  const message = await channel.send(embed);
  message
    .awaitReactions(filter, {max: 1, time: 300000})
    .then((collected) => {
      const reaction = collected.first();
      let ret = Promise.resolve();
      if (reaction) {
        if (reaction.emoji.name === '👍') {
          ret = setColorRole_(author, channel, color);
        } else {
          ret = rollColors_(author, channel, db);
        }
      }
      message.clearReactions();
      return ret;
    })
    .catch((err) => console.error(err));
  return chainReaction_(message, remaining ? ['👍', '🎲'] : ['👍']);
};

const colorGacha = (db, msg) => {
  if (
    msg.channel.guild.member(msg.author).roles.some((role) => {
      return role.name === 'p2w';
    })
  ) {
    db
      .get('campers')
      .find({id: msg.author.id})
      .value().gacha_tokens = 10;
    db.write();
  }

  rollColors_(msg.author, msg.channel, db);
};

module.exports = {
  ActivityMonitor: ActivityMonitor,
  ConfigManager: ConfigManager,
  colorGacha: colorGacha,
  reactToMention: reactToMention,
  voteButtons: voteButtons,
  yesOrNo: yesOrNo,
};
