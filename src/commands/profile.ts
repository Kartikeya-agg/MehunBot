import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { fetch, FetchResultTypes } from '@sapphire/fetch';
@ApplyOptions<Command.Options>({
	description: 'Profile command'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) => option.setName('string').setDescription('XBOX username').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const string = interaction.options.getString('string', true);
		await interaction.deferReply();
		const r: any = await fetch(
			`https://xbl.io/api/v2/search/${string}`,
			{
				headers: {
					'X-Authorization': process.env.XBOX_API_KEY!
				}
			},
			FetchResultTypes.JSON
		);
		const xuid = r.people[0].xuid || null;
		if (!xuid) return interaction.editReply({ content: 'No user found' });
		const profile: any = await fetch(
			`https://xbl.io/api/v2/player/summary/${xuid}`,
			{
				headers: {
					'X-Authorization': process.env.XBOX_API_KEY!
				}
			},
			FetchResultTypes.JSON
		);
		const data = profile.people[0] || null;
		if (!data) return interaction.editReply({ content: 'No user found' });

		const data2: any = await fetch(
			`https://xbl.io/api/v2/player/titleHistory/${xuid}`,
			{
				headers: {
					'X-Authorization': process.env.XBOX_API_KEY!,
					'Accept-Language': 'en-US'
				},
				method: 'GET'
			},
			FetchResultTypes.JSON
		);

		// console.log(data2);

		const lastPlayed = data2.titles[0] || null;

		const embed = new EmbedBuilder()
			.setTitle(data.displayName)
			.setThumbnail(data.displayPicRaw)
			.setFooter({
				text: `XUID: ${data.xuid}`
			})
			.setColor(data.preferredColor.primaryColor);
		if (lastPlayed) {
			embed.setDescription(
				`**Gamerscore**: ${data.gamerscore || 0}\n\n**Reputation**: ${data.xboxOneRep}\n\n**Followers**: ${
					data.follower || 0
				}\n\n**Last game played**: ${lastPlayed.name} ${
					lastPlayed.titleHistory.lastTimePlayed ? new Date(lastPlayed.titleHistory.lastTimePlayed).toLocaleString() : 'Unknown'
				}`
			);
		} else
			embed.setDescription(
				`**Gamerscore**: ${data.gamerscore || 0}\n\n**Reputation**: ${data.xboxOneRep}\n\n**Followers**: ${data.follower || 0}`
			);

		return interaction.editReply({ embeds: [embed] });
	}
}
