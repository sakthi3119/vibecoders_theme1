const axios = require('axios');

async function testStripePeopleUrls() {
    const urls = [
        'https://stripe.com/about',
        'https://stripe.com/company',
        'https://stripe.com/team',
        'https://stripe.com/leadership',
        'https://stripe.com/in/about',
        'https://stripe.com/in/company',
        'https://stripe.com/in/newsroom',
        'https://stripe.com/newsroom'
    ];

    for (const url of urls) {
        try {
            const response = await axios.get(url, {
                timeout: 5000,
                maxRedirects: 5
            });
            console.log(`✓ ${url} - EXISTS (${response.status})`);
        } catch (error) {
            console.log(`✗ ${url} - ${error.response ? error.response.status : 'NOT FOUND'}`);
        }
    }
}

testStripePeopleUrls().catch(console.error);
