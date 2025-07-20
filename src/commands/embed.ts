import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Embed Command',
	preconditions: ['ModOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) => option.setName('title').setDescription('The title of the embed').setRequired(true))
				.addStringOption((option) => option.setName('description').setDescription('The description of the embed').setRequired(true))
				.addStringOption((option) => option.setName('color').setDescription('The color of the embed').setRequired(true))
				.addStringOption((option) => option.setName('footer').setDescription('The footer of the embed').setRequired(false))
				.addStringOption((option) => option.setName('image').setDescription('The image of the embed').setRequired(false))
				.addStringOption((option) => option.setName('thumbnail').setDescription('The thumbnail of the embed').setRequired(false))
				.addStringOption((option) => option.setName('author').setDescription('The author of the embed').setRequired(false))
				.addStringOption((option) => option.setName('authorimage').setDescription('The author image of the embed').setRequired(false))
				.addStringOption((option) => option.setName('authorurl').setDescription('The author url of the embed').setRequired(false))
				.addStringOption((option) => option.setName('field1_title').setDescription('Title of field 1').setRequired(false))
				.addStringOption((option) => option.setName('field1_value').setDescription('Value of field 1').setRequired(false))
				.addBooleanOption((option) => option.setName('field1_inline').setDescription('Inline of field 1').setRequired(false))
				.addStringOption((option) => option.setName('field2_title').setDescription('Title of field 2').setRequired(false))
				.addStringOption((option) => option.setName('field2_value').setDescription('Value of field 2').setRequired(false))
				.addBooleanOption((option) => option.setName('field2_inline').setDescription('Inline of field 2').setRequired(false))
				.addStringOption((option) => option.setName('field3_title').setDescription('Title of field 3').setRequired(false))
				.addStringOption((option) => option.setName('field3_value').setDescription('Value of field 3').setRequired(false))
				.addBooleanOption((option) => option.setName('field3_inline').setDescription('Inline of field 3').setRequired(false))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const embed = createEmbed(interaction);
		if (!embed) return;

		await interaction.channel?.send({ embeds: [embed] });
		await interaction.reply({ content: 'Embed sent!', ephemeral: true });
	}
}

function capitalizeFirstLetter(string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function createEmbed(interaction: Command.ChatInputCommandInteraction) {
	const title = interaction.options.getString('title', true);
	const description = interaction.options.getString('description', true);
	const color = interaction.options.getString('color', true);
	const footer = interaction.options.getString('footer', false);
	const image = interaction.options.getString('image', false);
	const thumbnail = interaction.options.getString('thumbnail', false);
	const author = interaction.options.getString('author', false);
	const authorImage = interaction.options.getString('authorimage', false);
	const authorUrl = interaction.options.getString('authorurl', false);

	const embed = new EmbedBuilder().setTitle(title).setDescription(description);

	if (color) {
		try {
			embed.setColor(capitalizeFirstLetter(color) as ColorResolvable);
		} catch (e) {
			interaction.reply({ content: 'Invalid color!', ephemeral: true });
			return false;
		}
	}

	if (footer)
		embed.setFooter({
			text: footer
		});
	if (image) embed.setImage(image);
	if (thumbnail) embed.setThumbnail(thumbnail);

	if (author) {
		embed.setAuthor({
			name: author,
			iconURL: authorImage || undefined,
			url: authorUrl || undefined
		});
	}

	for (let i = 1; i <= 3; i++) {
		const field_title = interaction.options.getString(`field${i}_title`, false);
		const field_value = interaction.options.getString(`field${i}_value`, false);
		const field_inline = interaction.options.getBoolean(`field${i}_inline`, false) || false;

		if (field_title && field_value) {
			embed.addFields({ name: field_title, value: field_value, inline: field_inline });
		}
	}

	return embed;
}
