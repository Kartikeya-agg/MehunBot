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
			// Find all users with this display name (in case there are duplicates)
			const users = await User.find({
				displayName: {
					$regex: new RegExp(`^${name.toLowerCase()}$`, 'i')
				}
			});

			if (users.length === 0) {
				await interaction.editReply(`This Xbox account is not found in the database`);
				return;
			}

			// Filter to only claimed users
			const claimedUsers = users.filter(user => user.userId);
			
			if (claimedUsers.length === 0) {
				await interaction.editReply(`This Xbox account is not currently claimed by anyone`);
				return;
			}

			// Remove claims from all matching users (in case of duplicates)
			const updateResult = await User.updateMany(
				{ 
					displayName: { $regex: new RegExp(`^${name.toLowerCase()}$`, 'i') },
					userId: { $exists: true, $ne: null }
				},
				{ 
					$unset: { userId: 1 },
					$set: { currentlyPlaying: [] }
				}
			);

			await interaction.editReply(`Successfully removed the claim for the Xbox account: ${name} (${updateResult.modifiedCount} records updated)`);
			
			// Log for debugging
			console.log(`Removed claim for ${name}: ${updateResult.modifiedCount} records modified`);
			
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