import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type GuildTextBasedChannel, type Role, type RoleResolvable } from 'discord.js';
import ms from 'ms';

@ApplyOptions<Command.Options>({
	description: 'A basic slash command',
	preconditions: ['GuildTextOnly', 'ModOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user to mute').setRequired(true))
				.addStringOption((option) => option.setName('duration').setDescription('The duration of the mute').setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('The reason for the mute').setRequired(false))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.guild) return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
		const user = interaction.options.getUser('user', true);
		const duration = interaction.options.getString('duration', true);
		let parsedDuration;
		const reason = interaction.options.getString('reason', false);
		const member = await interaction.guild.members.fetch(user.id);
		const interactionMember = await interaction.guild.members.fetch(interaction.user.id);
		if (!member) return interaction.reply({ content: 'This user is not in the server.', ephemeral: true });
		if (interaction.user.id !== interaction.guild.ownerId && member.roles.highest.position >= interactionMember.roles.highest.position)
			return interaction.reply({ content: 'You cannot mute this user.', ephemeral: true });

		try {
			parsedDuration = ms(duration);
		} catch (err) {
			return interaction.reply({ content: 'Invalid duration.', ephemeral: true });
		}

		let dbGuild = await this.container.db.findOne({ guildId: interaction.guild.id });
		if (!dbGuild) dbGuild = await this.container.db.create({ guildId: interaction.guild.id });
		let mutedRole: Role | undefined;
		if (dbGuild.mutedRole) mutedRole = interaction.guild.roles.cache.get(dbGuild.mutedRole);
		else mutedRole = interaction.guild.roles.cache.find((role) => role.name === 'Muted');
		if (!mutedRole) {
			mutedRole = await interaction.guild.roles.create({
				name: 'Muted',
				color: 'DarkButNotBlack',
				permissions: []
			});
			if (!mutedRole) return interaction.reply({ content: 'Failed to create muted role.', ephemeral: true });

			await interaction.guild.channels.cache.forEach(async (channel) => {
				await channel.permissionsFor(mutedRole!).remove(['SendMessages', 'ViewChannel']);
			});
			dbGuild.mutedRole = mutedRole.id;
			await dbGuild.save();
		}

		const userRoles = member.roles.cache.filter((r) => r.editable && r.id !== interaction.guild!.id && !r.managed).map((r) => r.id);
		await dbGuild.muted.push({
			id: member.id,
			roles: userRoles,
			time: parsedDuration + Date.now()
		});
		await dbGuild.save();
		await member.roles.remove(userRoles);
		await member.roles.add(mutedRole);

		await interaction.reply({ content: `Muted ${user.tag} for ${duration}.`, ephemeral: true });

		setTimeout(async () => {
			const dbGuild = await this.container.db.findOne({ guildId: interaction.guild!.id });
			if (!dbGuild) return;
			const index = dbGuild.muted.findIndex((muted) => muted.id === member.id);
			if (index === -1) return;
			const muted = dbGuild.muted[index];
			await member.roles.remove(mutedRole!);
			const userRoles = await muted.roles
				.map((role) => interaction.guild!.roles.cache.get(role as string))
				.filter((role) => role !== undefined);
			const roles: readonly RoleResolvable[] = userRoles.map((role) => role!.id);
			if (userRoles && userRoles.length > 0) await member.roles.add(roles);
			dbGuild.muted.splice(index, 1);
			await dbGuild.save();
		}, parsedDuration);

		if (!dbGuild.logs) return;
		const logs = interaction.guild.channels.cache.get(dbGuild.logs) as GuildTextBasedChannel;
		if (!logs) return;
		const embed = new EmbedBuilder()
			.setColor('Red')
			.setDescription(
				`**Action:** Mute\n**User:** ${user.tag} (${user.id})\n**Moderator:** ${interaction.user.tag} (${interaction.user.id})\n**Reason:** ${
					reason || 'None'
				}\n**Duration:** ${duration}`
			)
			.setTimestamp();
		return await logs.send({ embeds: [embed] });
	}
}
