import { AllFlowsPrecondition, Piece, container } from '@sapphire/framework';
import type { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message, Snowflake } from 'discord.js';
export class UserPrecondition extends AllFlowsPrecondition {
	#message = "Sorry but you are banned from using this bot's commands.";

	public constructor(context: Piece.Context, options: AllFlowsPrecondition.Options) {
		super(context, {
			...options,
			position: 20
		});
	}

	public override chatInputRun(interaction: ChatInputCommandInteraction) {
		return this.doBanlistCheck(interaction.user.id, interaction.guildId);
	}

	public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
		return this.doBanlistCheck(interaction.user.id, interaction.guildId);
	}

	public override messageRun(message: Message) {
		return this.doBanlistCheck(message.author.id, message.guildId);
	}

	private async doBanlistCheck(userId: Snowflake, guildId: Snowflake | null) {
		if (guildId === null) return this.ok();
		const guild = this.container.client.guilds.cache.get(guildId);
		if (!guild) return this.ok();
		// console.log(container.db);

		const dbGuild = await container.db.findOne({ guildId: guildId });
		if (!dbGuild) return this.ok();
		const isInBanned = dbGuild.blacklist.includes(userId);

		if (!isInBanned) return this.ok();

		// Guild was found, therefore it is banned.
		return this.error({ identifier: 'UserInBanList', message: this.#message });
	}
}
