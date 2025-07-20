import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Football } from '../mongo';

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
				.addSubcommand((subcommand) =>
					subcommand
						.setName('logchannel')
						.setDescription('Set the log channel')
						.addChannelOption((option) => option.setName('logchannel').setDescription('The channel to log to').setRequired(true))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('welcomechannel')
						.setDescription('Set the invite channel')
						.addChannelOption((option) =>
							option.setName('invitechannel').setDescription('The channel to send invites to').setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('modrole')
						.setDescription('Set the mod role')
						.addStringOption((option) =>
							option
								.setName('action')
								.setDescription('The action to perform')
								.setRequired(true)
								.addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' })
						)
						.addRoleOption((option) => option.setName('modrole').setDescription('The role to give to moderators').setRequired(true))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('footballchannel')
						.setDescription('Set the football channel')
						.addChannelOption((option) =>
							option.setName('footballchannel').setDescription('The channel to send football updates to').setRequired(true)
						)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.guild) return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
		const member = await interaction.guild.members.fetch(interaction.user.id);
		if (!member.permissions.has('Administrator'))
			return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
		let dbGuild = await this.container.db.findOne({ guildId: interaction.guild.id });
		if (!dbGuild) {
			dbGuild = await this.container.db.create({ guildId: interaction.guild.id });
		}
		const subcommand = interaction.options.getSubcommand();
		if (!subcommand) return interaction.reply({ content: 'No subcommand.', ephemeral: true });
		if (subcommand === 'logchannel') {
			const logChannel = interaction.options.getChannel('logchannel', true);
			if (logChannel.type !== 0) return interaction.reply({ content: 'Invalid channel.', ephemeral: true });
			let dbGuild = await this.container.db.findOne({ guildId: interaction.guild.id });
			if (!dbGuild) {
				dbGuild = await this.container.db.create({ guildId: interaction.guild.id });
			}
			dbGuild.logs = logChannel.id;
			await dbGuild.save();
			return await interaction.reply({ content: 'Done!', ephemeral: true });
		} else if (subcommand === 'welcomechannel') {
			const inviteChannel = interaction.options.getChannel('invitechannel', true);
			if (inviteChannel.type !== 0) return interaction.reply({ content: 'Invalid channel.', ephemeral: true });
			let dbGuild = await this.container.db.findOne({ guildId: interaction.guild.id });
			if (!dbGuild) {
				dbGuild = await this.container.db.create({ guildId: interaction.guild.id });
			}
			dbGuild.welcomeChannel = inviteChannel.id;
			await dbGuild.save();
			return await interaction.reply({ content: 'Done!', ephemeral: true });
		} else if (subcommand === 'modrole') {
			const action = interaction.options.getString('action', true);
			const modRole = interaction.options.getRole('modrole', true);
			if (action === 'add') {
				if (dbGuild.modRoles.includes(modRole.id)) return interaction.reply({ content: 'That role is already a mod role.', ephemeral: true });
				dbGuild.modRoles.push(modRole.id);
				await dbGuild.save();
				return interaction.reply({ content: 'Done!', ephemeral: true });
			} else if (action === 'remove') {
				if (!dbGuild.modRoles.includes(modRole.id)) return interaction.reply({ content: 'That role is not a mod role.', ephemeral: true });
				dbGuild.modRoles = dbGuild.modRoles.filter((role) => role !== modRole.id);
				await dbGuild.save();
				return interaction.reply({ content: 'Done!', ephemeral: true });
			} else if (action === 'list') {
				if (dbGuild.modRoles.length === 0) return interaction.reply({ content: 'There are no mod roles.', ephemeral: true });
				const roles = dbGuild.modRoles.map((role) => `<@&${role}>`);
				return interaction.reply({ content: roles.join('\n'), ephemeral: true });
			} else return interaction.reply({ content: 'Invalid action.', ephemeral: true });
		} else if (subcommand === 'footballchannel') {
			const channel = interaction.options.getChannel('footballchannel', true);
			const fix = await Football.findOne({ name: '1' }) || await Football.create({ name: '1' });
			if (fix?.fixturechannels?.find((r) => r === channel.id)) {
				fix.fixturechannels = fix.fixturechannels.filter((r) => r !== channel.id);
				await fix?.save();
				return interaction.reply({ content: 'Removed channel.', ephemeral: true });
			}
			fix?.fixturechannels?.push(channel.id);
			await fix?.save();
			return interaction.reply({ content: 'Done!', ephemeral: true });
		} else {
			return interaction.reply({ content: 'Invalid subcommand.', ephemeral: true });
		}
	}
}
