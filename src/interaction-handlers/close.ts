import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import axios from 'axios';
import mongo from "../mongo"
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	PermissionFlagsBits,
	type ButtonInteraction,
	type MessageActionRowComponentBuilder,
	ChannelType
} from 'discord.js';
import { generateMessages } from 'ticket-bot-transcript-uploader';
import zlib from 'zlib';
let domain = 'https://ticket.pm/';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		const dbGuild = await this.container.db.findOne({ guildId: interaction.guildId });
		if (!dbGuild || !dbGuild.ticketCategory) return interaction.reply({ content: this.container.messages.ticketNotSetup, ephemeral: true });
		const ticketChan = dbGuild.tickets.find((t: any) => t.channelId === interaction.channel!.id && t.open);
		if (!ticketChan) return interaction.reply({ content: this.container.messages.ticketNotFound, ephemeral: true });

		if (interaction.customId === 'close') {
			const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder().setCustomId('close_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
				new ButtonBuilder().setCustomId('close_deny').setLabel('Deny').setStyle(ButtonStyle.Danger)
			);

			const embed = new EmbedBuilder()
				.setTitle(this.container.messages.ticketCloseEmbed.title)
				.setDescription(this.container.messages.ticketCloseEmbed.description)
				.setColor('Red');

			return interaction.reply({ embeds: [embed], components: [row] });
		} else if (interaction.customId === 'close_accept') {
			await interaction.reply({ content: this.container.messages.closeMessage, ephemeral: true });
			const channel = await interaction.guild?.channels.fetch(interaction.channel!.id);
			if (!channel) return interaction.reply({ content: this.container.messages.ticketError, ephemeral: true });
			const roles = dbGuild.ticketRoles.map((r: any) => {
				return {
					id: r,
					allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
					deny: new Array()
				};
			});
			console.log(ticketChan);
			roles.push(
				{
					id: ticketChan.userId,
					deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
					allow: []
				},
				{
					id: interaction.guild!.id,
					deny: [PermissionFlagsBits.ViewChannel],
					allow: []
				}
			);

			await channel
				.edit({
					permissionOverwrites: roles
				})
				.catch(() => {
					channel.edit({
						permissionOverwrites: [
							{
								id: interaction.guild!.id,
								deny: [PermissionFlagsBits.ViewChannel]
							}
						]
					});
				});

			const messages = await fetchAll(interaction);
			const messagesJSON = await generateMessages(messages, premiumKey, 'https://m.ticket.pm');
			zlib.gzip(JSON.stringify(messagesJSON), async (err: any, compressed: any) => {
				if (err) {
					console.error(err);
				} else {
					const ts = await axios
						.post(`${domain}upload?key=${premiumKey}`, JSON.stringify(compressed), {
							headers: {
								'Content-Type': 'application/json'
							}
						})
						.catch(console.error);
					// console.log(ts);
					if (!ts) return interaction.reply({ content: this.container.messages.ticketError, ephemeral: true });
					const usertag = (await interaction.guild?.members.fetch(ticketChan.userId).catch(() => {}))?.user.tag;
					const embed = new EmbedBuilder()
						.setTitle(this.container.messages.ticketLogEmbed.title.replace('{user}', usertag || ticketChan.userId))
						.setColor(this.container.messages.ticketLogEmbed.color as any)
						.setDescription(this.container.messages.ticketLogEmbed.description.replace('{link}', `${domain}${ts.data!}`));
					const chan = await interaction.guild?.channels.fetch(dbGuild.logs).catch(() => {});
					if (!chan) return;
					if ((chan.type !== ChannelType.GuildText)) return;
					(chan).send({ embeds: [embed] }).catch(() => {});
					return;
					// close(ts.data);
				}
				return;
			});

			mongo.findOneAndUpdate({ guildId: interaction.guildId }, { $pull: { tickets: { channelId: interaction.channel!.id } } }).catch(console.error);
			return interaction.channel?.delete();
		} else {
			return interaction.reply({ content: this.container.messages.ticketCloseCancelled, ephemeral: true });
		}
	}

	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('close')) return this.none();

		return this.some();
	}
}

async function fetchAll(interaction: any) {
	let collArray = new Array();
	let lastID = interaction.channel.lastMessageID;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const fetched = await interaction.channel.messages.fetch({ limit: 100, before: lastID });
		if (fetched.size === 0) {
			break;
		}
		collArray.push(fetched);
		lastID = fetched.last().id;
		if (fetched.size !== 100) {
			break;
		}
	}
	const messages = collArray[0].concat(...collArray.slice(1));
	return messages;
}

const premiumKey = process.env.PREMIUM_KEY || '';
