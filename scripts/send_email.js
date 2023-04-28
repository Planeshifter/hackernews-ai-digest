const path = require('path');
const fs = require('fs');
const mailchimp = require('@mailchimp/mailchimp_marketing');
const MarkdownIt = require("markdown-it");
const md = new MarkdownIt();

const LIST_ID = 'a495b09cd9';
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'newsletter.html');
const TEMPLATE_CONTENT = fs.readFileSync(TEMPLATE_PATH, 'utf8');
const fileName = process.argv[2];
if ( !fileName ) {
	console.error( 'Please specify a file name' );
	process.exit( 1 );
}
console.log( `Sending email with content from ${fileName}` );
const FILE_PATH = path.join(__dirname, '..', 'data', fileName );
const FILE_CONTENT = fs.readFileSync(FILE_PATH, 'utf8')
  .replace(/{{[^}]+}}/g, '')

require('dotenv').config({
    path: path.join( __dirname, '..', 'www', '.env.local' )
});

mailchimp.setConfig({
	apiKey: process.env.MAILCHIMP_API_KEY,
	server: process.env.MAILCHIMP_API_SERVER, // e.g. us1
});

// Define the content of the email
const emailContent = {
  type: 'regular',
  recipients: {
    list_id: LIST_ID
  },
  settings: {
    subject_line: 'Daily AI Digest',
    reply_to: 'pburckhardt@outlook.com',
    from_name: 'Philipp Burckhardt'
  },
  campaign_defaults: {
    from_email: 'pburckhardt@outlook.com',
    from_name: 'Philipp Burckhardt',
    subject: 'Daily AI Digest',
    language: 'en',
  },
  tracking: {
    opens: true,
    html_clicks: true,
    text_clicks: false,
  },
  authenticate: true,
  auto_footer: true,
  inline_css: true,
  generate_text: false
};

async function main() {
  try {
    const result = await mailchimp.campaigns.create(emailContent);
    console.log(`Campaign created: ${result.id}`);
    const content = {
      html: TEMPLATE_CONTENT.replace('{{CONTENT}}', md.render(FILE_CONTENT))
    };
    await mailchimp.campaigns.setContent(result.id, content);
    await mailchimp.campaigns.send(result.id);
    console.log('Campaign sent...');
  } catch (err) {
    console.error(err);
  }
}

main();
