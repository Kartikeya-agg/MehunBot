import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		const role = interaction.guild?.roles.cache.get(interaction.customId.split('_')[1]);
		const member = interaction.guild?.members.cache.get(interaction.user.id);
		if (!role) return interaction.reply({ content: 'Something went wrong!', ephemeral: true });
		if (!member) return interaction.reply({ content: 'Something went wrong!', ephemeral: true });
		if (member.roles.cache.has(role.id)) {
			member.roles.remove(role);
			return interaction.reply({ content: `Removed ${role.name} from you!`, ephemeral: true });
		} else {
			member.roles.add(role);
			return interaction.reply({ content: `Added ${role.name} to you!`, ephemeral: true });
		}
	}

	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('role_')) return this.none();

		return this.some();
	}
}
