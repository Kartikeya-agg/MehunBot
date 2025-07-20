import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { Invite } from 'discord.js';
@ApplyOptions<Listener.Options>({})
export class UserEvent extends Listener {
	public override run(invite: Invite) {
		if (!invite.guild) return;
		this.container.invites.get(invite.guild.id)?.delete(invite.code);
	}
}
