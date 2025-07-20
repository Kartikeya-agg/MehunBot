import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, type MessageActionRowComponentBuilder } from 'discord.js';
import ms from 'ms';
@ApplyOptions<Command.Options>({
	description: 'An active poll'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) => option.setName('title').setDescription('The title of the poll').setRequired(true))
				.addStringOption((option) => option.setName('description').setDescription('The description of the poll').setRequired(true))
				.addStringOption((option) => option.setName('option1').setDescription('The first option of the poll').setRequired(true))
				.addStringOption((option) => option.setName('option2').setDescription('The second option of the poll').setRequired(true))
				.addStringOption((option) => option.setName('time').setDescription('The time of the poll (10m | 10h)').setRequired(false))
				.addStringOption((option) => option.setName('option3').setDescription('The third option of the poll').setRequired(false))
				.addStringOption((option) => option.setName('option4').setDescription('The fourth option of the poll').setRequired(false))
				.addStringOption((option) => option.setName('option5').setDescription('The fifth option of the poll').setRequired(false))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const title = interaction.options.getString('title', true);
		let description = interaction.options.getString('description', true);
		let time = interaction.options.getString('time') || "0";
		const option1 = interaction.options.getString('option1');
		const option2 = interaction.options.getString('option2');
		const option3 = interaction.options.getString('option3');
		const option4 = interaction.options.getString('option4');
		const option5 = interaction.options.getString('option5');
		const options = [option1, option2, option3, option4, option5];

		try {
			time = ms(time).toString();
		} catch (e) {
			return interaction.reply({ content: 'Invalid time format' });
		}

		const embed = new EmbedBuilder().setTitle(title).setColor('Random');
		const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
		for (let i = 0; i < options.length; i++) {
			if (options[i] !== null) {
				description += `\n${i + 1}. ${options[i]} - 0`;
				row.addComponents(
					new ButtonBuilder()
						.setCustomId(`poll_${i + 1}`)
						.setLabel(`${i + 1}`)
						.setStyle(1)
				);
			}
		}

		embed.setDescription(description);
		return interaction.reply({ embeds: [embed], components: [row] }).then((message) => {
			if (time === '0') return;
			setTimeout(async () => {
				const msg = await message.fetch();
				const embed = new EmbedBuilder(msg.embeds[0].toJSON());
				const description = msg.embeds[0].description!;
				const options = description.split('\n');

				let maxVotes = 0;
				let winnerIndex = 0;
				for (let i = 0; i < options.length; i++) {
					const option = options[i].split('. ')[1];
					if (option) {
						const votes = parseInt(option.split(' - ')[1]);
						if (votes > maxVotes) {
							maxVotes = votes;
							winnerIndex = i;
						}
						options[i] = `${option.split(' - ')[0]} - ${votes}`;
					}
				}

				options[winnerIndex] = `**${options[winnerIndex]}**`;
				embed.setDescription(options.join('\n'));
				return msg.edit({ embeds: [embed], components: [] });
			}, parseInt(time));
		});

		// return interaction.reply({ content: 'Hello world!' });
	}
}
