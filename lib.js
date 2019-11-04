const reactToMention = (bot, msg, config) => {
  const targets = Object.keys(config)
    .map(id => msg.guild.member(bot.users.get(id)))
    .filter(Boolean)
    .filter((user) => msg.isMemberMentioned(user));

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

module.exports = {
  reactToMention: reactToMention,
};
