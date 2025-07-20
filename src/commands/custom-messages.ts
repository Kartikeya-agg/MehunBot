import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
	description: 'Custom response command',
	preconditions: ['ModOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) =>
					option
						.setName('action')
						.setDescription('The action to perform')
						.setRequired(true)
						.addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' })
				)
				.addStringOption((option) => option.setName('command').setDescription('The message bot will respond to').setRequired(false))
				.addStringOption((option) => option.setName('response').setDescription('The response the bot will send').setRequired(false))
				.setDMPermission(false)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.inGuild() || !interaction.guild)
			return interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
		let dbGuild = await this.container.db.findOne({ guildId: interaction.guild.id });
		if (!dbGuild) {
			dbGuild = await this.container.db.create({ guildId: interaction.guild.id });
		}
		const action = interaction.options.getString('action', true);
		const command = interaction.options.getString('command', false);
		const response = interaction.options.getString('response', false);
		if (action === 'add') {
			if (!command || !response) return interaction.reply({ content: 'Please provide a command and response', ephemeral: true });
			const customMessage = dbGuild.customMessages.find((msg) => msg.name === command);
			if (customMessage) {
				customMessage.response = response;
			} else {
				dbGuild.customMessages.push({ name: command, response: response });
			}

			await dbGuild.save();
			return interaction.reply({ content: `Custom message \`${response}\` set to \`${command}\``, ephemeral: true });
		} else if (action === 'remove') {
			if (!command) return interaction.reply({ content: 'Please provide a command', ephemeral: true });
			const customMessage = dbGuild.customMessages.find((msg) => msg.name === command);
			if (!customMessage) return interaction.reply({ content: `Custom message \`${command}\` not found`, ephemeral: true });
			dbGuild.customMessages = dbGuild.customMessages.filter((msg) => msg.name !== command);
			await dbGuild.save();
			return interaction.reply({ content: `Custom message \`${command}\` removed`, ephemeral: true });
		} else {
			if (dbGuild.customMessages.length === 0) return interaction.reply({ content: 'No custom messages found', ephemeral: true });
			let msg = '';
			for (const customMessage of dbGuild.customMessages) {
				msg += `${customMessage.name}\ -> \`${customMessage.response}\`\n`;
			}
			return interaction.reply({ content: msg, ephemeral: true });
		}
	}
}
