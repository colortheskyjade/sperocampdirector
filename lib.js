const colors = require('./colors.json');
const {RichEmbed} = require('discord.js');

const BLANK_FIELD_ = '\u200b';

// Returns an embed for an error message.
const errorEmbed = (embed, title, body, footer) => {
  embed.setColor('#ff0000'); // Red
  if (title) {
    embed.setTitle(title);
  }
  if (body) {
    embed.setDescription(body);
  }
  if (footer) {
    embed.setFooter(footer);
  }
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
        ConfigManager._getChannel(
          embed,
          db,
          'options.bot_channel_id',
          'bot channel'
        );
        break;
      }
      case 'setbotchannel': {
        if (tokens.length < 3) {
          errorEmbed(
            embed,
            'No channel provided',
            null,
            'Give me a channel :3c'
          );
          break;
        }
        ConfigManager._setChannel(
          embed,
          db,
          'options.bot_channel_id',
          'bot channel',
          tokens[2]
        );
        break;
      }
      case 'adminchannel': {
        ConfigManager._getChannel(
          embed,
          db,
          'options.admin_channel_id',
          'admin channel'
        );
        break;
      }
      case 'setadminchannel': {
        if (tokens.length < 3) {
          errorEmbed(
            embed,
            'No channel provided',
            null,
            'Give me a channel :3c'
          );
          break;
        }
        ConfigManager._setChannel(
          embed,
          db,
          'options.admin_channel_id',
          'admin channel',
          tokens[2]
        );
        break;
      }
      default:
        return;
    }

    msg.channel.send(embed);
  }

  static _getChannel(embed, db, key, name) {
    const channel_id = db.get(key).value();
    embed.setDescription(`The current ${name} is <#${channel_id}>.`);
    embed.setFooter(`channel_id: ${channel_id}`);
  }

  static _setChannel(embed, db, key, name, channel_tag) {
    const channel_id = (channel_tag.match(/<#(\d+)>/) || [null, null])[1];
    // TODO: Add real validation.
    if (channel_id) {
      db.set(key, channel_id).write();
      embed.setDescription(`Setting ${name} to ${channel_tag}.`);
      embed.setFooter(`channel_id: ${channel_id}`);
    } else {
      errorEmbed(
        embed,
        'Channel not found',
        "Are you sure you're mentioning it?",
        null
      );
    }
  }
}


module.exports = {
  ActivityMonitor: ActivityMonitor,
  ConfigManager: ConfigManager,
};
