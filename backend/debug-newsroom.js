const axios = require('axios');
const cheerio = require('cheerio');

async function debugNewsroomPage() {
    const url = 'https://stripe.com/newsroom/information';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    $('script, style, noscript, iframe, svg').remove();

    // Look for headings
    console.log('=== All H2, H3, H4 Headings ===');
    $('h2, h3, h4').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 0 && text.length < 100) {
            console.log(`${$(el).prop('tagName')}: ${text}`);
        }
    });

    console.log('\n=== Looking for "Leadership" section ===');
    const leadershipSection = $('h1:contains("Leadership"), h2:contains("Leadership"), h3:contains("Leadership")').first();
    if (leadershipSection.length > 0) {
        console.log('Found Leadership heading:', leadershipSection.text());

        // Find next elements after leadership heading
        let next = leadershipSection.next();
        let count = 0;
        while (next.length > 0 && count < 10) {
            const tag = next.prop('tagName');
            const text = next.text().trim().substring(0, 200);
            console.log(`  ${tag}: ${text}`);
            next = next.next();
            count++;
        }
    }

    console.log('\n=== Checking for image alt text with names ===');
    $('img').each((i, img) => {
        const alt = $(img).attr('alt');
        if (alt && (alt.includes('Patrick') || alt.includes('John') || alt.includes('Portrait'))) {
            console.log(`Found: ${alt}`);
        }
    });

    console.log('\n=== Looking for any DIVs or sections with people names ===');
    const testNames = ['Patrick Collison', 'John Collison', 'Will Gaybrick'];
    testNames.forEach(name => {
        const found = $(`*:contains("${name}")`).length;
        console.log(`"${name}" appears ${found} times in HTML`);
    });
}

debugNewsroomPage().catch(console.error);
