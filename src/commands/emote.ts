import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import axios from 'axios';

@ApplyOptions<Command.Options>({
	description: 'A basic slash command'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((o) => o.setName('emote').setDescription('The emote to steal').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.guild) return interaction.reply({ content: 'This command can only be used in a server', ephemeral: true });
		// return interaction.reply({ content: 'Hello world!' });
		const query = interaction.options.getString('emote', true);
		const id = query.split(':')[2].replace('>', '');
		const type = await axios
			.get(`https://cdn.discordapp.com/emojis/${id}.gif`)
			.then((img) => {
				if (img) return 'gif';
				else return 'png';
			})
			.catch(() => 'png');

		const emoji = `https://cdn.discordapp.com/emojis/${id}.${type}?quality=lossless`;
		// console.log(emoji);

		try {
			const emote = await interaction.guild.emojis
				.create({
					attachment: emoji,
					name: query.split(':')[1]
				})
				.catch(console.error);
			if (!emote) return interaction.reply({ content: 'Failed to create the emote', ephemeral: true });
			return interaction.reply({
				content: 'Emote created ' + `${emote.animated ? `<a:${emote.name}:${emote.id}>` : `<:${emote.name}:${emote.id}>`}`,
				ephemeral: true
			});
		} catch (e) {
			this.container.logger.error(e);
			return interaction.reply({ content: `There was an error`, ephemeral: true });
		}
	}
}
