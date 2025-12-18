const axios = require('axios');

async function testInFyndAPI() {
    console.log('Testing InFynd analysis via API...\n');

    try {
        const response = await axios.post('http://localhost:5000/api/analyze', {
            domain: 'infynd.com'
        }, {
            timeout: 120000 // 2 minutes
        });

        const result = response.data.data || response.data;

        console.log('✅ Analysis complete!');
        console.log(`\nCompany: ${result.company?.company?.name || result.companyName}`);
        console.log(`Domain: ${result.company?.company?.domain || result.domain}`);

        console.log('\n=== LOCATIONS DATA ===');
        const locations = result.company?.locations || result.locations || {};
        console.log('Headquarters:', locations.headquarters || 'None');
        console.log('Offices:', locations.offices || []);
        console.log('Addresses:', locations.addresses || []);
        console.log('Coordinates:', locations.coordinates || 'None');

        console.log('\n=== PEOPLE DATA ===');
        const people = result.company?.people || result.people || [];
        console.log(`Found ${people.length} people`);
        if (people.length > 0) {
            people.slice(0, 5).forEach((person, idx) => {
                console.log(`  ${idx + 1}. ${person.name} - ${person.title || 'N/A'}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testInFyndAPI();
