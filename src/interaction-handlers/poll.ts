import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { type ButtonInteraction, EmbedBuilder } from 'discord.js';
const votesCount = new Array<Vote>();

interface Vote {
	id: string;
	option: number;
	message: string;
}
@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		const pollButton = parseInt(interaction.customId.split('_')[1]);
		if (isNaN(pollButton)) return interaction.reply({ content: 'Invalid button' });
		if (!interaction.message.embeds.length) return interaction.reply({ content: 'Invalid message' });
		if (votesCount.find((vote) => vote.id === interaction.user.id && vote.message === interaction.message.id))
			return interaction.reply({ content: 'You already voted', ephemeral: true });
		const embed = new EmbedBuilder(interaction.message.embeds[0].toJSON());
		const description = interaction.message.embeds[0].description!;
		const options = description.split('\n');
		const option = options[pollButton].split('. ')[1];
		console.log('Votes string:', option.split(' - ')[1]);
		const votes = parseInt(option.split(' - ')[1]) || 0;
		const newOption = `${option.split(' - ')[0]} - ${votes + 1}`;
		options[pollButton] = `${pollButton}. ${newOption}`;
		embed.setDescription(options.join('\n'));
		votesCount.push({ id: interaction.user.id, option: pollButton, message: interaction.message.id });
		return interaction.update({ embeds: [embed] });
	}

	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('poll_')) return this.none();

		return this.some();
	}
}
