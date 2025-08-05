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

			// Check if there are any existing unclaimed users with the same oauthId
			const existingUnclaimed = await User.findOne({
				oauthId: user.oauthId,
				$or: [
					{ userId: { $exists: false } },
					{ userId: null }
				]
			});

			if (existingUnclaimed) {
				// If there's already an unclaimed version, just delete the claimed one
				await User.deleteOne({ _id: user._id });
				// Clear the existing unclaimed user's activity
				await User.updateOne(
					{ _id: existingUnclaimed._id },
					{ $set: { currentlyPlaying: [] } }
				);
			} else {
				// Create new unclaimed user by updating the existing one
				await User.updateOne(
					{ _id: user._id },
					{ 
						$unset: { userId: "" },
						$set: { currentlyPlaying: [] }
					}
				);
			}

			await interaction.editReply(`Successfully removed the claim for the Xbox account: ${name}`);
			
			// Log for debugging
			console.log(`Removed claim for ${name}: User unclaimed successfully`);
			
			await interaction.followUp({
				content: `If you want to claim this account again, use the /claim command`,
				ephemeral: true
			});
		} catch (error: any) {
			console.error('Error removing claim:', error);
			
			// If it's still a duplicate key error, try a different approach
			if (error.message.includes('E11000') && error.message.includes('userId')) {
				try {
					// Find and delete ALL records with null userId first
					await User.deleteMany({ userId: null });
					
					// Now try to unclaim the user again
					await User.updateOne(
						{
							displayName: {
								$regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
							},
							userId: { $exists: true, $ne: null }
						},
						{ 
							$unset: { userId: "" },
							$set: { currentlyPlaying: [] }
						}
					);
					
					await interaction.editReply(`Successfully removed the claim for the Xbox account: ${name} (after cleanup)`);
				} catch (secondError) {
					await interaction.editReply(`Failed to remove claim even after cleanup: ${secondError}`);
				}
			} else {
				await interaction.editReply(`An error occurred while removing the claim: ${error}`);
			}
		}
	}
}