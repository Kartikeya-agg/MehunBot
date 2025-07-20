import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType } from 'discord.js';
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
				.addStringOption((option) => option.setName('duration').setDescription('The duration of the giveaway').setRequired(true))
				.addIntegerOption((option) => option.setName('winners').setDescription('The amount of winners').setRequired(true))
				.addStringOption((option) => option.setName('prize').setDescription('The prize of the giveaway').setRequired(true))
				.addChannelOption((option) => option.setName('channel').setDescription('The channel to host the giveaway in').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const duration = interaction.options.getString('duration', true);
		const winners = interaction.options.getInteger('winners', true);
		const prize = interaction.options.getString('prize', true);
		let channel = interaction.options.getChannel('channel', true);
		const fetchedChannel = interaction.guild?.channels.cache.get(channel.id);
		if (!fetchedChannel || fetchedChannel.type !== ChannelType.GuildText)
			return interaction.reply({ content: this.container.messages.invalidChannel, ephemeral: true });
		this.container.giveaways.start(fetchedChannel, {
			duration: ms(duration),
			prize: prize,
			winnerCount: winners,
			hostedBy: interaction.user,
			messages: this.container.messages
		});

		return interaction.reply({ content: this.container.messages.giveawayStarted, ephemeral: true });
	}
}
