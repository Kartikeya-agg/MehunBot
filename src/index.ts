import dotenv from 'dotenv';
dotenv.config();
// console.log(res)
import { LogLevel, SapphireClient, container } from '@sapphire/framework';
import { Collection, GatewayIntentBits, Partials } from 'discord.js';
import Guild from './mongo';
import './lib/setup';
import "./xbox";
import "./football"
import messages from './messages';
import { GiveawaysManager } from 'discord-giveaways';
export class ExtendedClient extends SapphireClient {
	public constructor() {
		super({
			defaultPrefix: '!',
			regexPrefix: /^(hey +)?bot[,! ]/i,
			caseInsensitiveCommands: true,
			logger: {
				level: LogLevel.Debug
			},
			shards: 'auto',
			//@ts-expect-error
			intents: [
				...Object.values(GatewayIntentBits)
			],
			partials: [Partials.Channel],
			loadMessageCommandListeners: true
		});
	}
	public override async login(token?: string) {
		container.db = await Guild;
		container.messages = messages;
		container.invites = new Collection();
		container.giveaways = new GiveawaysManager(this, {
			storage: './giveaways.json',
			default: {
				botsCanWin: false,
				embedColor: messages.color as any,
				reaction: '🎉',
				lastChance: {
					enabled: true,
					content: messages.lastChance,
					threshold: 10000,
					embedColor: messages.color as any
				}
			}
		});
		this.logger.info('Logged in');
		return super.login(token);
	}
}

const client = new ExtendedClient();
const main = async () => {
	try {
		client.logger.info('Logging in');
		await client.login();
		client.logger.info('logged in');

	} catch (error) {
		client.logger.fatal(error);
		client.destroy();
		process.exit(1);
	}
};

main();

declare module '@sapphire/pieces' {
	interface Container {
		db: typeof Guild; // Replace this with the connection type of your database library
		messages: typeof messages;
		giveaways: GiveawaysManager;
		invites: Collection<string, Collection<string, number | null>>;
	}
}

export default client;