const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

/**
 * Scrapes a company website starting from homepage
 * Follows internal navigation links (About, Products, Contact, Careers, etc.)
 */
class WebsiteScraper {
    constructor() {
        this.visited = new Set();
        this.maxPages = 6; // Reduced from 10 for faster processing
        this.timeout = 5000; // Reduced from 10s to 5s
        this.concurrency = 3; // Scrape 3 pages in parallel
        this.navKeywords = [
            'about', 'product', 'service', 'contact', 'career', 'team',
            'company', 'who-we-are', 'what-we-do', 'solutions', 'jobs',
            'features', 'pricing', 'plans', 'offerings', 'portfolio'
        ];
        this.productKeywords = [
            'product', 'service', 'solution', 'offering', 'feature',
            'what-we-do', 'our-products', 'our-services', 'platform'
        ];
        this.peopleKeywords = [
            'about', 'company', 'leadership', 'team', 'management',
            'executives', 'board', 'founders', 'about-us', 'who-we-are'
        ];
    }

    async scrapeWebsite(domain) {
        this.visited.clear();
        const baseUrl = this.normalizeUrl(domain);

        const pages = [];
        const urlsToVisit = [baseUrl];
        const priorityUrls = []; // People-related pages get priority

        // Add common corporate URLs to priority queue (try even if not linked)
        // Reduced list for faster processing
        const commonPaths = [
            '/about', '/team', '/company', '/about-us',
            '/contact', '/leadership'
        ];
        for (const path of commonPaths) {
            const url = baseUrl + path;
            priorityUrls.push(url);
        }

        // Parallel scraping for faster performance
        while ((priorityUrls.length > 0 || urlsToVisit.length > 0) && pages.length < this.maxPages) {
            // Collect batch of URLs to scrape in parallel
            const batch = [];
            const batchSize = Math.min(this.concurrency, this.maxPages - pages.length);

            for (let i = 0; i < batchSize; i++) {
                const url = priorityUrls.length > 0 ? priorityUrls.shift() : urlsToVisit.shift();
                if (!url || this.visited.has(url)) continue;

                this.visited.add(url);
                batch.push(url);
            }

            if (batch.length === 0) break;

            // Scrape all URLs in batch concurrently
            const results = await Promise.allSettled(
                batch.map(url => this.scrapePage(url, baseUrl))
            );

            // Process results
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                if (result.status === 'fulfilled' && result.value) {
                    const pageData = result.value;
                    pages.push(pageData);

                    // Add navigation links to queue, prioritizing people pages
                    const navLinks = this.extractNavigationLinks(pageData.links, baseUrl);
                    const { peopleLinks, otherLinks } = this.categorizePeopleLinks(navLinks);

                    // People pages go to priority queue
                    priorityUrls.push(...peopleLinks.filter(link => !this.visited.has(link)));
                    // Other pages go to regular queue
                    urlsToVisit.push(...otherLinks.filter(link => !this.visited.has(link)));
                } else if (result.status === 'rejected') {
                    console.error(`Failed to scrape ${batch[i]}:`, result.reason?.message || 'Unknown error');
                }
            }
        }

        return {
            domain: baseUrl,
            pages,
            scrapedAt: new Date().toISOString()
        };
    }

    async scrapePage(url, baseUrl) {
        try {
            const response = await axios.get(url, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                maxRedirects: 5
            });

            const html = response.data;
            const responseHeaders = response.headers; // Capture headers
            const $ = cheerio.load(html);

            // Remove unwanted elements
            $('script, style, noscript, iframe, svg').remove();

            // Extract metadata
            const title = $('title').text().trim();
            const metaDescription = $('meta[name="description"]').attr('content') || '';
            const metaKeywords = $('meta[name="keywords"]').attr('content') || '';

            // Extract text content
            const bodyText = $('body').text()
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 30000); // Reduced from 50k to 30k for faster processing

            // Extract all links
            const links = [];
            $('a[href]').each((i, elem) => {
                const href = $(elem).attr('href');
                if (href) {
                    const absoluteUrl = this.resolveUrl(href, baseUrl);
                    if (absoluteUrl) {
                        links.push({
                            url: absoluteUrl,
                            text: $(elem).text().trim()
                        });
                    }
                }
            });

            // Extract images (for logo detection)
            const images = [];
            $('img[src]').each((i, elem) => {
                const src = $(elem).attr('src');
                const alt = $(elem).attr('alt') || '';
                if (src) {
                    try {
                        // Allow cross-domain images for logos (CDNs, etc.)
                        const imgUrl = new URL(src, baseUrl);
                        images.push({
                            url: imgUrl.href,
                            alt
                        });
                    } catch (error) {
                        // Invalid URL, skip
                    }
                }
            });

            // Detect tech stack from HTML AND headers
            const techStack = this.detectTechStack(html, $, responseHeaders);

            // Extract structured product information
            const productSections = this.extractProductSections($, url);

            // Extract navigation categories (for marketplaces)
            const navigationCategories = this.extractNavigationCategories($, url);

            // Extract people information from page
            const peopleData = this.extractPeopleFromPage($, url);

            return {
                url,
                title,
                metaDescription,
                metaKeywords,
                text: bodyText,
                links,
                images,
                techStack,
                productSections,
                navigationCategories,
                peopleData,
                html: html.substring(0, 100000) // Limit HTML size
            };

        } catch (error) {
            console.error(`Error scraping ${url}:`, error.message);
            return null;
        }
    }

    normalizeUrl(domain) {
        let url = domain.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        return url.replace(/\/$/, ''); // Remove trailing slash
    }

    categorizePeopleLinks(links) {
        const peopleLinks = [];
        const otherLinks = [];

        for (const link of links) {
            const urlLower = link.toLowerCase();
            const isPeopleLink = this.peopleKeywords.some(keyword =>
                urlLower.includes(keyword)
            );

            // Also exclude blog, news, career, press pages from people links
            const isExcluded = ['blog', 'news', 'career', 'press', 'media', 'event'].some(word =>
                urlLower.includes(word)
            );

            if (isPeopleLink && !isExcluded) {
                peopleLinks.push(link);
            } else {
                otherLinks.push(link);
            }
        }

        return { peopleLinks, otherLinks };
    }

    resolveUrl(href, baseUrl) {
        try {
            const url = new URL(href, baseUrl);

            // Only return URLs from same domain
            if (url.hostname === new URL(baseUrl).hostname) {
                return url.href;
            }
        } catch (error) {
            // Invalid URL
        }
        return null;
    }

    extractNavigationLinks(links, baseUrl) {
        const navLinks = [];
        const baseDomain = new URL(baseUrl).hostname;

        for (const link of links) {
            try {
                const url = new URL(link.url);

                // Must be same domain
                if (url.hostname !== baseDomain) continue;

                // Check if URL or link text contains navigation keywords
                const urlPath = url.pathname.toLowerCase();
                const linkText = link.text.toLowerCase();

                const isNavLink = this.navKeywords.some(keyword =>
                    urlPath.includes(keyword) || linkText.includes(keyword)
                );

                if (isNavLink && !this.visited.has(link.url)) {
                    navLinks.push(link.url);
                }
            } catch (error) {
                // Skip invalid URLs
            }
        }

        return navLinks;
    }

    detectTechStack(html, $, headers = {}) {
        const tech = [];
        const htmlLower = html.toLowerCase();

        // Check HTTP headers for tech stack (JURY FEEDBACK - NEW)
        if (headers) {
            // Server header (e.g., "nginx", "Apache", "Microsoft-IIS")
            if (headers.server) {
                const server = headers.server.toLowerCase();
                if (server.includes('nginx')) tech.push('Nginx');
                if (server.includes('apache')) tech.push('Apache');
                if (server.includes('microsoft-iis')) tech.push('IIS');
                if (server.includes('cloudflare')) tech.push('Cloudflare');
            }

            // X-Powered-By header (e.g., "Express", "PHP", "ASP.NET")
            if (headers['x-powered-by']) {
                const poweredBy = headers['x-powered-by'].toLowerCase();
                if (poweredBy.includes('express')) tech.push('Express');
                if (poweredBy.includes('php')) tech.push('PHP');
                if (poweredBy.includes('asp.net')) tech.push('ASP.NET');
                if (poweredBy.includes('next.js')) tech.push('Next.js');
            }

            // X-Generator or X-Drupal-Cache headers
            if (headers['x-generator']) {
                tech.push(headers['x-generator']);
            }
            if (headers['x-drupal-cache']) {
                tech.push('Drupal');
            }

            // CDN headers
            if (headers['cf-ray']) tech.push('Cloudflare');
            if (headers['x-amz-cf-id']) tech.push('AWS CloudFront');
            if (headers['x-fastly-request-id']) tech.push('Fastly');
        }

        // WordPress - check for specific WP patterns (enhanced)
        if (htmlLower.includes('wp-content/') ||
            htmlLower.includes('wp-includes/') ||
            htmlLower.includes('wp-json/') ||
            htmlLower.includes('wp-admin') ||
            htmlLower.includes('/wp-') ||
            $('meta[name="generator"]').attr('content')?.includes('WordPress') ||
            $('link[rel="stylesheet"]').attr('href')?.includes('wp-content') ||
            htmlLower.includes('wordpress') && htmlLower.includes('.css')) {
            tech.push('WordPress');
        }

        // React - check for React-specific patterns (enhanced)
        if ($('[data-reactroot]').length > 0 ||
            $('[data-reactid]').length > 0 ||
            $('[data-react]').length > 0 ||
            $('#root').length > 0 && (htmlLower.includes('react') || htmlLower.includes('bundle.js')) ||
            $('#__next').length > 0 ||
            htmlLower.includes('react-dom') ||
            htmlLower.includes('react.production') ||
            htmlLower.includes('react.development') ||
            htmlLower.includes('/static/js/') && htmlLower.includes('react') ||
            htmlLower.includes('/_next/') || // Next.js
            htmlLower.includes('__next') ||
            htmlLower.includes('react-router') ||
            htmlLower.match(/\.chunk\.js/) && $('#root').length > 0) {
            tech.push('React');
        }

        // Vue - check for Vue-specific patterns
        if ($('[data-v-]').length > 0 ||
            htmlLower.includes('vue.js') ||
            htmlLower.includes('vue.runtime') ||
            htmlLower.includes('nuxt.js') ||
            $('[v-cloak]').length > 0) {
            tech.push('Vue.js');
        }

        // Angular - check for Angular-specific attributes/patterns
        if ($('[ng-app]').length > 0 ||
            $('[ng-controller]').length > 0 ||
            $('[ng-version]').length > 0 ||
            htmlLower.includes('angular.js') ||
            htmlLower.includes('angular.min.js') ||
            htmlLower.match(/ng-[a-z]+=/) ||
            htmlLower.includes('@angular/')) {
            tech.push('Angular');
        }

        // Next.js - server-side React framework
        if (htmlLower.includes('_next/static') ||
            htmlLower.includes('__next_data__') ||
            $('script[src*="_next"]').length > 0) {
            tech.push('Next.js');
        }

        // Gatsby - React static site generator
        if (htmlLower.includes('gatsby') ||
            $('meta[name="generator"]').attr('content')?.includes('Gatsby')) {
            tech.push('Gatsby');
        }

        // Svelte
        if (htmlLower.includes('svelte') ||
            $('[class*="svelte-"]').length > 0) {
            tech.push('Svelte');
        }

        // jQuery - check for actual jQuery references
        if (htmlLower.includes('jquery.min.js') ||
            htmlLower.includes('jquery.js') ||
            htmlLower.includes('ajax.googleapis.com/ajax/libs/jquery/')) {
            tech.push('jQuery');
        }

        // Bootstrap - check for Bootstrap CSS/JS
        if (htmlLower.includes('bootstrap.min.css') ||
            htmlLower.includes('bootstrap.css') ||
            htmlLower.includes('bootstrap.min.js') ||
            $('[class*="col-md-"]').length > 0 ||
            $('[class*="col-sm-"]').length > 0) {
            tech.push('Bootstrap');
        }

        // Tailwind CSS
        if (htmlLower.includes('tailwindcss') ||
            htmlLower.includes('tailwind.css') ||
            $('[class*="flex"]').length > 10 && $('[class*="sm:"]').length > 5) {
            tech.push('Tailwind CSS');
        }

        // Google Analytics - only if actually tracking (enhanced)
        if (htmlLower.includes('google-analytics.com/analytics.js') ||
            htmlLower.includes('googletagmanager.com/gtag/js') ||
            htmlLower.includes('googletagmanager.com/gtm.js') ||
            htmlLower.includes('gtag(') ||
            htmlLower.includes('ga(\'create\')') ||
            htmlLower.match(/g-[a-z0-9]{10}/i) || // GA4 measurement ID pattern
            htmlLower.match(/ua-\d{4,9}-\d{1,4}/i) || // Universal Analytics ID
            htmlLower.includes('_gaq') ||
            htmlLower.includes('analytics.google.com')) {
            tech.push('Google Analytics');
        }

        // HubSpot (enhanced)
        if (htmlLower.includes('js.hs-analytics.net') ||
            htmlLower.includes('js.hs-scripts.com') ||
            htmlLower.includes('js.hsforms.net') ||
            htmlLower.includes('forms.hubspot.com') ||
            htmlLower.includes('hs-scripts.com') ||
            htmlLower.includes('hsforms.com') ||
            htmlLower.includes('_hsq') ||
            htmlLower.includes('hubspot.com') && htmlLower.includes('script') ||
            $('[data-hsjs-portal]').length > 0 ||
            $('[data-hs-form]').length > 0) {
            tech.push('HubSpot');
        }

        // Shopify
        if (htmlLower.includes('cdn.shopify.com') ||
            htmlLower.includes('shopify.com/s/files') ||
            $('meta[name="shopify-checkout-api-token"]').length > 0) {
            tech.push('Shopify');
        }

        // Wix
        if (htmlLower.includes('wixsite.com') ||
            htmlLower.includes('static.wixstatic.com')) {
            tech.push('Wix');
        }

        // Webflow
        if (htmlLower.includes('webflow.com') ||
            htmlLower.includes('webflow.io') ||
            $('html').attr('data-wf-page')) {
            tech.push('Webflow');
        }

        // Squarespace
        if (htmlLower.includes('squarespace.com') ||
            htmlLower.includes('static.squarespace.com')) {
            tech.push('Squarespace');
        }

        // Stripe (payment processing)
        if (htmlLower.includes('stripe.com/v3/') ||
            htmlLower.includes('js.stripe.com')) {
            tech.push('Stripe');
        }

        // Node.js indicators
        if (htmlLower.includes('express') && htmlLower.includes('node') ||
            $('meta[name="generator"]').attr('content')?.includes('Node')) {
            tech.push('Node.js');
        }

        // Django
        if (htmlLower.includes('csrfmiddlewaretoken') ||
            htmlLower.includes('__admin_media_prefix__')) {
            tech.push('Django');
        }

        // Ruby on Rails
        if (htmlLower.includes('csrf-param') && htmlLower.includes('csrf-token') ||
            $('meta[name="csrf-param"]').length > 0) {
            tech.push('Ruby on Rails');
        }

        // Laravel
        if (htmlLower.includes('laravel') ||
            htmlLower.includes('csrf-token') && htmlLower.includes('laravel_session')) {
            tech.push('Laravel');
        }

        // TypeScript (if source maps or type declarations are exposed)
        if (htmlLower.includes('.ts') && htmlLower.includes('typescript') ||
            htmlLower.includes('__typescript')) {
            tech.push('TypeScript');
        }

        return [...new Set(tech)]; // Remove duplicates
    }

    extractProductSections($, pageUrl) {
        const products = [];
        const urlPath = pageUrl.toLowerCase();

        // Check if this is a product/service page (but extract from all pages with lower threshold)
        const isProductPage = this.productKeywords.some(keyword =>
            urlPath.includes(keyword)
        );

        // Extract from all pages, but be more selective on non-product pages
        const threshold = isProductPage ? 3 : 10;

        // Strategy 1: Look for structured product cards/sections
        const selectors = [
            '.product, .service, .solution, .offering, .feature',
            '[class*="product"], [class*="service"], [class*="solution"], [class*="feature"]',
            'article, .card, .item, .feature-box, .offering-card',
            '[id*="product"], [id*="service"], [id*="feature"]',
            'section, .section'
        ];

        selectors.forEach(selector => {
            $(selector).each((i, elem) => {
                const $elem = $(elem);

                // Extract product name from heading
                let heading = $elem.find('h1, h2, h3, h4, h5, .title, .heading, .name, [class*="title"]').first().text().trim();

                // If no heading in child, check if elem itself is a heading
                if (!heading) {
                    heading = $elem.text().split('\n')[0].trim();
                }

                // Extract description from paragraph or content
                let description = $elem.find('p, .description, .content, .summary, .text').first().text().trim();

                // If no description found, get all text and remove heading
                if (!description) {
                    description = $elem.text().replace(heading, '').trim();
                }

                if (heading && heading.length > threshold && heading.length < 200 &&
                    !heading.toLowerCase().includes('cookie') &&
                    !heading.toLowerCase().includes('privacy')) {
                    products.push({
                        name: heading,
                        description: description ? description.substring(0, 500) : '',
                        source: 'structured'
                    });
                }
            });
        });

        // Strategy 2: Look for list-based products
        $('ul, ol').each((i, list) => {
            const $list = $(list);
            const listText = $list.text().toLowerCase();

            // Check if list context suggests products
            const prevHeading = $list.prevAll('h1, h2, h3, h4').first().text().toLowerCase();
            const isProductList = prevHeading.includes('product') ||
                prevHeading.includes('service') ||
                prevHeading.includes('solution') ||
                prevHeading.includes('offering');

            if (isProductList) {
                $list.find('li').each((j, item) => {
                    const text = $(item).text().trim();

                    // Extract name and description if format is "Name: Description" or "Name - Description"
                    const match = text.match(/^([^:\-]{3,100})[:\-]\s*(.+)$/);

                    if (match) {
                        products.push({
                            name: match[1].trim(),
                            description: match[2].trim().substring(0, 500),
                            source: 'list'
                        });
                    } else if (text.length > 5 && text.length < 200) {
                        // Simple list item
                        products.push({
                            name: text,
                            description: '',
                            source: 'list'
                        });
                    }
                });
            }
        });

        // Strategy 3: Look for definition lists (dl/dt/dd)
        $('dl').each((i, dl) => {
            $(dl).find('dt').each((j, dt) => {
                const name = $(dt).text().trim();
                const description = $(dt).next('dd').text().trim();

                if (name && name.length > 3 && name.length < 200) {
                    products.push({
                        name,
                        description: description ? description.substring(0, 500) : '',
                        source: 'definition-list'
                    });
                }
            });
        });

        // Remove duplicates based on name similarity
        const uniqueProducts = [];
        products.forEach(product => {
            const isDuplicate = uniqueProducts.some(existing =>
                existing.name.toLowerCase() === product.name.toLowerCase()
            );

            if (!isDuplicate && product.name.length > 3) {
                uniqueProducts.push(product);
            }
        });

        return uniqueProducts.slice(0, 20); // Limit to 20 products per page
    }

    extractNavigationCategories($, pageUrl) {
        const categories = [];
        const seen = new Set();

        // Strategy 1: Extract from navigation menus (nav, header, menu elements)
        const navSelectors = [
            'nav a, header a, [role="navigation"] a',
            '.nav a, .navbar a, .menu a, .header a',
            '[class*="nav"] a, [class*="menu"] a, [class*="category"] a',
            '[id*="nav"] a, [id*="menu"] a'
        ];

        navSelectors.forEach(selector => {
            $(selector).each((i, elem) => {
                const text = $(elem).text().trim();
                const href = $(elem).attr('href') || '';

                // Filter out common non-category links
                const isNotCategory = text.toLowerCase().match(/^(home|about|contact|login|sign ?in|sign ?up|cart|checkout|account|help|support|careers|blog|terms|privacy|search|wishlist)$/);

                if (text && !isNotCategory && text.length > 2 && text.length < 50 && !seen.has(text.toLowerCase())) {
                    // Check if link looks like a category (not a product detail page)
                    const looksLikeCategory = href.includes('/category') ||
                        href.includes('/collection') ||
                        href.includes('/shop') ||
                        !href.includes('/product/') && !href.includes('/item/');

                    if (looksLikeCategory || href === '#' || href.startsWith('javascript:')) {
                        categories.push({
                            name: text,
                            source: 'navigation'
                        });
                        seen.add(text.toLowerCase());
                    }
                }
            });
        });

        // Strategy 2: Extract from category sections/cards on homepage
        const categorySectors = [
            '.category, .categories, [class*="category"]',
            '.collection, .collections, [class*="collection"]',
            '.department, .departments, [class*="department"]',
            '[class*="shop-by"]'
        ];

        categorySectors.forEach(selector => {
            $(selector).each((i, elem) => {
                const $elem = $(elem);
                // Look for category name in heading or link
                const categoryName = $elem.find('h2, h3, h4, a').first().text().trim();

                if (categoryName && categoryName.length > 2 && categoryName.length < 50 && !seen.has(categoryName.toLowerCase())) {
                    categories.push({
                        name: categoryName,
                        source: 'category-section'
                    });
                    seen.add(categoryName.toLowerCase());
                }
            });
        });

        return categories.slice(0, 15); // Limit to top 15 categories
    }

    extractPeopleFromPage($, pageUrl) {
        const people = [];
        const seen = new Set();

        // Strategy 0: Look for executive titles even without names (CXO, VP, Director)
        const executiveTitles = [
            'Chief Executive Officer', 'CEO', 'Chief Technology Officer', 'CTO',
            'Chief Financial Officer', 'CFO', 'Chief Operating Officer', 'COO',
            'Chief Marketing Officer', 'CMO', 'Chief Product Officer', 'CPO',
            'Chief Revenue Officer', 'CRO', 'Chief Information Officer', 'CIO',
            'Chief Human Resources Officer', 'CHRO', 'Chief Strategy Officer', 'CSO',
            'Founder', 'Co-Founder', 'President', 'Vice President', 'VP',
            'Managing Director', 'Director', 'Head of', 'Senior Vice President', 'SVP'
        ];

        // Find executive titles in text
        const allText = $('body').text();
        executiveTitles.forEach(title => {
            const titlePattern = new RegExp(`([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})[,\s-]+${title.replace(/[()]/g, '\\$&')}`, 'gi');
            const matches = [...allText.matchAll(titlePattern)];
            matches.forEach(match => {
                if (match[1]) {
                    const name = match[1].trim();
                    const words = name.split(/\s+/);
                    if (words.length >= 2 && words.length <= 4 && !seen.has(name.toLowerCase())) {
                        people.push({
                            name,
                            title: title,
                            source: 'executive-title-match'
                        });
                        seen.add(name.toLowerCase());
                    }
                }
            });
        });

        // Strategy 0.5: Look for header + body pattern (common in modern sites like Stripe)
        $('section, article, div').each((i, container) => {
            const $container = $(container);

            // Find header with name
            const $header = $container.find('header > h1, header > h2, header > h3, .Copy__header > h1').first();
            if ($header.length > 0) {
                const name = $header.text().trim();

                // Find body with title
                const $body = $container.find('.Copy__body p, > div > p, > p').first();
                const title = $body.text().trim();

                // Validate it looks like a person
                const words = name.split(/\s+/);
                if (name && title && words.length >= 2 && words.length <= 5 && !seen.has(name.toLowerCase())) {
                    people.push({
                        name,
                        title,
                        source: 'header-body'
                    });
                    seen.add(name.toLowerCase());
                }
            }
        });

        // Strategy 1: Look for structured person cards/sections
        const personSelectors = [
            '.team-member, .person, .leader, .executive, .founder',
            '[class*="team"], [class*="person"], [class*="leader"], [class*="member"]',
            'article.bio, .bio-card, .profile-card',
            '[itemtype*="Person"]' // Schema.org Person
        ];

        personSelectors.forEach(selector => {
            $(selector).each((i, elem) => {
                const $elem = $(elem);

                // Extract name from heading or name field
                let name = $elem.find('h2, h3, h4, .name, [itemprop="name"]').first().text().trim();

                // Extract title/role
                let title = $elem.find('.title, .role, .position, [itemprop="jobTitle"]').first().text().trim();

                // If no explicit title, look for any descriptor text
                if (!title) {
                    const allText = $elem.text();
                    const lines = allText.split('\\n').map(l => l.trim()).filter(l => l && l !== name);
                    if (lines.length > 0) {
                        title = lines[0];
                    }
                }

                if (name && name.length > 2 && name.length < 100 && !seen.has(name.toLowerCase())) {
                    people.push({
                        name,
                        title: title || '',
                        source: 'structured'
                    });
                    seen.add(name.toLowerCase());
                }
            });
        });

        // Strategy 2: Look for list-based people (About pages often use lists)
        $('ul, ol').each((i, list) => {
            const $list = $(list);

            // Check if list context suggests people
            const prevHeading = $list.prevAll('h1, h2, h3, h4').first().text().toLowerCase();
            const isPeopleList = prevHeading.includes('team') ||
                prevHeading.includes('leadership') ||
                prevHeading.includes('management') ||
                prevHeading.includes('founder') ||
                prevHeading.includes('executive');

            if (isPeopleList) {
                $list.find('li').each((j, item) => {
                    const $item = $(item);

                    // Try to extract name and title
                    const heading = $item.find('h2, h3, h4, h5, strong, b').first().text().trim();
                    const restText = $item.text().replace(heading, '').trim();

                    // Name should be 2-4 words typically
                    const words = heading.split(/\\s+/);
                    if (heading && words.length >= 2 && words.length <= 5 && !seen.has(heading.toLowerCase())) {
                        people.push({
                            name: heading,
                            title: restText.substring(0, 200) || '',
                            source: 'list'
                        });
                        seen.add(heading.toLowerCase());
                    }
                });
            }
        });

        // Strategy 3: Extract from heading + paragraph patterns (common in About pages)
        $('h2, h3, h4').each((i, heading) => {
            const $heading = $(heading);
            const headingText = $heading.text().trim();

            // Check if heading looks like a name (2-4 words, capitalized)
            const words = headingText.split(/\\s+/);
            const looksLikeName = words.length >= 2 && words.length <= 4 &&
                words.every(w => w[0] === w[0].toUpperCase());

            if (looksLikeName && !seen.has(headingText.toLowerCase())) {
                const nextP = $heading.next('p').text().trim();
                const title = nextP.split('.')[0].substring(0, 200); // First sentence

                if (title) {
                    people.push({
                        name: headingText,
                        title,
                        source: 'heading-paragraph'
                    });
                    seen.add(headingText.toLowerCase());
                }
            }
        });

        return people.slice(0, 20); // Limit to 20 people per page
    }
}

module.exports = new WebsiteScraper();
