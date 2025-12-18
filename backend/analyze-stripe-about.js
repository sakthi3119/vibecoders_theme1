const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeStripePeoplePage() {
    const url = 'https://stripe.com/newsroom';
    console.log('Analyzing Stripe About page...\n');

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, noscript, iframe, svg').remove();

    // Strategy 1: Look for structured person cards
    console.log('=== Strategy 1: Structured Cards ===');
    const cards = $('.team-member, [class*="team"], [class*="person"], [class*="member"], [itemtype*="Person"]');
    console.log(`Found ${cards.length} potential person cards`);

    // Strategy 2: Look for headings with people names
    console.log('\n=== Strategy 2: Headings ===');
    const headings = $('h1, h2, h3, h4').map((i, el) => $(el).text().trim()).get();
    console.log('Sample headings:', headings.slice(0, 20));

    // Strategy 3: Look for specific sections
    console.log('\n=== Strategy 3: Sections with "team", "leadership", "board" ===');
    $('[id*="team"], [id*="leadership"], [id*="board"], [class*="team"], [class*="leadership"], [class*="board"]').each((i, el) => {
        if (i < 5) {
            const text = $(el).text().trim().substring(0, 200);
            console.log(`\n${$(el).prop('tagName')} (${$(el).attr('class') || $(el).attr('id')}): ${text}...`);
        }
    });

    // Check if there are any names in the content
    console.log('\n=== Searching for name patterns ===');
    const bodyText = $('body').text();
    const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+)/g;
    const potentialNames = bodyText.match(namePattern);
    if (potentialNames) {
        console.log('Found potential names:', potentialNames.slice(0, 20));
    }
}

analyzeStripePeoplePage().catch(console.error);
