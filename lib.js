const reactToMention = (bot, msg, config) => {
  const targets = Object.keys(config)
    .map(id => msg.guild.member(bot.users.get(id)))
    .filter(Boolean)
    .filter(user => msg.isMemberMentioned(user));

  if (!targets.length) return;

  const target = targets[0]; // This is a priority system.
  const sequence = config[target.user.id];

  sequence
    .reduce(async (prev, emoji) => {
      await prev;
      return msg.react(emoji);
    }, Promise.resolve())
    .catch(() => {
      console.log('[ERROR] Failed to react properly with emojis, clearing.');
      msg.clearReactions();
    });
};

const yesNoBoom = (bot, msg) => {
  const answers = [
    '👍',
    '👍',
    '👍',
    '👍',
    '👍',
    '👎',
    '👎',
    '👎',
    '👎',
    '👎',
    '585625968970825740',
  ];

  const reaction = answers[Math.floor(Math.random() * answers.length)];
  msg.react(reaction);
};

module.exports = {
  reactToMention: reactToMention,
  yesNoBoom: yesNoBoom,
};
