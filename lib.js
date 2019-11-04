/**
 * React to emojis in sequence with optional callback.
 */
const chainReaction_ = (msg, emojis, error_callback = () => {}) => {
  emojis
    .reduce(async (prev, emoji) => {
      await prev;
      return msg.react(emoji);
    }, Promise.resolve())
    .catch(error_callback);
};

const reactToMention = (bot, msg, config) => {
  const targets = Object.keys(config)
    .map(id => msg.guild.member(bot.users.get(id)))
    .filter(Boolean)
    .filter(user => msg.isMemberMentioned(user));

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

module.exports = {
  reactToMention: reactToMention,
  voteButtons: voteButtons,
  yesOrNo: yesOrNo,
};
