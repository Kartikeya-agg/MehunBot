import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, type MessageActionRowComponentBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Ticket setup command',
	preconditions: ['ModOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addChannelOption((option) => option.setName('channel').setDescription('The channel to post the embed').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const channel = interaction.options.getChannel('channel', true);
		if (channel.type !== ChannelType.GuildText) return interaction.reply({ content: 'Invalid channel.', ephemeral: true });
		if (!interaction.guildId || !interaction.guild || !interaction.channel || interaction.channel.type !== ChannelType.GuildText)
			return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
		const member = interaction.guild?.members.cache.get(interaction.user.id);
		if (!member?.permissions.has('Administrator')) return interaction.reply({ content: 'You need Administrator perms.', ephemeral: true });

		let dbGuild = await this.container.db.findOne({ guildId: interaction.guildId });
		if (!dbGuild) {
			dbGuild = await this.container.db.create({ guildId: interaction.guildId });
		}
		let category;
		await interaction.deferReply();
		if (!dbGuild.ticketCategory) {
			category = await interaction.guild?.channels.create({
				name: 'Tickets',
				type: ChannelType.GuildCategory,
				permissionOverwrites: [
					{
						id: interaction.guild.id,
						deny: ['ViewChannel']
					}
				]
			});
			dbGuild.ticketCategory = category.id;
			await dbGuild.save();
		} else {
			category = interaction.guild.channels.cache.get(dbGuild.ticketCategory);
			if (!category) {
				category = await interaction.guild?.channels.create({
					name: 'Tickets',
					type: ChannelType.GuildCategory,
					permissionOverwrites: [
						{
							id: interaction.guild.id,
							deny: ['ViewChannel']
						}
					]
				});
				dbGuild.ticketCategory = category.id;
				await dbGuild.save();
			}
		}

		if (!category) return interaction.reply({ content: 'Error creating category.', ephemeral: true });
		await interaction.followUp({ content: this.container.messages.mentionRoles });

		const filter = (m: any) => m.author.id === interaction.user.id;
		const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });
		//@ts-expect-error
		collector.on('collect', async (m) => {
			if (m.content.toLowerCase() === 'cancel') {
				collector.stop();
				return interaction.followUp({ content: 'Cancelled.' });
			}
			const role = interaction.guild?.roles.cache.get(m.content.replace(/[^0-9]/g, ''));
			if (!role) return interaction.followUp({ content: 'Invalid role.' });
			dbGuild?.ticketRoles.push(role.id);
			await dbGuild?.save();
			interaction.followUp({ content: `Added ${role} to ticket roles.` });

			collector.stop();

			const embed = new EmbedBuilder()
				.setTitle(this.container.messages.ticketEmbed.title)
				.setDescription(this.container.messages.ticketEmbed.description);
			try {
				embed.setColor(this.container.messages.ticketEmbed.color as any);
			} catch {
				embed.setColor('Random');
			}
			const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId('ticket')
					.setLabel(this.container.messages.ticketButton.label)
					.setStyle(1)
					.setEmoji(this.container.messages.ticketButton.emoji)
			);
			//@ts-expect-error
			const msg = await channel.send({ embeds: [embed], components: [row] });

			return interaction.followUp({ content: `Ticket setup complete.`, ephemeral: true });
		});

		return interaction.followUp({ content: 'Please mention the role you want to add to ticket roles. Type `cancel` to cancel.' });
	}
}
