import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {relay} from "../mongo";

@ApplyOptions<Command.Options>({
	description: 'Relay messages from one channel to another',
	enabled: true,
	preconditions: ['ModOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((subcommand) => //
					//Add
					subcommand
						.setName('add')
						.setDescription('Add a channel to the relay')
						.addChannelOption((option) => option.setName('channel').setDescription('The channel to relay').setRequired(true))
						.addChannelOption(option => option.setName("destination").setDescription("The channel to relay to").setRequired(true))
				)
				.addSubcommand((subcommand) => //
					//Remove
					subcommand
						.setName('remove')
						.setDescription('Remove a channel from the relay')
						.addChannelOption((option) => option.setName('channel').setDescription('The channel to remove from the relay').setRequired(true))
				)
				.addSubcommand((subcommand) => //
					//List
					subcommand
						.setName('list')
						.setDescription('List all relayed channels')
				)
				.setDMPermission(false)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.inGuild()) return;
		if (!interaction.inCachedGuild()) await interaction.guild!.fetch();
		if (!interaction.inCachedGuild()) return;
		if (!interaction.member.permissions.has("Administrator")) return interaction.reply({ content: "You do not have the required permissions to use this command.", ephemeral: true });
		const subcommand = interaction.options.getSubcommand();
		if (!subcommand) return interaction.reply({ content: "No subcommand provided", ephemeral: true });
		if (subcommand === 'add') {
			const channel = interaction.options.getChannel('channel', true);
			const destination = interaction.options.getChannel('destination', true);
			if (!channel) return interaction.reply({ content: "No channel provided", ephemeral: true });
			const dbGuild = await relay.findOne({ guildId: interaction.guildId }) || new relay({ guildId: interaction.guildId });
			if (!dbGuild) return interaction.reply({ content: "No database found", ephemeral: true });
			if (dbGuild.relay && dbGuild.relay.find(r => r.source === channel.id)) return interaction.reply({ content: "This channel is already being relayed to", ephemeral: true });
			await relay.updateOne({ guildId: interaction.guildId }, { $push: { relay: { source: channel.id, destination: destination.id } } });
			await dbGuild.save();
			return interaction.reply({ content: "Channel added to relay", ephemeral: true });
		} else if (subcommand === 'remove') {
			const channel = interaction.options.getChannel('channel');
			if (!channel) return interaction.reply({ content: "No channel provided", ephemeral: true });
			const dbGuild = await relay.findOne({ guildId: interaction.guildId }) || new relay({ guildId: interaction.guildId });
			if (!dbGuild) return interaction.reply({ content: "No database found", ephemeral: true });
			if (dbGuild.relay && !dbGuild.relay.find(r => r.source === channel.id)) return interaction.reply({ content: "This channel is not being relayed", ephemeral: true });
			await relay.updateOne({ guildId: interaction.guildId }, { $pull: { relay: { source: channel.id } } });
			await dbGuild.save();
			return interaction.reply({ content: "Channel removed from relay", ephemeral: true });
		} else if (subcommand === 'list') {
			const dbGuild = await relay.findOne({ guildId: interaction.guildId }) || new relay({ guildId: interaction.guildId });
			// this.container.logger.info(dbGuild.relay)
			if (!dbGuild) return interaction.reply({ content: "No database found", ephemeral: true });
			if (!dbGuild.relay || dbGuild.relay.length === 0) return interaction.reply({ content: "No channels being relayed", ephemeral: true });
			const channels = dbGuild.relay.map(r => `<#${r.source}> -> <#${r.destination}>`);
			return interaction.reply({ content: channels.join('\n'), ephemeral: true });
		}

	}
}
