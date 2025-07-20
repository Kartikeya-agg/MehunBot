import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { type Guild, Collection } from 'discord.js';
@ApplyOptions<Listener.Options>({})
export class UserEvent extends Listener {
	public override run(guild: Guild) {
		guild.invites.fetch().then((invites) => {
			this.container.invites.set(guild.id, new Collection(invites.map((invite) => [invite.code, invite.uses])));
		});
	}
}
