import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/pieces';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'A basic slash command',
	preconditions: ['ModOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('add')
						.setDescription('Add a user to the blacklist')
						.addUserOption((option) => option.setName('user').setDescription('The user to add to the blacklist').setRequired(false))
						.addStringOption(option => option.setName("name").setDescription("The user's name").setRequired(false))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('remove')
						.setDescription('Remove a user from the blacklist')
						.addUserOption((option) => option.setName('user').setDescription('The user to remove from the blacklist').setRequired(false))
						.addStringOption(option => option.setName("name").setDescription("The user's name").setRequired(false))
				)
				.addSubcommand((subcommand) => subcommand.setName('list').setDescription('List all blacklisted users'))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// return interaction.reply({ content: 'Hello world!' });
		const subcommand = interaction.options.getSubcommand();
		if (!subcommand) return interaction.reply({ content: this.container.messages.noSubcommand, ephemeral: true });
		// console.log(this.container.db);

		let dbGuild = await container.db.findOne({ guildId: interaction.guildId });
		if (!dbGuild) {
			dbGuild = await container.db.create({
				guildId: interaction.guildId
			});
		}
		console.log(dbGuild.blacklist);

		if (subcommand === 'add') {
			let user = interaction.options.getUser('user') ? interaction.options.getUser('user')?.username : interaction.options.getString('name') ? interaction.options.getString('name') : null;
			if (!user) return interaction.reply({ content: this.container.messages.noUserProvided, ephemeral: true });
			if (dbGuild.blacklist.includes(user))
				return interaction.reply({ content: this.container.messages.userAlreadyBlacklisted, ephemeral: true });
			dbGuild.blacklist.push(user);
			await dbGuild.save();
			return interaction.reply({ content: this.container.messages.userAddedToBlacklist, ephemeral: true });
		} else if (subcommand === 'remove') {
			let user = interaction.options.getUser('user') ? interaction.options.getUser('user')?.username : interaction.options.getString('name') ? interaction.options.getString('name') : null;
			if (!user) return interaction.reply({ content: this.container.messages.noUserProvided, ephemeral: true });
			if (!dbGuild.blacklist.includes(user))
				return interaction.reply({ content: this.container.messages.userNotBlacklisted, ephemeral: true });
			dbGuild.blacklist.splice(dbGuild.blacklist.indexOf(user), 1);
			await dbGuild.save();
			return interaction.reply({ content: this.container.messages.userRemovedFromBlacklist, ephemeral: true });
		} else if (subcommand === 'list') {
			if (dbGuild.blacklist.length === 0) return interaction.reply({ content: this.container.messages.noBlacklistedUsers, ephemeral: true });
			const embed = new EmbedBuilder()
				.setTitle(this.container.messages.blacklistedUsersEmbed.title)
				.setDescription(
					this.container.messages.blacklistedUsersEmbed.description + `\n${dbGuild.blacklist.map((id) => `- <@${id}>`).join('\n')}`
				);
			try {
				//@ts-expect-error
				embed.setColor(this.container.messages.blacklistedUsersEmbed.color);
			} catch (error) {
				embed.setColor('Red');
			}

			return interaction.reply({ embeds: [embed] });
		}

		return interaction.reply({ content: 'Hello world!' });
	}
}
