const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { Configuration, OpenAIApi } = require('openai');
const jsonSerializeCompressed = require('./serialize_compressed.js');

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const TODAY = new Date();
const YESTERDAY = new Date( TODAY.getTime() - (24 * 60 * 60 * 1000) );
const YESTERDAY_STRING = YESTERDAY
	.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
	.replace(/\//g, '-');
console.log( 'Creating digest for: ' + YESTERDAY_STRING );

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
	const stories = JSON.parse( fs.readFileSync( path.join( __dirname, '..', 'data', 'stories.json' ), 'utf8' ) );
	let digest = '## AI Submissions for ' + YESTERDAY.toDateString() + ' {{ \'date\': \'' + YESTERDAY.toISOString() + '\' }}\n\n';
	for ( let i = 0; i < stories.length; i++ ) {
		const story = stories[i];
		if ( !story.url ) {
			continue;
		}
		console.log( 'Processing story ' + i + ': ' + story.url );
		try {
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

			const content = innerText.trim().substring(0, 6000);
			try {
				let completion = await openai.createChatCompletion({
					model: 'gpt-3.5-turbo',
					messages: [
						{ role: 'system', content: 'This AI will write a daily digest of the top stories on Hacker News; it will summarize the following submission in an engaging way.' },
						{ role: 'user', content: content },
					]
				}, {
					timeout: 10000
				});
				const summary = completion.data.choices[0].message.content;
				digest += '### ' + story.title + '\n\n';
				digest += '#### [Submission URL]('+story.url+') | ' + story.score + ' points | by [' + story.by + '](https://news.ycombinator.com/user?id='+story.by+') | [' + story.descendants + ' comments](https://news.ycombinator.com/item?id='+story.id+')\n\n';
				digest += summary + '\n\n';

				const comments = jsonSerializeCompressed( story.comments ).substring(0, 6000);
				completion =await openai.createChatCompletion({
					model: 'gpt-3.5-turbo',
					messages: [
						{ role: 'system', content: 'This AI will write a daily digest of the top stories on Hacker News; it will summarize the following discussion about the submission in the comments on Hacker News.' },
						{ role: 'user', content: 'Summary of Submission: '+summary+'.' },
						{ role: 'user', content: 'Please summarize the following discussion: '+comments },
					]
				}, {
					timeout: 10000
				});
				digest += completion.data.choices[0].message.content;
				digest += '\n\n';
				await sleep(1000);
			}
			catch (error) {
				console.error('Error generating summary:', error);
			}
		}
		catch (error) {
			console.error('Error generating daily digest:', error);
		}
	}
	fs.writeFileSync( path.join( __dirname, '..', 'data', `digest_${YESTERDAY_STRING}.md`), digest );
}

main();
