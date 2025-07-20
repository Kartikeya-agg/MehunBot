import mongoose from 'mongoose';
// console.log(process.env.OWNERS)
import dotenv from 'dotenv';
dotenv.config();
console.log(process.env.MONGO_URL);
if (!process.env.MONGO_URL) throw new Error('Missing Mongo URL');
const Schema = new mongoose.Schema<Guild>({
	guildId: { type: String, required: true, unique: true },
	modRoles: { type: [typeof String], required: false, default: [] },
	customMessages: { type: [{ name: String, response: String }], required: false, default: [] },
	roles: { type: [{ id: String, emoji: String }], required: false, default: [] },
	insta: { type: String, required: false, default: '' },
	blacklist: { type: [String], required: false, default: [] },
	tickets: { type: new Array<Tickets>(), required: false, default: [] },
	ticketCategory: { type: String, required: false, default: '' },
	inviteMessage: { type: String, required: false, default: '' },
	ticketRoles: { type: [String], required: false, default: [] },
	logs: { type: String, required: false, default: '' },
	tempBans: { type: new Array<tempBan>(), required: false, default: [] },
	mutedRole: { type: String, required: false, default: '' },
	muted: { type: new Array<mutedArray>(), required: false, default: [] },
	xboxChannel: { type: String, required: false, default: null },
	xboxGames: { type: [String], required: false, default: [] },
	welcomeChannel: { type: String, required: false, default: '' },
	welcomeMessage: { type: String, required: false, default: '' },
});

const relayArray = new mongoose.Schema({
	source: { type: String, required: true },
	destination: { type: String, required: true },
});

const relaySchema = new mongoose.Schema({
	guildId: { type: String, required: true, unique: true },
	relay: { type: [relayArray], required: false, default: [] },
});

const messageSchema = new mongoose.Schema({
	channelId: { type: String, required: true },
	message: { type: String, required: true },
	time: { type: Number, required: true },
});

const timedMessage = new mongoose.Schema({
	guildId: { type: String, required: true, unique: true },
	messages: { type: [messageSchema], required: false, default: [] },
});

const stickyMessage = new mongoose.Schema({
	channelId: { type: String, required: true },
	message: { type: String, required: true },
	frequency: { type: Number, required: true },
});

const stickyMessagesSchema = new mongoose.Schema({
	guildId: { type: String, required: true, unique: true },
	messages: { type: [stickyMessage], required: false, default: [] },
});

mongoose.connect(process.env.MONGO_URL).then(async () => {
	await Guild.init();
	console.log('Connected to MongoDB');
});
const stickyMessages = mongoose.model('StickyMessages', stickyMessagesSchema);
const Guild = mongoose.model('Guild', Schema);
const relay = mongoose.model('Relay', relaySchema);
export const timedMessages = mongoose.model('TimedMessages', timedMessage);
export default Guild;
export { relay, stickyMessages };
interface customMsg {
	name: string;
	response: string;
}

interface mutedArray {
	id: string;
	time: number;
	roles: Array<String>;
}

interface tempBan {
	id: string;
	time: number;
}

interface roles {
	id: string;
	emoji: string;
}

interface Guild {
	welcomeMessage: string;
	welcomeChannel: string;
	muted: Array<mutedArray>;
	mutedRole: string;
	guildId: string;
	modRoles: Array<String>;
	customMessages: Array<customMsg>;
	roles: Array<roles>;
	insta: string;
	blacklist: Array<String>;
	tickets: Array<Tickets>;
	ticketCategory: string;
	ticketRoles: Array<String>;
	inviteMessage: string;
	logs: string;
	xboxChannel?: string | null;
	xboxGames: Array<String>;
	tempBans: Array<tempBan>;
}

interface Tickets {
	channelId: string;
	userId: string;
	open: boolean;
}

interface Football {
	name: string;
	fixtures: Array<String>;
	fixturechannels: Array<String>;
}

const FootballSchema = new mongoose.Schema<Football>({
	name: { type: String, required: true, default: '1' },
	fixtures: { type: [String], required: false, default: [] },
	fixturechannels: { type: [String], required: false, default: [] },
})

const Football = mongoose.model('Football', FootballSchema);

export { Football };

const UserSchema = new mongoose.Schema({
	oauthId: { type: String, required: true, unique: true },
	displayName: { type: String, required: true },
	userId: { type: String, required: false, unique: true },
	xboxConnection: {
		accessToken: { type: String, required: true },
		refreshToken: { type: String, required: true },
		expiresAt: { type: Date, required: true },
		xboxToken: { type: String, required: true },
		xboxTokenExpiresAt: { type: Date, required: true },
		xuid: { type: String, required: true },
		gamertag: { type: String, required: true }
	},
	currentlyPlaying: [
		{
			gameId: { type: String, required: true },
			title: { type: String, required: true },
			startTime: { type: Date, default: Date.now },
			notified: { type: Boolean, default: false }
		}
	],
});

const User = mongoose.model('User', UserSchema);

export { User }