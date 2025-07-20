import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { stickyMessages } from '../mongo';

interface StickyMessage {
	message: string;
	frequency: number;
	count: number;
}

const messages = new Map<string, StickyMessage[]>();
const messageCounts = new Map<string, number>();
const oldMessages = new Map<string, Message>();

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate,
	once: false,
	enabled: true,
})
export class UserEvent extends Listener {

	// public override async onLoad() {
	// 	this.container.logger.info(`${this.name} loaded, watching for messages.`);
	// 	try {
	// 		await this.loadStickyMessages();
	// 	} catch (error) {
	// 		this.container.logger.error('Failed to load sticky messages:', error);
	// 	}
	// }

	public override async run(message: Message) {
		if (messages.size === 0) await this.loadStickyMessages();

		this.container.logger.info(`Message received in ${message.channel.id}`);
		if (message.author.bot) return;
		const channelId = message.channel.id;
		const stickyMessages = messages.get(channelId);
		if (!stickyMessages) return;

		// Update message count
		const messageCount = (messageCounts.get(channelId) || 0) + 1;
		messageCounts.set(channelId, messageCount);

		// Check if any sticky message needs to be updated
		for (const stickyMessage of stickyMessages) {
			if (messageCount >= stickyMessage.frequency) {
				await this.updateStickyMessage(channelId, stickyMessage.message);
				messageCounts.set(channelId, 0); // Reset count after sending sticky message
				break;
			}
		}
	}

	private async loadStickyMessages() {
		try {
			const dbGuilds = await stickyMessages.find();
			messages.clear();
			for (const guild of dbGuilds) {
				if (!guild.messages) continue;
				for (const msg of guild.messages) {
					const channelMessages = messages.get(msg.channelId) || [];
					channelMessages.push({
						message: msg.message,
						frequency: msg.frequency,
						count: 0,
					});
					this.container.logger.info(`Loaded sticky message for channel ${msg.channelId}`);
					messages.set(msg.channelId, channelMessages);
				}
			}
		} catch (error) {
			this.container.logger.error('Failed to load sticky messages:', error);
		}
	}

	private async updateStickyMessage(channelId: string, messageContent: string) {
		try {
			const channel = this.container.client.channels.cache.get(channelId);
			if (!channel || !channel.isTextBased()) return;

			const lastMessage = oldMessages.get(`${channelId}-${messageContent}`);
			if (lastMessage) {
				try {
					await lastMessage.delete();
				} catch (error) {
					this.container.logger.warn(`Failed to delete old message in channel ${channelId}:`, error);
				}
			}

			const newMessage = await channel.send(messageContent);
			oldMessages.set(`${channelId}-${messageContent}`, newMessage);
		} catch (error) {
			this.container.logger.error(`Failed to update sticky message in channel ${channelId}:`, error);
		}
	}
}

export function addStickyMessage(channelId: string, message: string, frequency: number) {
	const channelMessages = messages.get(channelId) || [];
	channelMessages.push({
		message,
		frequency,
		count: 0,
	});
	messages.set(channelId, channelMessages);
}

export function removeStickyMessage(channelId: string, message: string) {
	const channelMessages = messages.get(channelId) || [];
	const newMessages = channelMessages.filter((msg) => msg.message !== message);
	messages.set(channelId, newMessages);
}
