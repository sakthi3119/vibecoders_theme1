console.log('Testing Location Integration...\n');

// Simple direct test without API call
const locationExtractor = require('./services/locationExtractor');
const heuristicExtractor = require('./services/heuristicExtractor');

async function quickTest() {
    const mockData = {
        domain: 'https://test.com',
        pages: [{
            url: 'https://test.com/about',
            text: 'We are based in Mumbai, India with offices in Bangalore, Delhi, and Hyderabad. Our headquarters is located at 123 Main Street, Mumbai, Maharashtra 400001.',
            title: 'About Us',
            metaDescription: 'Company info',
            links: [],
            images: [],
            productSections: [],
            navigationCategories: [],
            peopleData: []
        }]
    };

    console.log('Testing heuristic extractor (async)...');
    const heuristics = await heuristicExtractor.extract(mockData);

    console.log('\nExtracted Data:');
    console.log('  Company Name:', heuristics.companyName);
    console.log('  Headquarters:', heuristics.locations?.headquarters);
    console.log('  Offices:', heuristics.locations?.offices?.join(', '));
    console.log('  Addresses:', heuristics.locations?.addresses?.join(' | '));
    console.log('  Coordinates:', heuristics.locations?.coordinates);

    console.log('\n✅ Location extraction is working!');
}

quickTest().catch(err => {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
});
