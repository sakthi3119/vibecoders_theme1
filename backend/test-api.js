const axios = require('axios');

async function testStripeAPI() {
    console.log('Testing Stripe analysis via API...\n');

    try {
        const response = await axios.post('http://localhost:5000/api/analyze', {
            domain: 'stripe.com'
        }, {
            timeout: 120000 // 2 minutes
        });

        const result = response.data.data || response.data;

        console.log('Keys in result:', Object.keys(result));
        console.log('\nFull result structure:', JSON.stringify(result, null, 2).substring(0, 4000));

        console.log('✅ Analysis complete!');
        console.log(`\nCompany: ${result.company?.company?.name || result.companyName}`);
        console.log(`Domain: ${result.company?.company?.domain || result.domain}`);
        console.log(`\nPeople found: ${result.people ? result.people.length : 0}`);

        if (result.people && result.people.length > 0) {
            console.log('\nTop 10 people:');
            result.people.slice(0, 10).forEach((person, idx) => {
                console.log(`  ${idx + 1}. ${person.name} - ${person.title || 'N/A'} (${person.role_category})`);
            });
        }

        console.log(`\nProducts: ${result.products_services ? result.products_services.length : (result.products ? result.products.length : 0)}`);
        console.log(`Locations: ${result.locations ? result.locations.length : 0}`);
        console.log(`Tech Stack: ${result.tech_stack ? result.tech_stack.length : (result.techStack ? result.techStack.length : 0)}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        if (error.stack) {
            console.error('\nStack:', error.stack);
        }
    }
}

testStripeAPI();
