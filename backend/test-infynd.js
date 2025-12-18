// Quick test to see actual data structure returned
const heuristicExtractor = require('./services/heuristicExtractor');
const scraper = require('./services/scraper');

async function testInfynd() {
    console.log('Testing InFynd location extraction...\n');

    const domain = 'infynd.com';
    console.log('1. Scraping:', domain);
    const scrapedData = await scraper.scrapeWebsite(domain);
    console.log('   Pages scraped:', scrapedData.pages.length);

    console.log('\n2. Extracting heuristic data...');
    const heuristicData = await heuristicExtractor.extract(scrapedData);

    console.log('\n3. Heuristic Location Data:');
    console.log(JSON.stringify(heuristicData.locations, null, 2));

    console.log('\n4. Sample page text (first 500 chars):');
    console.log(scrapedData.pages[0].text.substring(0, 500));
}

testInfynd().catch(err => {
    console.error('Error:', err.message);
    console.error(err.stack);
});
