import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { RoleResolvable } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'A basic slash command'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user to unmute').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// return interaction.reply({ content: 'Hello world!' });
		if (!interaction.guild) return interaction.reply({ content: this.container.messages.guildOnly, ephemeral: true });
		const user = interaction.options.getUser('user', true);
		const member = interaction.guild.members.cache.get(user.id);
		if (!member) return interaction.reply({ content: this.container.messages.userNotFound, ephemeral: true });
		const dbGuild = await this.container.db.findOne({ guildId: interaction.guild.id });
		if (!dbGuild) return interaction.reply({ content: this.container.messages.dbError, ephemeral: true });
		if (!dbGuild.mutedRole) return interaction.reply({ content: this.container.messages.mutedRoleNotSet, ephemeral: true });
		if (!member.roles.cache.has(dbGuild.mutedRole)) return interaction.reply({ content: this.container.messages.userNotMuted, ephemeral: true });
		const dbMember = dbGuild.muted.find((r) => r.id === member.id);
		if (!dbMember) return interaction.reply({ content: this.container.messages.dbError, ephemeral: true });
		await member.roles.remove(dbGuild.mutedRole);
		const userRoles = await dbMember.roles.map((role) => interaction.guild!.roles.cache.get(role as string)).filter((role) => role !== undefined);
		const roles: readonly RoleResolvable[] = userRoles.map((role) => role!.id);
		await member.roles.add(roles);

		await interaction.reply({ content: this.container.messages.userUnmuted, ephemeral: true });
		const index = dbGuild.muted.findIndex((muted) => muted.id === member.id);
		dbGuild.muted.splice(index, 1);
		return await dbGuild.save();
	}
}
