const axios = require('axios');
const cheerio = require('cheerio');

async function findInfyndLocation() {
    const response = await axios.get('https://www.infynd.com/contact-us');
    const $ = cheerio.load(response.data);

    console.log('=== FOOTER ===');
    console.log($('footer').text().substring(0, 800));

    console.log('\n\n=== CONTACT SECTIONS ===');
    $('*').each((i, el) => {
        const className = $(el).attr('class') || '';
        const id = $(el).attr('id') || '';
        if (className.includes('contact') || className.includes('address') ||
            id.includes('contact') || id.includes('address')) {
            const text = $(el).text().trim();
            if (text.length > 20 && text.length < 500) {
                console.log(`\n${$(el).prop('tagName')}.${className}:`);
                console.log(text.substring(0, 200));
            }
        }
    });

    console.log('\n\n=== SEARCHING FOR COIMBATORE ===');
    const bodyText = $('body').html();
    const matches = bodyText.match(/.{0,150}coimbatore.{0,150}/gi);
    if (matches) {
        matches.forEach(m => console.log(m));
    } else {
        console.log('Not found in HTML');
    }
}

findInfyndLocation().catch(console.error);
