const colors = require('./colors.json');
const {RichEmbed} = require('discord.js');

const BLANK_FIELD_ = '\u200b';

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

const registerUserActivity = (db, msg) => {
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
};

module.exports = {
  colorGacha: colorGacha,
  reactToMention: reactToMention,
  registerUserActivity: registerUserActivity,
  voteButtons: voteButtons,
  yesOrNo: yesOrNo,
};
