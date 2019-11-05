const colors = require('./colors.json');
const {RichEmbed} = require('discord.js');

const BLANK_FIELD_ = '\u200b';

/**
 * React to emojis in sequence with optional callback.
 */
const chainReaction_ = async (msg, emojis, error_callback = () => {}) => {
  await emojis
    .reduce(async (prev, emoji) => {
      await prev;
      return msg.react(emoji);
    }, Promise.resolve())
    .catch(error_callback);
  return msg;
};

const reactToMention = (bot, msg, config) => {
  const targets = Object.keys(config)
    .map((id) => msg.guild.member(bot.users.get(id)))
    .filter(Boolean)
    .filter((user) => msg.isMemberMentioned(user));

  if (!targets.length) return;

  // Just pick one or else they could conflict/be spammy.
  const sequence = config[targets[0].user.id];

  chainReaction_(msg, sequence, () => {
    console.log('[ERROR] Failed to react properly with emojis, clearing.');
    msg.clearReactions();
  });
};

const yesOrNo = (bot, msg) => {
  const answers = [
    ['👍'],
    ['👍'],
    ['👌'],
    ['👌'],
    ['👎'],
    ['👎'],
    ['🤷'],
    ['🇾', '🇪', '🇸'],
    ['🇾', '🇪', '🇸'],
    ['🇾', '🇪', '🇸'],
    ['🇳', '🇴'],
    ['🇳', '🇴'],
    ['🇳', '🇴'],
  ];

  const reaction = answers[Math.floor(Math.random() * answers.length)];
  chainReaction_(msg, reaction);
};

const voteButtons = (bot, msg) => {
  chainReaction_(msg, ['👍', '👎']);
};

const setColorRole_ = async (author, channel, color) => {
  const guildMember = channel.guild.member(author);
  let role = guildMember.roles.find((role) => {
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

const rollColors_ = async (author, channel, remaining) => {
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
  embed.setFooter('No refunds allowed, rerolls left: ' + remaining);
  const filter = (reaction, user) => {
    return ['👍', '🎲'].includes(reaction.emoji.name) && user.id === author.id;
  };
  return channel
    .send(embed)
    .then((msg) => chainReaction_(msg, remaining ? ['👍', '🎲'] : ['👍']))
    .then((msg) =>
      msg
        .awaitReactions(filter, {max: 1, time: 6000, errors: ['time']})
        .then((collected) => {
          const reaction = collected.first();
          if (reaction.emoji.name === '👍') {
            console.log('SETTING COLOR ROLE');
            return setColorRole_(author, channel, color);
          } else if (remaining > 0) {
            return rollColors_(author, channel, remaining - 1);
          }
        })
    );
};

const colorGacha = (bot, msg) => {
  rollColors_(msg.author, msg.channel, 7).catch((err) => {
    console.error(err);
  });
};

module.exports = {
  colorGacha: colorGacha,
  reactToMention: reactToMention,
  voteButtons: voteButtons,
  yesOrNo: yesOrNo,
};
