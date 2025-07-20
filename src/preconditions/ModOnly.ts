import { AllFlowsPrecondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message, Snowflake } from 'discord.js';

export class UserPrecondition extends AllFlowsPrecondition {
	#message = 'This command can only be used by the moderator.';

	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guild) return this.ok();
		const member = await interaction.guild.members.fetch(interaction.user.id);
		if (member.permissions.has('Administrator') || interaction.guild.ownerId === interaction.user.id) return this.ok();
		return this.doModCheck(interaction.user.id, interaction.guild.id);
	}

	public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (!interaction.guild) return this.ok();
		return this.doModCheck(interaction.user.id, interaction.guild.id);
	}

	public override messageRun(message: Message) {
		if (!message.guild) return this.ok();
		return this.doModCheck(message.author.id, message.guild.id);
	}

	private async doModCheck(userId: Snowflake, guildId: Snowflake) {
		const guild = await this.container.db.findOne({ guildId: guildId });
		const member = await this.container.client.guilds.cache.get(guildId)?.members.fetch(userId);
		if (!guild || !member) return this.error({ message: this.#message });
		if (member.guild.ownerId === member.id || member.permissions.has('Administrator')) return this.ok();
		//Check if modRole array has any roles which the user has
		const hasRole = guild.modRoles.some((role) => member.roles.cache.has(role as string));
		if (hasRole) return this.ok();
		return this.error({ message: this.#message });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		ModOnly: never;
	}
}

export default UserPrecondition;
