import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import Guild, { User } from 'mongo';
import axios from 'axios';
import { container } from '@sapphire/framework';
import { TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import type { Document } from 'mongoose';
import { sleep } from '@sapphire/utilities';

dotenv.config();
interface IUser extends Document {
	oauthId: string;
	displayName: string;
	userId: string;
	xboxConnection: {
		accessToken: string;
		refreshToken: string;
		expiresAt: Date;
		xboxToken: string;
		xboxTokenExpiresAt: Date;
		xuid: string;
		gamertag: string;
	};
	currentlyPlaying: {
		gameId: string;
		title: string;
		startTime: Date;
		notified: boolean;
	}[];
}
const app = express();

app.use(express.json());
app.use(
	session({
		secret: process.env.SESSION_SECRET!,
		resave: false,
		saveUninitialized: false
	})
);
app.use(passport.initialize());
app.use(passport.session());

passport.use(
	new OAuth2Strategy(
		{
			authorizationURL: 'https://login.live.com/oauth20_authorize.srf',
			tokenURL: 'https://login.live.com/oauth20_token.srf',
			clientID: process.env.MICROSOFT_CLIENT_ID || '',
			clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
			callbackURL: process.env.CALLBACK_URL || 'https://mehoonxconnect.tech/auth/callback',
			scope: ['XboxLive.signin', 'XboxLive.offline_access']
		},
		async (accessToken, refreshToken, params, _profile, done) => {
			try {
				const xboxTokenData = await getXboxToken(accessToken);
				const xboxProfile = await getXboxProfile(xboxTokenData.token);

				let user = await User.findOne({ oauthId: xboxProfile.xuid });

				const now = new Date();
				if (!user) {
					user = new User({
						oauthId: xboxProfile.xuid,
						displayName: xboxProfile.gamertag,
						xboxConnection: {
							accessToken: accessToken,
							refreshToken: refreshToken,
							expiresAt: new Date(now.getTime() + params.expires_in * 1000),
							xboxToken: xboxTokenData.token,
							xboxTokenExpiresAt: new Date(now.getTime() + xboxTokenData.expiresIn * 1000),
							xuid: xboxProfile.xuid,
							gamertag: xboxProfile.gamertag
						},
						currentlyPlaying: []
					});
				} else {
					user.xboxConnection = {
						accessToken: accessToken,
						refreshToken: refreshToken,
						expiresAt: new Date(now.getTime() + params.expires_in * 1000),
						xboxToken: xboxTokenData.token,
						xboxTokenExpiresAt: new Date(now.getTime() + xboxTokenData.expiresIn * 1000),
						xuid: xboxProfile.xuid,
						gamertag: xboxProfile.gamertag
					};
				}

				await user.save();
				return done(null, user);
			} catch (error) {
				console.error('Authentication error:', error);
				return done(error as Error);
			}
		}
	)
);

passport.serializeUser((user, done) => {
	done(null, (user as IUser)._id);
});

passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (error) {
		done(error);
	}
});

app.get('/', (_req, res) => {
	res.send(`
    <h1>Xbox Game Tracker</h1>
    <p>Connect your Xbox account to track game activity</p>
    <a href="/auth/xbox">Connect Xbox</a>
  `);
});

app.get('/auth/xbox', passport.authenticate('oauth2'));

app.get('/auth/callback', passport.authenticate('oauth2', { failureRedirect: '/' }), (_req, res) => {
	res.redirect('/profile');
});

app.get('/profile', (req, res) => {
	if (!req.isAuthenticated()) {
		return res.redirect('/auth/xbox');
	}

	const user = req.user as IUser;
	res.json({
		displayName: user.displayName,
		xuid: user.xboxConnection.xuid,
		gamertag: user.xboxConnection.gamertag
	});
});

app.get('/logout', (req, res) => {
	req.logout((err) => {
		if (err) {
			return res.status(500).send('Error logging out');
		}
		return res.redirect('/');
	});
});

async function getXboxToken(microsoftToken: string) {
	try {
		const userAuthResponse = await axios.post('https://user.auth.xboxlive.com/user/authenticate', {
			Properties: {
				AuthMethod: 'RPS',
				SiteName: 'user.auth.xboxlive.com',
				RpsTicket: `d=${microsoftToken}`
			},
			RelyingParty: 'http://auth.xboxlive.com',
			TokenType: 'JWT'
		});

		const xstsResponse = await axios.post('https://xsts.auth.xboxlive.com/xsts/authorize', {
			Properties: {
				SandboxId: 'RETAIL',
				UserTokens: [userAuthResponse.data.Token]
			},
			RelyingParty: 'http://xboxlive.com',
			TokenType: 'JWT'
		});

		return {
			token: `XBL3.0 x=${xstsResponse.data.DisplayClaims.xui[0].uhs};${xstsResponse.data.Token}`,
			expiresIn: 86400
		};
	} catch (error) {
		console.error('Error getting Xbox token:', error);
		throw error;
	}
}

async function getXboxProfile(xboxToken: string) {
	try {
		const response = await axios.get('https://profile.xboxlive.com/users/me/profile/settings', {
			headers: {
				Authorization: xboxToken,
				'x-xbl-contract-version': '2'
			},
			params: {
				settings: 'Gamertag'
			}
		});

		const profileUser = response.data.profileUsers[0];
		const gamertag = profileUser.settings.find((s: any) => s.id === 'Gamertag').value;

		return {
			xuid: profileUser.id,
			gamertag: gamertag
		};
	} catch (error) {
		console.error('Error getting Xbox profile:', error);
		throw error;
	}
}

async function refreshTokens(user: IUser) {
	try {
		console.log(`Refreshing tokens for user: ${user.displayName}`);
		const now = new Date();

		if (user.xboxConnection.expiresAt <= now) {
			console.log('Refreshing Microsoft token');

			const refreshResponse = await axios.post(
				'https://login.live.com/oauth20_token.srf',
				new URLSearchParams({
					client_id: process.env.MICROSOFT_CLIENT_ID || '',
					client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
					refresh_token: user.xboxConnection.refreshToken,
					grant_type: 'refresh_token',
					scope: 'XboxLive.signin XboxLive.offline_access'
				}).toString(),
				{
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					}
				}
			);

			user.xboxConnection.accessToken = refreshResponse.data.access_token;
			user.xboxConnection.refreshToken = refreshResponse.data.refresh_token;
			user.xboxConnection.expiresAt = new Date(now.getTime() + refreshResponse.data.expires_in * 1000);

			const xboxTokenData = await getXboxToken(user.xboxConnection.accessToken);
			user.xboxConnection.xboxToken = xboxTokenData.token;
			user.xboxConnection.xboxTokenExpiresAt = new Date(now.getTime() + xboxTokenData.expiresIn * 1000);
		} else if (user.xboxConnection.xboxTokenExpiresAt <= now) {
			console.log('Refreshing Xbox token only');

			const xboxTokenData = await getXboxToken(user.xboxConnection.accessToken);
			user.xboxConnection.xboxToken = xboxTokenData.token;
			user.xboxConnection.xboxTokenExpiresAt = new Date(now.getTime() + xboxTokenData.expiresIn * 1000);
		}

		await user.save();
		return user;
	} catch (error) {
		console.error('Error refreshing tokens:', error);
		throw error;
	}
}

async function getCurrentActivity(user: IUser) {
	try {
		user = await refreshTokens(user);

		const response = await axios.get(`https://userpresence.xboxlive.com/users/xuid(${user.xboxConnection.xuid})`, {
			headers: {
				Authorization: user.xboxConnection.xboxToken,
				'x-xbl-contract-version': '3',
				'Accept-Language': 'en-US'
			}
		});
		console.log(response.data);
		const devices = response.data.devices || [];

		for (const device of devices) {
			const titles = device.titles || [];

			for (const title of titles) {
				console.log(title);

				if (title.state === 'Active' && title.placement === 'Full') {
					return {
						gameId: title.id,
						title: title.name,
						deviceType: device.type
					};
				}
			}
		}

		return null;
	} catch (error) {
		console.error('Error getting current activity:', error);

		return null;
	}
}

async function checkAndPostGameActivity() {
	try {
		const users = await User.find({});

		for (const user of users) {
			try {
				if (user.currentlyPlaying.length > 10) {
					console.log(`Cleaning up ${user.displayName}'s currentlyPlaying - had ${user.currentlyPlaying.length} entries`);
					user.currentlyPlaying = user.currentlyPlaying.slice(-5);
					await user.save();
				}

				const currentActivity = await getCurrentActivity(user as unknown as IUser);
				console.log(currentActivity);

				const now = new Date();

				if (currentActivity) {
					if (['Xbox App', 'Online'].includes(currentActivity.title)) continue;

					// Check if the user is already playing this game
					const existingGameIndex = user.currentlyPlaying.findIndex((game) => game.gameId === currentActivity.gameId);

					if (existingGameIndex === -1) {
						// Check if this game has been played in the last hour (even if removed from currentlyPlaying)
						const recentlyStopped = user.currentlyPlaying.find((game) => {
							// If we have a recently stopped entry for this game that's less than 1 hour old
							return (
								game.gameId === currentActivity.gameId &&
								game.notified &&
								now.getTime() - new Date(game.startTime).getTime() < 3600000
							);
						});

						if (recentlyStopped) {
							console.log(`${user.displayName} resumed playing ${currentActivity.title} within cooldown period, not notifying again`);
						} else {
							console.log(`${user.displayName} started playing ${currentActivity.title}`);

							user.currentlyPlaying.push({
								gameId: currentActivity.gameId,
								title: currentActivity.title,
								startTime: new Date(),
								notified: false
							});

							await user.save();
							console.log(`Notifying Discord for user: ${user.displayName}`);
							await postToDiscord(user as unknown as IUser, currentActivity);

							const gameIndex = user.currentlyPlaying.findIndex((game) => game.gameId === currentActivity.gameId && !game.notified);

							if (gameIndex !== -1) {
								user.currentlyPlaying[gameIndex].notified = true;
								await user.save();
							}
						}
					}
				} else {
					// Only remove games that have been inactive for more than 1 hour
					const gamesToKeep = user.currentlyPlaying.filter((game) => {
						// Keep if less than 1 hour old
						return now.getTime() - new Date(game.startTime).getTime() < 3600000;
					});

					// If the list changed, update it
					if (gamesToKeep.length !== user.currentlyPlaying.length) {
						console.log(
							`${user.displayName} has ${user.currentlyPlaying.length - gamesToKeep.length} games that passed the 1-hour cooldown`
						);
						user.currentlyPlaying = gamesToKeep;
						await user.save();
					}
				}
			} catch (userError) {
				console.error(`Error processing user ${user.displayName}:`, userError);
			}
		}
	} catch (error) {
		console.error('Error checking game activity:', error);
	} finally {
		setTimeout(checkAndPostGameActivity, 10000);
	}
}
export const channels: TextChannel[] = [];
export const xboxGames: {
	guildId: string;
	games: String[];
}[] = [];
export async function fillChannels() {
	// Clear existing channels array
	channels.length = 0;
	if (!container.client) {
		await sleep(2000);
		fillChannels();
		return;
	}
	// Fetch all guilds
	await container.client.guilds.fetch();
	const allGuilds = container.client.guilds.cache.map((guild) => guild.id);
	console.log(`Found ${allGuilds.length} guilds`);

	// Fetch Xbox channels for all guilds
	const guildDocs = await Guild.find({
		guildId: { $in: allGuilds },
		xboxChannel: { $exists: true, $ne: null }
	});

	console.log(`Found ${guildDocs.length} guilds with Xbox channels in database`);

	// Add each channel to the channels array
	for (const guildDoc of guildDocs) {
		try {
			if (!guildDoc.xboxChannel) continue;
			xboxGames.push({
				guildId: guildDoc.guildId,
				games: guildDoc.xboxGames || []
			});
			const guild = container.client.guilds.cache.get(guildDoc.guildId);
			if (!guild) continue;

			const channel = (await guild.channels.fetch(guildDoc.xboxChannel)) as TextChannel;
			if (channel && channel.isTextBased()) {
				console.log(`Added channel ${channel.name} (${channel.id}) from guild ${guild.name} to channels array`);
				channels.push(channel);
			}
		} catch (error) {
			console.error(`Error fetching channel for guild ${guildDoc.guildId}:`, error);
		}
	}

	console.log(`Successfully populated channels array with ${channels.length} channels`);
}

async function postToDiscord(user: IUser, activity: any) {
	try {
		console.log(`Total channels available: ${channels.length}`);
		const filteredChannels = channels.filter((c) => c.guild.members.cache.has(user.userId));
		console.log(`Filtered Channels for ${user.displayName}: ${filteredChannels.length}`);

		if (filteredChannels.length === 0) {
			console.log(`No channels found for user ${user.displayName} (ID: ${user.userId})`);
			return;
		}

		if (activity.title === 'Online' || activity.title === 'Xbox App') return;

		for (const channel of filteredChannels) {
			const guildFilterData = xboxGames.find((g) => g.guildId === channel.guild.id);

			// Check if filtering is enabled for this guild (list exists and is not empty)
			if (guildFilterData && guildFilterData.games.length > 0) {
				// Filtering is enabled, check if the current game is in the list (case-insensitive)
				const gameAllowed = guildFilterData.games.includes(activity.title.toLowerCase());
				if (!gameAllowed) {
					console.log(`Game ${activity.title} is NOT in the filtered list for guild ${channel.guild.name}, skipping post.`);
					continue; // Skip to the next channel
				}
				console.log(`Game ${activity.title} IS in the filtered list for guild ${channel.guild.name}, proceeding to post.`);
			} else {
				console.log(`No game filter configured or filter list is empty for guild ${channel.guild.name}, proceeding to post.`);
			}

			// If we reach here, either filtering is off, or the game is allowed
			try {
				console.log(`Posting to channel ${channel.name} in guild ${channel.guild.name}`);
				await channel.send(`**${user.displayName}** just started playing **${activity.title}**!`);
				console.log(`Successfully posted to channel ${channel.name}`);
			} catch (channelError) {
				console.error(`Error posting to channel ${channel.id}:`, channelError);
			}
		}
	} catch (error) {
		console.error('Error posting to Discord:', error);
	}
}

app.get('/check', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.status(401).send('Unauthorized');
		return;
	}

	try {
		await checkAndPostGameActivity();
		res.send('Check completed');
	} catch (error) {
		console.error('Error during manual check:', error);
		res.status(500).send('Error during check');
	}
});
app.get('/current-activity', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.status(401).send('Unauthorized');
		return;
	}

	try {
		const user = req.user as IUser;
		const activity = await getCurrentActivity(user);

		res.json({
			user: user.displayName,
			activity: activity || 'Not playing anything right now'
		});
	} catch (error) {
		console.error('Error getting current activity:', error);
		res.status(500).send('Error getting current activity');
	}
});

app.get('/cleanup', async (req, res) => {
	try {
		const users = await User.find({});
		let cleanupCount = 0;

		for (const user of users) {
			if (user.currentlyPlaying && user.currentlyPlaying.length > 5) {
				console.log(`Cleaning up ${user.displayName}'s data: ${user.currentlyPlaying.length} entries`);
				user.currentlyPlaying = [];
				await user.save();
				cleanupCount++;
			}
		}

		res.send(`Cleanup completed. Fixed ${cleanupCount} users.`);
	} catch (error) {
		console.error('Error during cleanup:', error);
		res.status(500).send('Error during cleanup');
	}
});

console.log('Starting game activity monitoring...');
// Fill channels array on startup
fillChannels()
	.then(() => {
		console.log(`Initial channel setup complete. Found ${channels.length} Xbox notification channels.`);
	})
	.catch((error) => {
		console.error('Error during initial channel setup:', error);
	});

checkAndPostGameActivity();

app.listen(5000, '0.0.0.0', () => {
	console.log(`Server running on port ${5000}`);
});
