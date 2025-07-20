import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {
	PermissionFlagsBits,
	ChannelType,
	type ButtonInteraction,
	EmbedBuilder,
	ActionRowBuilder,
	type MessageActionRowComponentBuilder,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		const dbGuild = await this.container.db.findOne({ guildId: interaction.guildId });
		if (!dbGuild) return interaction.reply({ content: this.container.messages.ticketNotSetup, ephemeral: true });
		if (!dbGuild.ticketCategory) return interaction.reply({ content: this.container.messages.ticketNotSetup, ephemeral: true });
		if (dbGuild.tickets.find((t: any) => t.userId === interaction.user.id && t.open))
			return interaction.reply({ content: this.container.messages.ticketAlreadyOpen, ephemeral: true });
		const roles = dbGuild.ticketRoles.map((r: any) => {
			return {
				id: r,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
				deny: new Array()
			};
		});
		roles.push(
			{
				id: interaction.user.id,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
				deny: []
			},
			{
				id: interaction.guild!.id,
				deny: [PermissionFlagsBits.ViewChannel],
				allow: []
			}
		);
		const channel = await interaction.guild?.channels
			.create({
				name: `ticket-${interaction.user.username}`,
				type: ChannelType.GuildText,
				parent: dbGuild.ticketCategory,
				permissionOverwrites: roles
			})
			.catch(this.container.logger.warn);
		if (!channel) return interaction.reply({ content: this.container.messages.ticketError, ephemeral: true });
		dbGuild.tickets.push({
			channelId: channel.id,
			userId: interaction.user.id,
			open: true
		});
		await dbGuild.save();
		const embed = new EmbedBuilder()
			.setTitle(this.container.messages.ticketWelcomeEmbed.title)
			.setDescription(this.container.messages.ticketWelcomeEmbed.description);
		try {
			embed.setColor(this.container.messages.ticketWelcomeEmbed.color as any);
		} catch {
			embed.setColor('Random');
		}
		const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId('close')
				.setLabel(this.container.messages.ticketWelcomeEmbed.button)
				.setStyle(ButtonStyle.Danger)
				.setEmoji(this.container.messages.ticketWelcomeEmbed.emoji)
		);
		await channel.send({ embeds: [embed], components: [row] });
		return interaction.reply({ content: this.container.messages.ticketCreated.replace(/{channel}/g, `<#${channel.id}>`), ephemeral: true });
	}
	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'ticket') return this.none();

		return this.some();
	}
}
