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

  static execute(db, msg, tokens) {
    let embed = new RichEmbed();

    switch (tokens[1]) {
      case 'run':
        ActivityMonitor.setActiveRoles(db, msg.member.guild);
      default:
        break;
    }
  }

  static setActiveRoles(db, guild) {
    const campers = db
      .get('campers')
      .filter((camper) => {
        return (
          camper.last_post_timestamp >
          new Date().setDate(new Date().getDate() - 30)
        );
      })
      .value();

    const role_id = db.get('options.active_role_id').value();
    if (!role_id) {
      // ERROR
      return;
    }

    const prev_active = new Set(ActivityMonitor._findRoleUsers(role_id, guild));
    const curr_active = new Set(campers.map((c) => c.id));

    const to_add = [...curr_active].filter((c) => !prev_active.has(c));
    const to_remove = [...prev_active].filter((c) => !curr_active.has(c));

    if (to_add.length) {
      console.log('[INFO] Adding active role to : ' + to_add.toString());
    }
    if (to_remove.length) {
      console.log('[INFO] Removing active role from : ' + to_remove.toString());
    }

    to_add.forEach((id) => ActivityMonitor._addRole(id, role_id, guild));
    to_remove.forEach((id) => ActivityMonitor._removeRole(id, role_id, guild));

    if (
      db.get('options.display_active_member_run').value() &&
      db.get('options.admin_channel_id').value()
    ) {
      guild.channels
        .get(db.get('options.admin_channel_id').value())
        .send(
          new RichEmbed()
            .setDescription('Ran nightly role update.')
            .setFooter('Beep boop')
        );
    }
  }

  // *** ROLE MANIPULATION **
  // Could be refactored if needed.
  static _findRoleUsers(role_id, guild) {
    const role = guild.roles.get(role_id);

    if (!role) return [];
    return role.members.map((m) => m.user.id);
  }

  static _addRole(user_id, role_id, guild) {
    const guild_member = guild.member(user_id);
    const role = guild.roles.get(role_id);

    if (!guild_member || !role) return;
    guild_member.addRole(role);
  }

  static _removeRole(user_id, role_id, guild) {
    const guild_member = guild.member(user_id);
    const role = guild.roles.get(role_id);

    if (!guild_member || !role) return;
    guild_member.removeRole(role);
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
          `Previously \`${tokens[2]}\` was set to:\n ` + '```' + prev + '```'
        );
        break;
      }
      // *** SETTING CHANNELS
      case 'botchannel': {
        ConfigManager.getChannel(
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
        ConfigManager.setChannel(
          embed,
          db,
          'options.bot_channel_id',
          'bot channel',
          tokens[2]
        );
        break;
      }
      case 'adminchannel': {
        ConfigManager.getChannel(
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
        ConfigManager.setChannel(
          embed,
          db,
          'options.admin_channel_id',
          'admin channel',
          tokens[2]
        );
        break;
      }
      // *** SETTING ROLES
      case 'activerole': {
        ConfigManager.getRole(
          embed,
          db,
          'options.active_role_id',
          'active role'
        );
        break;
      }
      case 'setactiverole': {
        if (tokens.length < 3) {
          errorEmbed(embed, 'No role provided', null, 'Give me a role :3c');
          break;
        }
        ConfigManager.setRole(
          embed,
          db,
          'options.active_role_id',
          'active role',
          tokens[2]
        );
        break;
      }
      default:
        return;
    }

    msg.channel.send(embed);
  }

  static _getKey(embed, db, key, name, prefix) {
    const value_id = db.get(key).value();
    embed.setDescription(`The current ${name} is <${prefix}${value_id}>.`);
    embed.setFooter(`ID: ${value_id}`);
  }

  static _setKey(embed, db, key, name, value_str, match_str) {
    const value_id = (value_str.match(match_str) || [null, null])[1];
    // TODO: Add real validation.
    if (value_id) {
      db.set(key, value_id).write();
      embed.setDescription(`Setting ${name} to ${value_str}.`);
      embed.setFooter(`ID: ${value_id}`);
    } else {
      errorEmbed(
        embed,
        'ID not found',
        "Are you sure you're using mentions?",
        null
      );
    }
  }

  static getChannel(embed, db, key, name) {
    ConfigManager._getKey(embed, db, key, name, '#');
  }

  static setChannel(embed, db, key, name, value_str) {
    ConfigManager._setKey(embed, db, key, name, value_str, /<#(\d+)>/);
  }

  static getRole(embed, db, key, name) {
    ConfigManager._getKey(embed, db, key, name, '@&');
  }

  static setRole(embed, db, key, name, value_str) {
    ConfigManager._setKey(embed, db, key, name, value_str, /<@&(\d+)>/);
  }
}

class ColorManager {
  static execute(msg, tokens) {
    const color = tokens[1];
    const guildMember = msg.channel.guild.member(msg.author);
    const role = guildMember.roles.find((role) => {
      return role.name === msg.author.tag;
    });
    if (role != undefined) {
      role.setColor(color);
    } else {
      const roleData = {
        name: msg.author.tag,
        color: color,
      };
      msg.channel.guild.createRole(roleData, 'Colors').then((role) => {
        guildMember.addRole(role, 'Colors');
      });
    }
    const embed = new RichEmbed();
    embed.setColor(color);
    embed.setTitle('Your color has been updated!');
    embed.setDescription(
      `I set your color to \`${color}\` based on your request. ` +
        `If this wasn't what you wanted, try again! O:`
    );
    embed.setFooter(
      "P.S. No spaces please I'm shy. Colors chosen based on however " +
        'Discord resolves strings to colors. I suggest hex values.'
    );
    msg.channel.send(embed);
  }
}

module.exports = {
  ActivityMonitor: ActivityMonitor,
  ColorManager: ColorManager,
  ConfigManager: ConfigManager,
};
