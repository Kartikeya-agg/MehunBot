import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';

@ApplyOptions<Listener.Options>({})
export class UserEvent extends Listener {
	public override async run(message: Message) {
		const guildDB = await this.container.db.findOne({ guildId: message.guild!.id });
		if (!guildDB) return;
		const customCommand = guildDB.customMessages.find((c: any) => c.name.toLowerCase() === message.content.toLowerCase().slice(1));
		if (!customCommand) return;
		return message.channel.send(customCommand.response);
	}
}
