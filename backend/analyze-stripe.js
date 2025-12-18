const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeStripeStructure() {
    const response = await axios.get('https://stripe.com');
    const $ = cheerio.load(response.data);

    console.log('All navigation links on Stripe homepage:\n');

    const links = [];
    $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        if (href && text && text.length > 0 && text.length < 50) {
            links.push({ href, text });
        }
    });

    // Group by similarity
    console.log('\n=== Links containing "about", "company", "team", "who" ===');
    links.filter(l => {
        const combined = (l.href + ' ' + l.text).toLowerCase();
        return combined.includes('about') || combined.includes('company') ||
            combined.includes('team') || combined.includes('who');
    }).forEach(l => console.log(`"${l.text}" → ${l.href}`));

    console.log('\n=== Links containing "news", "blog", "story" ===');
    links.filter(l => {
        const combined = (l.href + ' ' + l.text).toLowerCase();
        return combined.includes('news') || combined.includes('blog') ||
            combined.includes('story') || combined.includes('stories');
    }).forEach(l => console.log(`"${l.text}" → ${l.href}`));

    console.log('\n=== Footer links (last 30) ===');
    links.slice(-30).forEach(l => console.log(`"${l.text}" → ${l.href}`));
}

analyzeStripeStructure().catch(console.error);
