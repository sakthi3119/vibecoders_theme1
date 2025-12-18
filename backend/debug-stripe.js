const scraper = require('./services/scraper');

async function debugStripe() {
    console.log('Scraping Stripe...\n');

    const data = await scraper.scrapeWebsite('https://stripe.com');

    console.log(`Pages visited: ${data.pages.length}`);
    console.log('\nPages scraped:');
    data.pages.forEach((page, idx) => {
        console.log(`${idx + 1}. ${page.url}`);
        console.log(`   People found: ${page.peopleData ? page.peopleData.length : 0}`);
        if (page.peopleData && page.peopleData.length > 0) {
            page.peopleData.forEach(p => {
                console.log(`      - ${p.name} (${p.title})`);
            });
        }
    });

    // Check first page for links with "about" or "team"
    if (data.pages.length > 0) {
        const firstPage = data.pages[0];
        console.log('\n\nLooking for about/team links in homepage...');
        const relevantLinks = firstPage.links.filter(link => {
            const url = link.url.toLowerCase();
            return url.includes('about') || url.includes('team') ||
                url.includes('leadership') || url.includes('company');
        });

        console.log(`Found ${relevantLinks.length} potential people links:`);
        relevantLinks.forEach(link => {
            console.log(`  - ${link.url} (text: "${link.text}")`);
        });
    }
}

debugStripe().catch(console.error);
