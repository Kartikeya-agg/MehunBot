import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { User } from '../mongo';

@ApplyOptions<Command.Options>({
	description: 'Remove an existing claim on an Xbox account',
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
		
		try {
			// Find the specific user with this display name who is claimed
			const user = await User.findOne({
				displayName: {
					$regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
				},
				userId: { $exists: true, $ne: null }
			});

			if (!user) {
				await interaction.editReply(`This Xbox account is not currently claimed by anyone`);
				return;
			}

			// Instead of unsetting, we'll delete and recreate the user without userId
			const userData = {
				oauthId: user.oauthId,
				displayName: user.displayName,
				xboxConnection: user.xboxConnection,
				currentlyPlaying: [] // Clear current activity
			};

			// Delete the old record and create a new one without userId
			await User.deleteOne({ _id: user._id });
			await User.create(userData);

			await interaction.editReply(`Successfully removed the claim for the Xbox account: ${name}`);
			
			// Log for debugging
			console.log(`Removed claim for ${name}: User recreated without userId`);
			
			await interaction.followUp({
				content: `If you want to claim this account again, use the /claim command`,
				ephemeral: true
			});
		} catch (error) {
			console.error('Error removing claim:', error);
			await interaction.editReply(`An error occurred while removing the claim: ${error}`);
		}
	}
}