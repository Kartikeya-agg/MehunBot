import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { User } from 'mongo';

@ApplyOptions<Command.Options>({
	description: 'A basic slash command'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) =>
					option //
						.setName('xbox-name')
						.setDescription('The name of the Xbox account')
						.setRequired(true)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const xboxName = interaction.options.getString('xbox-name', true);
		await interaction.reply(`Claiming the Xbox account: ${xboxName}`);

		const db = await User.findOne({
			displayName: {
				$regex: new RegExp(`^${xboxName.toLowerCase()}$`, 'i')
			}
		});

		if (db && db.userId) {
			await interaction.editReply(`This Xbox account is already claimed by <@${db.userId}>`);
		} else {
			const newUser = !db ? new User({
				displayName: xboxName,
				discordTag: interaction.user.tag,
				discordId: interaction.user.id
			}) : db;
			newUser.userId = interaction.user.id;
			await newUser.save();
			await interaction.editReply(`Successfully claimed the Xbox account: ${xboxName}`);
		}


	}
}
