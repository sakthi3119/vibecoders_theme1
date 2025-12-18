const axios = require('axios');
const cheerio = require('cheerio');

async function checkInfyndPages() {
    console.log('Checking InFynd website structure...\n');

    const urlsToCheck = [
        'https://www.infynd.com',
        'https://www.infynd.com/contact-us',
        'https://www.infynd.com/about',
        'https://www.infynd.com/contact'
    ];

    for (const url of urlsToCheck) {
        try {
            console.log(`\n${url}:`);
            const response = await axios.get(url, { timeout: 10000 });
            const $ = cheerio.load(response.data);
            $('script, style, noscript, iframe').remove();
            const text = $('body').text().replace(/\s+/g, ' ').trim();

            // Look for location mentions
            const locationKeywords = ['coimbatore', 'tamil nadu', 'india', 'address', 'location', 'office'];
            const hasLocation = locationKeywords.some(k => text.toLowerCase().includes(k));

            console.log(`  Status: ${response.status}`);
            console.log(`  Has location info: ${hasLocation}`);

            if (hasLocation) {
                // Extract context around location keywords
                const matches = text.match(/.{0,100}(coimbatore|tamil nadu|address|office).{0,100}/gi);
                if (matches) {
                    console.log('  Location context:');
                    matches.slice(0, 3).forEach(m => console.log(`    - ${m.trim()}`));
                }
            }
        } catch (error) {
            console.log(`  Error: ${error.message}`);
        }
    }
}

checkInfyndPages();
