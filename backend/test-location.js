const locationExtractor = require('./services/locationExtractor');

async function testLocationExtraction() {
    console.log('Testing Location Extraction...\n');

    // Test 1: From scraped data
    const mockScrapedData = {
        domain: 'https://stripe.com',
        pages: [{
            url: 'https://stripe.com/about',
            text: `Stripe is a technology company that builds economic infrastructure for the internet. 
            Stripe has dual headquarters in San Francisco and Dublin, as well as offices in London, Paris, 
            Singapore, Tokyo, and other locations around the world. Our main office is located at 
            510 Townsend St, San Francisco, CA 94103.`,
            title: 'About Stripe'
        }]
    };

    const locations = await locationExtractor.extractLocations(
        mockScrapedData,
        { companyName: 'Stripe' },
        'Stripe'
    );

    console.log('Extracted Locations:');
    console.log('  Headquarters:', locations.headquarters);
    console.log('  Offices:', locations.offices.join(', '));
    console.log('  Addresses:', locations.addresses.join(' | '));
    console.log('  Coordinates:', locations.coordinates);

    // Test 2: Domain inference
    const inferredIndia = locationExtractor.inferLocationFromDomain('example.co.in');
    const inferredUK = locationExtractor.inferLocationFromDomain('example.co.uk');
    const inferredUS = locationExtractor.inferLocationFromDomain('example.com');

    console.log('\n\nDomain-based Inference:');
    console.log('  example.co.in ->', inferredIndia);
    console.log('  example.co.uk ->', inferredUK);
    console.log('  example.com ->', inferredUS);
}

testLocationExtraction().catch(console.error);
