import { ApplyOptions } from '@sapphire/decorators';
import type { GuildTextBasedChannelTypes } from '@sapphire/discord.js-utilities';
import { Listener } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';
@ApplyOptions<Listener.Options>({})
export class UserEvent extends Listener {
	public override async run(member: GuildMember) {
		const newInvites = await member.guild.invites.fetch();
		const oldInvites = this.container.invites.get(member.guild.id);
		const invite = newInvites.find((v) => oldInvites?.get(v.code) !== v.uses);
		if (!invite) return;
		const inviter =  invite.inviter ? await member.guild.members.fetch(invite.inviter?.id) : null;
		this.container.invites.get(member.guild.id)?.set(invite.code, invite.uses);
		const guildDB = await this.container.db.findOne({ guildId: member.guild.id });
		if (!guildDB || !guildDB.welcomeChannel) return;

		const welcome = member.guild.channels.cache.get(guildDB.welcomeChannel) as GuildTextBasedChannelTypes;
		if (!welcome) return;
		const msg = guildDB.welcomeMessage || this.container.messages.welcomeMessagewithoutinviter
		inviter
			? welcome.send(
					msg
						.replace(/{user}/g, `<@${member.id}>`)
						.replace(/{guild}/g, `${member.guild.name}`)
						.replace(/{inviter}/g, `<@${inviter.id}>`)
						.replace(/{memberCount}/g, `${member.guild.memberCount}`)
			  )
			: welcome.send(
				msg
						.replace(/{user}/g, `<@${member.id}>`)
						.replace(/{guild}/g, `${member.guild.name}`)
						.replace(/{memberCount}/g, `${member.guild.memberCount > 3 ? member.guild.memberCount + `th` : member.guild.memberCount}`)
						.replace(/{inviter}/g, `Unknown`)
			  );
	}
}
