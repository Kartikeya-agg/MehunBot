import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { User } from '../mongo';

@ApplyOptions<Command.Options>({
	description: 'A basic slash command',
	preconditions: ['OwnerOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) =>
					option //
						.setName('name')
						.setDescription('The xbox name')
						.setRequired(true)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const name = interaction.options.getString('name', true);
		await interaction.reply(`Removing the claim for the Xbox account: ${name}`);
		const db = await User.findOne({
			displayName: {
				$regex: new RegExp(`^${name.toLowerCase()}$`, 'i')
			}
		});

		if (!db) {
			await interaction.editReply(`This Xbox account is not claimed`);
		} else {
			// Use $unset to properly remove the userId field
			await User.updateOne(
				{ _id: db._id },
				{ $unset: { userId: 1 } }
			);
			await interaction.editReply(`Successfully removed the claim for the Xbox account: ${name}`);
		}
		await interaction.followUp({
			content: `If you want to claim this account again, use the /claim command`,
			ephemeral: true
		});


	}
}
