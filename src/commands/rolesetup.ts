import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, ActionRowBuilder, type MessageActionRowComponentBuilder, ButtonBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'A basic slash command',
	preconditions: ['GuildTextOnly', 'ModOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) =>
					option
						.setName('action')
						.setDescription('The action to perform')
						.setRequired(true)
						.addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }, { name: 'Embed', value: 'embed' }, { name: "removeall", value: 'removeall' })
				)
				.addRoleOption((option) => option.setName('role').setDescription('The role to add or remove').setRequired(true))
				.addStringOption((option) => option.setName('emoji').setDescription('The emoji to add').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.guild) return interaction.reply({ content: this.container.messages.guildOnly, ephemeral: true });
		const member = interaction.guild.members.cache.get(interaction.user.id);
		if (!member?.permissions.has('Administrator')) return interaction.reply({ content: this.container.messages.noPermission, ephemeral: true });
		let dbGuild = await this.container.db.findOne({ guildId: interaction.guild.id });
		if (!dbGuild) dbGuild = await this.container.db.create({ guildId: interaction.guild.id });
		const action = interaction.options.getString('action', true);
		if (action === 'removeall') {
			dbGuild.roles = [];
			await dbGuild.save();
			return interaction.reply({ content: 'All roles removed', ephemeral: true });
		} else if (action === 'add') {
			const role = interaction.options.getRole('role');
			const emoji = interaction.options.getString('emoji');
			if (!role || !emoji) return interaction.reply({ content: 'Please provide a role and emoji', ephemeral: true });
			const dbRole = dbGuild.roles.find((r) => r.id === role.id);
			if (dbRole) {
				dbRole.emoji = emoji;
				await dbGuild.save();
				return interaction.reply({ content: 'Role updated', ephemeral: true });
			} else {
				dbGuild.roles.push({ id: role.id, emoji });
				await dbGuild.save();
				return interaction.reply({ content: 'Role added', ephemeral: true });
			}
		} else if (action === 'remove') {
			const role = interaction.options.getRole('role');
			if (!role) return interaction.reply({ content: 'Please provide a role', ephemeral: true });
			const dbRole = dbGuild.roles.find((r) => r.id === role.id);
			if (!dbRole) return interaction.reply({ content: 'Role not found', ephemeral: true });
			const index = dbGuild.roles.findIndex((r) => r.id === role.id);
			dbGuild.roles.splice(index, 1);
			await dbGuild.save();
			return interaction.reply({ content: 'Role removed', ephemeral: true });
		} else if (action === 'embed') {
			const roles = dbGuild.roles.map((r) => `${r.emoji} - <@&${r.id}>`);
			const embed = new EmbedBuilder()
				.setTitle(this.container.messages.roleEmbed.title)
				.setDescription(this.container.messages.roleEmbed.description + '\n\n' + roles.join('\n'));
			try {
				embed.setColor(this.container.messages.roleEmbed.color as ColorResolvable);
			} catch (error) {
				embed.setColor('Random');
			}
			const rows = new Array<ActionRowBuilder<MessageActionRowComponentBuilder>>();
			let row = new ActionRowBuilder<MessageActionRowComponentBuilder>();

			for (let i = 0; i < roles.length; i++) {
				if (i % 5 === 0 && i !== 0) {
					rows.push(row);
					row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
				}
				const role = dbGuild.roles[i];
				row.addComponents(
					new ButtonBuilder()
						.setCustomId(`role_` + role.id)
						.setLabel(role.emoji)
						.setStyle(1)
				);
			}

			rows.push(row);
			await interaction.reply({ content: 'Role Embed', ephemeral: true });

			return interaction.channel!.send({ embeds: [embed], components: rows });
		} else return interaction.reply({ content: 'Invalid action', ephemeral: true });
	}
}
