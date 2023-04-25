const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const NEW_STORIES_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const ITEM_URL = 'https://hacker-news.firebaseio.com/v0/item/';

const TODAY = new Date();
const YESTERDAY = new Date( TODAY.getTime() - (24 * 60 * 60 * 1000) );

async function fetchNewestStories() {
	try {
		const response = await axios.get(NEW_STORIES_URL);
		const newStoryIds = response.data.slice(0, 500);
		console.log( 'Retrieved ' + newStoryIds.length + ' stories' );
		const out = [];
		for (const storyId of newStoryIds) {
			console.log( 'Processing story ID ' + storyId );
			const storyData = await fetchStoryData(storyId);
			const storyDate = new Date(storyData.time * 1000);
			if ( storyDate.getDate() === YESTERDAY.getDate() ) {
				if ( storyData.descendants >= 3 && storyData.score >= 5 ) {
					console.log( 'Checking story "' + storyData.title +'" for AI content...' );
					try {
						const completion = await openai.createChatCompletion({
							model: 'gpt-3.5-turbo',
							messages: [
								{ role: 'system', content: 'You are a classifier deciding whether a story is about AI or not soley based on its title. You return "true" if the story is about AI and "false" if it is not. You have to choose one or the other.' },
								{ role: 'user', content: 'Story: '+storyData.title+'. Result (true|false):' },
							]
						});
						const label = completion.data.choices[0].message.content.toLowerCase();
						console.log( 'About AI? ' + label );
						if ( !label.startsWith( 'true' ) ) {
							continue;	
						}
					
						// Retrieve all kids of the story and add them to the out array
						storyData.comments = [];
						for (const kidId of storyData.kids) {
							const kidData = await fetchStoryData(kidId);
							delete kidData.parent;
							delete kidData.type;
							delete kidData.time;
							delete kidData.id;
							storyData.comments.push(kidData);
						}
						delete storyData.kids;
						delete storyData.type;
						out.push(storyData);
					} catch (error) {
						console.error('Error generating daily digest:', error);
					}
				}
			}
		}
		return out;
	} catch (error) {
		console.error('Error fetching stories:', error);
	}
}

async function fetchStoryData(storyId) {
	try {
		const response = await axios.get(`${ITEM_URL}${storyId}.json`);
		return response.data;
	} catch (error) {
		console.error(`Error fetching story data for ID ${storyId}:`, error);
	}
}


async function main() {
	const stories = await fetchNewestStories();
	console.log( 'Found ' + stories.length + ' stories.' );
	let digest = '## AI Submissions for ' + YESTERDAY.toDateString() + ' {{ \'date\': \'' + YESTERDAY.toISOString() + '\' }}\n\n';
	for ( let i = 0; i < stories.length; i++ ) {
		const story = stories[i];
		if ( !story.url ) {
			continue;
		}
		console.log( 'Processing story ' + i + ': ' + story.url );
		const response = await axios.get( story.url );
		const html = response.data;
		const $ = cheerio.load(html);
		
		// Remove elements from the HTML:
		$('script').remove();
		$('link').remove();
		$('style').remove();
		$('noscript').remove();
		$('meta').remove();
		$('iframe').remove();
		$('img').remove();
		$('nav').remove();
		$('footer').remove();
		$('header').remove();

		// Extract the inner text of the entire HTML document:
		let innerText = $('body').text();
		
		// Remove all extra whitespace:
		innerText = innerText.replace(/\s+/g, ' ');
		
		story.content = innerText.trim().substring(0, 5000);
		console.log( story );
		const messages = [
			{ role: 'system', content: 'This AI will write a daily digest of the top stories on Hacker News; it will summarize the original submission and the discussion in the comments.' },
			{ role: 'user', content: JSON.stringify( story ) },
		];
		try {
			const completion = await openai.createChatCompletion({
				model: 'gpt-3.5-turbo',
				messages
			});
			const summary = completion.data.choices[0].message.content;
			digest += '### ' + story.title + ' [(HN URL)](https://news.ycombinator.com/item?id='+story.id+')\n\n';
			digest += '#### ['+story.url+']('+story.url+') | ' + story.score + ' points | by [' + story.by + '](https://news.ycombinator.com/user?id='+story.by+') | ' + story.descendants + ' comments\n\n';
			digest += summary + '\n\n';
		}
		catch (error) {
			console.error('Error generating daily digest:', error);
		}
	}
	fs.writeFileSync( 'digest.md', digest );
}

main();