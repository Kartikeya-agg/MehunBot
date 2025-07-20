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
					option.setName('welcome').setDescription('Welcome message, {user} | {guild} | {inviter} | {memberCount} ').setRequired(true)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// return interaction.reply({ content: 'Hello world!' });
		const query = interaction.options.getString('welcome', true);
        const dbGuild = await this.container.db.findOne({ guildId: interaction.guildId }) || await this.container.db.create({ guildId: interaction.guildId });
        dbGuild.welcomeMessage = query;

        await dbGuild.save();

        return interaction.reply({ content: 'Welcome message set', ephemeral: true });


	}
}
