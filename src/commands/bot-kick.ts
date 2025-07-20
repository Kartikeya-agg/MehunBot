import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
	description: 'Kick the bot from the server',
	preconditions: ['OwnerOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) => option.setName('name').setDescription('The server name or ID').setRequired(true))
				.setDMPermission(false)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.inGuild() || !interaction.guild)
			return interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });

		const name = interaction.options.getString('name', true);
		const guilds = await this.container.client.guilds.cache.find((r) => r.name.toLowerCase() === name.toLowerCase() || r.id === name);
		if (!guilds) return interaction.reply({ content: 'Guild not found', ephemeral: true });
		await guilds.leave();
		return interaction.reply({ content: `Left guild ${guilds.name}`, ephemeral: true });
	}
}
