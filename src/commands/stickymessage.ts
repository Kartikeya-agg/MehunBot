import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { stickyMessages } from '../mongo';
import { PermissionFlagsBits } from 'discord.js';
import { addStickyMessage, removeStickyMessage } from '../listeners/stickymessage';

@ApplyOptions<Command.Options>({
	description: 'A basic slash command'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.addSubcommand((subcommand) => //
				//Add a sticky message
					subcommand
						.setName('add')
						.setDescription('Add a sticky message to the channel')
						.addStringOption((option) => option.setName('message').setDescription('The message to add').setRequired(true))
						.addChannelOption(option => option.setName("channel").setDescription("The channel to add the sticky message to").setRequired(true))
						.addIntegerOption(option => option.setName("frequency").setDescription("The frequency to send the message").setRequired(true))
				)
				.addSubcommand((subcommand) => //
				//Remove a sticky message
					subcommand
						.setName('remove')
						.setDescription('Remove a sticky message from the channel')
						.addChannelOption(option => option.setName("channel").setDescription("The channel to remove the sticky message from").setRequired(true))
						.addStringOption((option) => option.setName('message').setDescription('The message to remove').setRequired(true))
				)
				.addSubcommand((subcommand) => //
				//List sticky messages
					subcommand
						.setName('list')
						.setDescription('List all sticky messages')
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand();
		if (!subcommand) return interaction.reply({ content: "No subcommand provided", ephemeral: true });
		if (subcommand === "add") {
			const message = interaction.options.getString('message', true);
			const frequency = interaction.options.getInteger('frequency', true);
			const channel = interaction.options.getChannel('channel', true);
			if (!message) return interaction.reply({ content: "No message provided", ephemeral: true });
			const dbGuild = await stickyMessages.findOne({ guildId: interaction.guildId }) || new stickyMessages({ guildId: interaction.guildId });
			if (!dbGuild) return interaction.reply({ content: "No database found", ephemeral: true });
			if (dbGuild.messages && dbGuild.messages.find(r => r.message === message && r.channelId === channel.id)) return interaction.reply({ content: "This message is already a sticky message", ephemeral: true });
			await stickyMessages.updateOne({ guildId: interaction.guildId }, { $push: { messages: { channelId: channel.id, message: message, frequency: frequency } } });
			await dbGuild.save();
			addStickyMessage(channel.id, message, frequency);
			return interaction.reply({ content: "Message added to sticky messages", ephemeral: true });
		} else if (subcommand === "remove") {
			const message = interaction.options.getString('message', true);
			const channel = interaction.options.getChannel('channel', true);
			const dbGuild = await stickyMessages.findOne({ guildId: interaction.guildId });
			if (!dbGuild) return interaction.reply({ content: "No database found", ephemeral: true });
			if (!dbGuild.messages || !dbGuild.messages.find(r => r.message === message && r.channelId === channel.id)) return interaction.reply({ content: "This message is not a sticky message", ephemeral: true });
			await stickyMessages.updateOne({ guildId: interaction.guildId }, { $pull: { messages: { message: message, channelId: channel.id } } });
			await dbGuild.save();
			removeStickyMessage(channel.id, message);
			return interaction.reply({ content: "Message removed from sticky messages", ephemeral: true });


		} else if (subcommand === "list") {
			const dbGuild = await stickyMessages.findOne({ guildId: interaction.guildId });
			if (!dbGuild) return interaction.reply({ content: "No database found", ephemeral: true });
			if (!dbGuild.messages || dbGuild.messages.length === 0) return interaction.reply({ content: "No sticky messages found", ephemeral: true });
			const messages = dbGuild.messages.map(m => `Channel: <#${m.channelId}> Frequency: ${m.frequency}\nMessage: \`\`\`${m.message}\`\`\``);
			return interaction.reply({ content: messages.join("\n"), ephemeral: true });
		} else return;

	}
}
