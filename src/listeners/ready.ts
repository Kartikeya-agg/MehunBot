import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type Store } from '@sapphire/framework';
import { blue, gray, green, magenta, magentaBright, white, yellow } from 'colorette';
import { Collection } from 'discord.js';
import * as https from 'https';
import cron from 'node-cron';
import {timedMessages} from "../mongo";
import { sleep } from '@sapphire/utilities';
import { fillChannels } from 'xbox';
const dev = process.env.NODE_ENV !== 'production';
const instaToken = process.env.INSTA_TOKEN;
const appId = process.env.APP_ID;
const timeMap = new Map<string, number>();
@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
	private readonly style = dev ? yellow : blue;

	public async run() {
		this.printBanner();
		this.printStoreDebugInformation();
		// await this.container.db.find({}).deleteMany();
		// await this.container.client.application?.commands.set([]);
		if (instaToken && appId) await this.monitorPosts('instagram');
		else this.container.logger.warn('Instagram token or app id not found, skipping monitoring');
		this.container.client.guilds.cache.forEach(async (guild) => {
			console.log(guild.name)
			const firstInvites = await guild.invites.fetch().catch(() => null);
			if (!firstInvites) return this.container.logger.warn(`Failed to fetch invites for ${guild.name}`);
			this.container.invites.set(guild.id, new Collection(firstInvites.map((invite) => [invite.code, invite.uses])));
		});
		await sleep(1000);
		fillChannels();
		cron.schedule("0 */1 * * *", async () => {
			const timed = await timedMessages.find({});
			if (!timed) return;

			timed.forEach((dbGuild) => {
				if (!dbGuild.messages) return;
				for (const message of dbGuild.messages) {
					const current = timeMap.get(message.channelId) || 1;
					if (current === message.time) {
						this.container.client.channels.fetch(message.channelId).then((channel) => {
							if (!channel || !channel.isSendable()) return;
							channel.send(message.message);
						});
						timeMap.set(message.channelId, 0);
					} else {
						timeMap.set(message.channelId, current + 1);
					}
				}
			});
		});
	}

	private printBanner() {
		const success = green('+');

		const llc = dev ? magentaBright : white;
		const blc = dev ? magenta : blue;

		const line01 = llc('');
		const line02 = llc('');
		const line03 = llc('');

		// Offset Pad
		const pad = ' '.repeat(7);

		console.log(
			String.raw`
${line01} ${pad}${blc('1.0.0')}
${line02} ${pad}[${success}] Gateway
${line03}${dev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim()
		);
	}

	private printStoreDebugInformation() {
		const { client, logger } = this.container;
		const stores = [...client.stores.values()];
		const last = stores.pop()!;

		for (const store of stores) logger.info(this.styleStore(store, false));
		logger.info(this.styleStore(last, true));
	}

	private styleStore(store: Store<any>, last: boolean) {
		return gray(`${last ? '└─' : '├─'} Loaded ${this.style(store.size.toString().padEnd(3, ' '))} ${store.name}.`);
	}

	private async getUserId(username: string): Promise<string> {
		const options = {
			hostname: 'graph.facebook.com',
			path: `/ig_hashtag_search?user_id=${appId}&q=${username}&access_token=${instaToken}`,
			method: 'GET'
		};
		return new Promise((resolve, reject) => {
			const req = https.request(options, (res) => {
				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {
					resolve(JSON.parse(data).data[0].id);
				});
			});
			req.on('error', (error) => {
				reject(error);
			});
			req.end();
		});
	}

	private async getLatestPost(username: string): Promise<Post> {
		const userId = await this.getUserId(username);
		const options = {
			hostname: 'graph.instagram.com',
			path: `/${userId}/media?fields=id,caption&access_token=${instaToken}`,
			method: 'GET'
		};
		return new Promise((resolve, reject) => {
			const req = https.request(options, (res) => {
				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {
					resolve(JSON.parse(data).data[0]);
				});
			});
			req.on('error', (error) => {
				reject(error);
			});
			req.end();
		});
	}

	private async monitorPosts(username: string) {
		let lastPost = await this.getLatestPost(username);
		this.container.logger.info(lastPost);
		setInterval(async () => {
			const post = await this.getLatestPost(username);
			if (post.id !== lastPost.id) {
				console.log('New post:', post);
				lastPost = post;
			}
		}, 60 * 1000); // Check every minute
	}
}
interface Post {
	id: string;
	caption: string;
}
