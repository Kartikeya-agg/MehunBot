import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { StringSelectMenuInteraction } from 'discord.js';
import {timedMessages} from "../mongo";

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class MenuHandler extends InteractionHandler {
	public override async run(interaction: StringSelectMenuInteraction) {
		const index = interaction.values[0];
		const dbGuild = await timedMessages.findOne({guildId: interaction.guildId});
		if (!dbGuild) return interaction.editReply({content: "No database found"});
		const messages = dbGuild.messages;
		if (!messages) return interaction.editReply({content: "No messages found"});
		const message = messages[parseInt(index)];
		if (!message) return interaction.editReply({content: "No message found"});
		const indexToRemove = messages.indexOf(message);
		messages.splice(indexToRemove, 1);
		await dbGuild.save();
		return interaction.editReply({content: "Message removed"});


	}

	public override parse(interaction: StringSelectMenuInteraction) {
		if (interaction.customId !== 'remove-timed-message') return this.none();

		return this.some();
	}
}
