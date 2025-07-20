import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

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
				.addStringOption((option) =>
					option.setName('giveaway').setDescription('The giveaway to unpause (message ID or giveaway prize)').setRequired(true)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// return interaction.reply({ content: 'Hello world!' });
		const query = interaction.options.getString('giveaway', true);
		const giveaway = this.container.giveaways.giveaways.find((g) => g.messageId === query || g.prize === query);
		if (!giveaway) return interaction.reply({ content: this.container.messages.giveawayNotFound, ephemeral: true });
		if (!giveaway.pauseOptions.isPaused) return interaction.reply({ content: this.container.messages.giveawayNotPaused, ephemeral: true });
		await this.container.giveaways.unpause(giveaway.messageId).catch((e) => {
			return interaction.reply({ content: e, ephemeral: true });
		});
		return interaction.reply({ content: this.container.messages.giveawayUnpaused, ephemeral: true });
	}
}
