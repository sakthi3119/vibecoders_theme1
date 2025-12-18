const axios = require('axios');

async function testFullPipeline() {
    console.log('Testing Full Location Integration with Stripe...\n');

    try {
        console.log('Waiting for server to start...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('Analyzing Stripe...');
        const response = await axios.post('http://localhost:5000/api/analyze', {
            domain: 'stripe.com'
        }, {
            timeout: 120000
        });

        const result = response.data.data || response.data;

        console.log('\n✅ Analysis Complete!\n');
        console.log('Company:', result.company?.company?.name || result.company?.name);
        console.log('\nLocation Details:');
        console.log('  Headquarters:', result.locations?.headquarters || 'N/A');
        console.log('  Offices:', result.locations?.offices?.join(', ') || 'N/A');
        console.log('  Addresses:', result.locations?.addresses?.join(' | ') || 'N/A');
        console.log('  Coordinates:', result.locations?.coordinates || 'N/A');

        console.log('\nPeople:', result.people?.length || 0, 'found');
        if (result.people && result.people.length > 0) {
            result.people.slice(0, 5).forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.name} - ${p.title}`);
            });
        }

        console.log('\nProducts:', result.products_services?.length || 0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response?.data) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
        }
    }
}

testFullPipeline();
