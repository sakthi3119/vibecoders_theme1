const axios = require('axios');
const cheerio = require('cheerio');

async function debugPatrickStructure() {
    const url = 'https://stripe.com/newsroom/information';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    $('script, style, noscript, iframe, svg').remove();

    console.log('=== Finding Patrick Collison structure ===\n');

    // Find Patrick's heading
    const patrickH1 = $('h1').filter(function () {
        return $(this).text().trim() === 'Patrick Collison';
    }).first();

    if (patrickH1.length > 0) {
        console.log('Found Patrick H1');

        // Look at parent
        let parent = patrickH1.parent();
        console.log(`\nParent <${parent.prop('tagName')}>:`);
        console.log(parent.html().substring(0, 500));

        // Look at grandparent
        let grandparent = parent.parent();
        console.log(`\n\nGrandparent <${grandparent.prop('tagName')}>:`);
        console.log(grandparent.html().substring(0, 800));
    }
}

debugPatrickStructure().catch(console.error);
