import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import Guild from 'mongo';
import { xboxGames } from 'xbox';

@ApplyOptions<Command.Options>({
	description: 'A basic slash command',
	preconditions: ['ModOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) =>
					//Game Name
					option //
						.setName('game')
						.setDescription('The name of the game to add to the list')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option //
						.setName('add-remove')
						.setDescription('Add or remove the channel from the list')
						.setRequired(true)
						.addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' })
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const game = interaction.options.getString('game', true).toLowerCase();
		const action = interaction.options.getString('add-remove', true);
		await interaction.deferReply();
		const db =
			(await Guild.findOne({
				guildId: interaction.guildId
			})) || new Guild({ guildId: interaction.guildId });
		
		// Initialize xboxGames array if it doesn't exist
		if (!db.xboxGames) {
			db.xboxGames = [];
		}

		if (action === 'add') {
			if (db.xboxGames.includes(game)) {
				await interaction.editReply(`This game is already added in filtered games`);
			} else {
				db.xboxGames.push(game);
				await db.save();
				
				// Update the in-memory xboxGames array
				const guildIndex = xboxGames.findIndex(g => g.guildId === interaction.guildId);
				if (guildIndex === -1) {
					xboxGames.push({ guildId: interaction.guildId!, games: [game] });
				} else {
					if (!xboxGames[guildIndex].games.includes(game)) {
						xboxGames[guildIndex].games.push(game);
					}
				}
				
				await interaction.editReply(`Successfully added the game: ${game}`);
			}
		} else if (action === 'remove') {
			if (db.xboxGames.includes(game)) {
				// Remove the game from the database
				const gameIndex = db.xboxGames.indexOf(game);
				if (gameIndex > -1) {
					db.xboxGames.splice(gameIndex, 1);
					await db.save();
					
					// Remove from the in-memory xboxGames array
					const guildIndex = xboxGames.findIndex(g => g.guildId === interaction.guildId);
					if (guildIndex !== -1) {
						const gameIdx = xboxGames[guildIndex].games.indexOf(game);
						if (gameIdx > -1) {
							xboxGames[guildIndex].games.splice(gameIdx, 1);
						}
					}
					
					await interaction.editReply(`Successfully removed the game: ${game}`);
				}
			} else {
				await interaction.editReply(`This game is not in the filtered games list`);
			}
		}
	}
}