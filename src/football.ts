import fetch from 'node-fetch';
import { Football } from './mongo';
import client from './index';
import { EmbedBuilder, GuildChannel, type GuildBasedChannel } from 'discord.js';
interface i {
	fixtureId: number,
	goalHome: number | null | undefined,
	goalAway: number | null | undefined
}
//Date format: YYYY-MM-DD
const localcache = new Array<i>();
function getLatestDate() {

	const date = new Date();
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	//If date is 2, make it 02
	const newDay = day < 10 ? '0' + day : day;
	const newmonth = month < 10 ? "0" + month : month;
	const today = `${year}-${newmonth}-${newDay}`;
	return today;
}
	const fetchFixtures = async () => {
		const date = getLatestDate();
		// console.log(date);
		
	const res = await fetch('https://v3.football.api-sports.io/fixtures?season=2023&date=' + date, {
		headers: {
			'x-apisports-key': process.env.FOOTBALL_API_KEY!
		}
	});
	const data = await res.json();
	// console.log(data);
	
	return data.response;
};
const predict = async (fixtureID: string) => {
	const res = await (await fetch('https://v3.football.api-sports.io/predictions?fixture=' + fixtureID, {
		headers: {
			'x-apisports-key': process.env.FOOTBALL_API_KEY!
		}
	})).json();
	if (res.response.length === 0) return {
		winner: 'Unknown',
		advice: 'Unknown',
		percenthome: 'Unknown',
		percentaway: 'Unknown',
		percentdraw: 'Unknown'
	};
	return {
		winner: res.response[0].predictions.winner.name,
		advice: res.response[0].predictions.advice,
		percenthome: res.response[0].predictions.percent.home,
		percentaway: res.response[0].predictions.percent.away,
		percentdraw: res.response[0].predictions.percent.draw
	};
};

const sendEmbedMessage = async (fixture: Response, channels: string[], first: boolean = false) => {
	if (![39, 135, 61, 78, 140, 40].includes(fixture.league.id)) return // console.log(fixture.league.id);
	if ((!fixture.goals.away && !fixture.goals.home) || (fixture.goals.away === 0 && fixture.goals.home === 0)) return;
	const fix = (await Football.findOne({ name: '1' })) || (await Football.create({ name: '1' }));
	if (localcache.find(r => r.fixtureId === fixture.fixture.id && r.goalHome === fixture.goals.home && r.goalAway === fixture.goals.away)) return;
	if (fix.fixtures?.find((r) => r == fixture.fixture.id.toString())) return;
	const result = await predict(fixture.fixture.id.toString());
	localcache.push({
		fixtureId: fixture.fixture.id,
		goalHome: fixture.goals.home,
		goalAway: fixture.goals.away
	});
	if (first) return;
	const embed = new EmbedBuilder()
		.setTitle(`${fixture.teams.home.name} vs ${fixture.teams.away.name}`)
		.setDescription(`Fixture ID: ${fixture.fixture.id}\nTimestamp: <t:${fixture.fixture.timestamp}:F>`)
		.setColor(0x5865f2)
		.setImage(fixture.league.logo)
		.addFields(
			{
				name: 'Status',
				value: fixture.fixture.status.long,
				inline: true
			},
			{
				name: 'Goals',
				value: `${fixture.goals.home || 0} - ${fixture.goals.away || 0}`,
				inline: true
			},
			{
				name: 'Winner',
				value: result.winner || 'Unknown',
				inline: true
			},
			{
				name: 'Advice',
				value: result.advice || 'Unknown',
				inline: false
			},
			{
				name: 'Percent Home',
				value: result.percenthome || 'Unknown',
				inline: true
			},
			{
				name: 'Percent Away',
				value: result.percentaway || 'Unknown',
				inline: true
			},
			{
				name: 'Percent Draw',
				value: result.percentdraw || 'Unknown',
				inline: true
			}
		);

	for (const channelId of channels) {
		// if (channelId !== "1113144770366292078") continue;
		// console.log(`Sending fixture ${fixture.fixture.id} to channel ${channelId}`);
		let channel: GuildBasedChannel | null;
		client.guilds.cache.forEach(async (guild) => {
			let potentialChannel = guild.channels.cache.get(channelId);
			if (potentialChannel) {
				channel = potentialChannel;
				if (channel && channel.isTextBased()) {
					await channel.send({ embeds: [embed] });
				}
			}
		});

	}

			if (fixture.fixture.status.short === "FT") {
				fix.fixtures ? fix.fixtures.push(fixture.fixture.id.toString()) : (fix.fixtures = [fixture.fixture.id.toString()]);	
				await fix.save();
			}
};

async function fixture(first = false) {
	fetchFixtures().then(async (response) => {
		if (response.length === 0) return // console.log('No fixtures found');
		// console.log(`Found ${response.length} fixtures`);
		
		if (first) {
			// await Football.deleteMany({});
			// process.exit()
			const fixtures = await Football.findOne({ name: '1' });
			// console.log(`Found ${fixtures?.fixtures.length} fixtures in database`);
			//Difference between fixtures in database and fixtures in API response
			const difference = response.filter((x: any) => !fixtures?.fixtures.find((y) => y === x.fixture.id.toString())).map((x: any) => x.fixture.id.toString());
			// console.log(`Difference: ${difference?.length}`);
			
			//Add difference to database
			// if (difference?.length) {
			// 	const fix = (await Football.findOne({ name: '1' })) || (await Football.create({ name: '1' }));
			// 	// console.log(`Adding fixtures ${difference.length} to database`);
			// 	fix.fixtures ? fix.fixtures.push(...difference) : (fix.fixtures = [...difference]);
			// 	// console.log(fix.fixtures.length);
			// 	await fix.save();
			// }
			//wait 5 seconds 
			await new Promise((resolve) => setTimeout(resolve, 5000));
			//Check the difference between the API response and the database
			const fixtures2 = await Football.findOne({ name: '1' });
			// console.log(`Found ${fixtures2?.fixtures.length} fixtures in database`);
			const difference2 = response.filter((x: any) => !fixtures2?.fixtures.find((y) => y === x.fixture.id.toString()));
			// console.log(`Difference: ${difference2.length}`);
		} else {
		for (const fixture of response) {
			const fix = (await Football.findOne({ name: '1' })) || (await Football.create({ name: '1' }));
			
			// if (fix.fixtures?.find((r) => r == fixture.fixture.id.toString())) continue;
			// console.log(`Adding fixture ${fixture.fixture.id} to database`);
			// fix.fixtures ? fix.fixtures.push(fixture.fixture.id.toString()) : (fix.fixtures = [fixture.fixture.id.toString()]);
			// console.log(fix.fixtures.length);
			
			// await fix.save();

			const channels = fix?.fixturechannels || [];
			// console.log(`Channels: ${channels.length}`);
			
			if (channels.length === 0) continue;
			
			// if (first) return;
			// console.log(`Sending fixture ${fixture.fixture.id} to ${channels.length} channels`);

			await sendEmbedMessage(fixture, channels as string[], first);
		}
	}
	});
}

let first = true;

setInterval(() => {
	// console.log('Fetching fixtures');

	fixture(first);
	first = false;
}, 1000 * 60 * 15);

interface Response {
	fixture: Fixture;
	league: League;
	teams: Teams;
	goals: Goals;
	score: Score;
}

interface Fixture {
	id: number;
	referee: string | null;
	timezone: string;
	date: string;
	timestamp: number;
	periods: Periods;
	venue: Venue | null;
	status: Status;
}

interface Periods {
	first: number | null;
	second: number | null;
}

interface Venue {
	id: number | null;
	name: string | null;
	city: string | null;
}

interface Status {
	long: string;
	short: string;
	elapsed: number | null;
}

interface League {
	id: number;
	name: string;
	country: string;
	logo: string;
	flag: string;
	season: number;
	round: string;
}

interface Teams {
	home: TeamDetails;
	away: TeamDetails;
}

interface TeamDetails {
	id: number;
	name: string;
	logo: string;
	winner?: boolean | null; // winner property is optional
}

interface Goals {
	home?: number | null; // home and away properties are optional
	away?: number | null;
}

interface Score {
	halftime: Goals;
	fulltime: Goals;
	extratime?: Goals; // extratime and penalty properties are optional
	penalty?: Goals;
}