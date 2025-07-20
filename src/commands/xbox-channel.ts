import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType } from 'discord.js';
import Guild from 'mongo';
import { channels, fillChannels } from 'xbox';

@ApplyOptions<Command.Options>({
	description: 'Set Xbox notification channel',
	preconditions: ['ModOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addChannelOption(
					(option) =>
						option //
							.setName('channel')
							.setDescription('The channel to set as the Xbox channel')
							.setRequired(true)
							.addChannelTypes(ChannelType.GuildText)
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
		const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText]);
		const action = interaction.options.getString('add-remove', true);
		
		await interaction.deferReply();
		
		const db = await Guild.findOne({ guildId: interaction.guildId }) || 
			new Guild({ guildId: interaction.guildId });
		
		if (action === 'add') {
			// Set the channel in the database
			db.xboxChannel = channel.id;
			await db.save();
			
			// Refill the channels array
			await fillChannels();
			
			await interaction.editReply(`Successfully set the Xbox channel to: ${channel.name}`);
		} else if (action === 'remove') {
			// Remove channel from the database
			db.xboxChannel = null;
			await db.save();
			
			// Refill the channels array
			await fillChannels();
			
			await interaction.editReply(`Successfully removed ${channel.name} as the Xbox channel`);
		}
	}
}
