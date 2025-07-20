import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, EmbedBuilder } from 'discord.js';
import ms from 'ms';

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
				.addUserOption((option) => option.setName('user').setDescription('The user to ban').setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('The reason for the ban').setRequired(false))
				.addStringOption((option) => option.setName('duration').setDescription('The duration of the ban').setRequired(false))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// return interaction.reply({ content: 'Hello world!' });
		if (!interaction.guild) return interaction.reply({ content: this.container.messages.guildOnly, ephemeral: true });
		const user = interaction.options.getUser('user', true);
		const reason = interaction.options.getString('reason', false);
		const duration = interaction.options.getString('duration', false);
		let parsedTime;
		if (duration) ms(duration);
		if (duration && !parsedTime) return interaction.reply({ content: this.container.messages.invalidDuration, ephemeral: true });
		const member = await interaction.guild.members.fetch(user.id);
		const interactionMember = await interaction.guild.members.fetch(interaction.user.id);
		if (!member) return interaction.reply({ content: 'This user is not in the server.', ephemeral: true });
		if (member.roles.highest.position >= interactionMember.roles.highest.position)
			return interaction.reply({ content: 'You cannot ban this user.', ephemeral: true });

		await interaction.guild.members.ban(user, { reason: reason || 'No reason provided' }).catch((e) => {
			return interaction.reply({ content: e, ephemeral: true });
		});
		await interaction.reply({
			content: this.container.messages.banSuccess.replace(/{user}/g, user.tag).replace(/{user.id}/g, user.id),
			ephemeral: true
		});

		const guildDB = await this.container.db.findOne({ guildId: interaction.guild.id });
		if (!guildDB) return this.container.db.create({ guildId: interaction.guild.id });
		if (parsedTime) {
			guildDB.tempBans.push({
				id: user.id,
				time: parsedTime
			});
			await guildDB.save();

			setTimeout(async () => {
				await interaction.guild?.members.unban(user, 'Temporary ban expired');
				guildDB.tempBans = guildDB.tempBans.filter((ban) => ban.id !== user.id);
				await guildDB.save();
			}, parsedTime);
		}
		if (!guildDB.logs) return;

		const channel = interaction.guild.channels.cache.get(guildDB.logs);
		if (!channel || channel.type !== ChannelType.GuildText) return;
		const embed = new EmbedBuilder()
			.setColor('Red')
			.setFooter({
				text: `User ID: ${user.id}`,
				iconURL: user.displayAvatarURL({ extension: 'png' })
			})
			.setDescription(
				`**Member:** ${user.tag} (${user.id})\n**Action:** Ban\n**Reason:** ${reason || 'No reason provided'}\n**Duration:** ${
					duration || 'Permanent'
				}\n**Moderator:** ${interaction.user.tag} (${interaction.user.id})`
			)
			.setTimestamp();

		await channel.send({ embeds: [embed] });

		return;
	}
}
