import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { User } from '../mongo';

@ApplyOptions<Command.Options>({
	description: 'Check the claim status of an Xbox account',
	preconditions: ['OwnerOnly']
})
export class CheckClaimCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) =>
					option //
						.setName('name')
						.setDescription('The xbox name to check')
						.setRequired(true)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const name = interaction.options.getString('name', true);
		await interaction.reply(`Checking claim status for Xbox account: ${name}`);
		
		try {
			const users = await User.find({
				displayName: {
					$regex: new RegExp(`^${name.toLowerCase()}$`, 'i')
				}
			});

			if (users.length === 0) {
				await interaction.editReply(`No Xbox account found with name: ${name}`);
				return;
			}

			let response = `Found ${users.length} user(s) with name "${name}":\n\n`;
			
			users.forEach((user, index) => {
				response += `**User ${index + 1}:**\n`;
				response += `- Display Name: ${user.displayName}\n`;
				response += `- Xbox ID (XUID): ${user.oauthId}\n`;
				response += `- Claimed by Discord User: ${user.userId || 'Not claimed'}\n`;
				response += `- Currently Playing: ${user.currentlyPlaying?.length || 0} games\n`;
				if (user.currentlyPlaying && user.currentlyPlaying.length > 0) {
					user.currentlyPlaying.forEach(game => {
						response += `  - ${game.title} (since ${game.startTime})\n`;
					});
				}
				response += '\n';
			});

			await interaction.editReply(response);
		} catch (error) {
			console.error('Error checking claim:', error);
			await interaction.editReply(`An error occurred while checking the claim: ${error}`);
		}
	}
}