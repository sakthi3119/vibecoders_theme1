const axios = require('axios');
const cheerio = require('cheerio');

async function debugNewsroomStructure() {
    const url = 'https://stripe.com/newsroom/information';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    $('script, style, noscript, iframe, svg').remove();

    console.log('=== Finding Leadership section and its structure ===\n');

    // Find Leadership heading
    const leadershipHeading = $('*').filter(function () {
        return $(this).text().trim() === 'Leadership';
    }).first();

    if (leadershipHeading.length > 0) {
        console.log(`Found Leadership in: <${leadershipHeading.prop('tagName')}>`);
        console.log(`Classes: ${leadershipHeading.attr('class')}`);

        // Find parent container
        let container = leadershipHeading.parent();
        console.log(`\nParent: <${container.prop('tagName')}> with class: ${container.attr('class')}`);

        // Look for pattern: Should be name as heading, then title below
        console.log('\n=== Looking for H1, H2, H3, H4 near Patrick Collison ===');
        $('h1, h2, h3, h4, h5, h6').each((i, h) => {
            const text = $(h).text().trim();
            if (text === 'Patrick Collison' || text === 'John Collison' || text === 'Will Gaybrick') {
                console.log(`\nFound: <${$(h).prop('tagName')}> "${text}"`);
                console.log(`  Classes: ${$(h).attr('class')}`);

                // Look for next sibling or nearby text
                const next = $(h).next();
                console.log(`  Next sibling: <${next.prop('tagName')}> "${next.text().trim().substring(0, 80)}"`);
            }
        });
    }
}

debugNewsroomStructure().catch(console.error);
