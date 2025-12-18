/**
 * Heuristic extractor - uses regex and pattern matching
 * NO LLM - pure deterministic extraction
 */
const locationExtractor = require('./locationExtractor');

class HeuristicExtractor {
    async extract(scrapedData) {
        const allText = this.combineText(scrapedData.pages);
        const allHtml = this.combineHtml(scrapedData.pages);
        const companyName = this.extractCompanyName(scrapedData.pages);

        // Extract locations (async - can use Google Maps API)
        const locations = await locationExtractor.extractLocations(
            scrapedData,
            { companyName },
            companyName
        );

        return {
            domain: scrapedData.domain,
            companyName,
            emails: this.extractEmails(allText),
            phones: this.extractPhones(allText),
            socialMedia: this.extractSocialMedia(scrapedData.pages),
            techStack: this.extractTechStack(scrapedData.pages),
            logoUrl: this.extractLogo(scrapedData.pages, scrapedData.domain),
            products: this.extractProducts(scrapedData.pages),
            people: this.extractPeople(scrapedData.pages),
            locations
        };
    }

    combineText(pages) {
        return pages.map(p => p.text).join('\n\n');
    }

    combineHtml(pages) {
        return pages.map(p => p.html).join('\n');
    }

    extractCompanyName(pages) {
        // Try meta tags first
        for (const page of pages) {
            if (page.title) {
                // Clean up title (remove common suffixes)
                const title = page.title
                    .replace(/\s*[\|\-–—]\s*(Home|Official|Website).*$/i, '')
                    .trim();

                if (title && title.length < 100) {
                    return title;
                }
            }
        }

        return '';
    }

    extractEmails(text) {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = text.match(emailRegex) || [];

        // Filter out common fake emails
        const filtered = emails.filter(email =>
            !email.includes('example.com') &&
            !email.includes('test.com') &&
            !email.includes('domain.com')
        );

        return [...new Set(filtered)]; // Remove duplicates
    }

    extractPhones(text) {
        // Match various phone formats
        const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        const phones = text.match(phoneRegex) || [];

        // Clean and deduplicate
        const cleaned = phones.map(p => p.trim()).filter(p => p.length >= 10);
        return [...new Set(cleaned)];
    }

    extractSocialMedia(pages) {
        const social = {
            linkedin: '',
            twitter: '',
            facebook: '',
            instagram: ''
        };

        const allLinks = pages.flatMap(p => p.links.map(l => l.url));

        for (const url of allLinks) {
            if (url.includes('linkedin.com/company/')) {
                social.linkedin = url;
            } else if (url.includes('twitter.com/') || url.includes('x.com/')) {
                social.twitter = url;
            } else if (url.includes('facebook.com/')) {
                social.facebook = url;
            } else if (url.includes('instagram.com/')) {
                social.instagram = url;
            }
        }

        return social;
    }

    extractTechStack(pages) {
        const techSet = new Set();

        for (const page of pages) {
            if (page.techStack) {
                page.techStack.forEach(tech => techSet.add(tech));
            }
        }

        return Array.from(techSet);
    }

    extractLogo(pages, domain) {
        const logoCandidates = [];

        // Strategy 1: Look for images with "logo" in alt or src
        for (const page of pages) {
            if (!page.images || !Array.isArray(page.images)) continue;

            for (const img of page.images) {
                if (!img || !img.url) continue;

                const alt = (img.alt || '').toLowerCase();
                const url = img.url.toLowerCase();

                let score = 0;

                // High priority indicators
                if (alt === 'logo' || url.endsWith('/logo.png') || url.endsWith('/logo.svg')) score += 50;
                if (alt.includes('logo') && alt.length < 20) score += 30;
                if (url.includes('/logo')) score += 25;
                if (url.includes('/brand')) score += 20;

                // Medium priority indicators
                if (alt.includes('brand')) score += 15;
                if (url.match(/header|nav|top/)) score += 10;

                // Image dimensions (smaller logos are often actual logos)
                const urlLower = url.toLowerCase();
                if (urlLower.match(/\d+x\d+/) && urlLower.match(/(200|150|100|80)x(200|150|100|80)/)) score += 15;

                // File format preference
                if (url.endsWith('.svg')) score += 10; // SVG usually logo
                if (url.endsWith('.png')) score += 5;

                if (score > 0) {
                    logoCandidates.push({ url: img.url, score });
                }
            }

            // Strategy 2: Check meta tags (og:image, schema.org)
            if (page.html) {
                const ogImageMatch = page.html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                if (ogImageMatch && ogImageMatch[1]) {
                    const url = ogImageMatch[1].toLowerCase();
                    if (url.includes('logo') || url.includes('brand')) {
                        logoCandidates.push({ url: ogImageMatch[1], score: 35 });
                    }
                }

                // Schema.org logo
                const schemaLogoMatch = page.html.match(/"logo"\s*:\s*["']([^"']+)["']/i);
                if (schemaLogoMatch && schemaLogoMatch[1]) {
                    logoCandidates.push({ url: schemaLogoMatch[1], score: 40 });
                }

                // Link rel icon (as fallback)
                const iconMatch = page.html.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i);
                if (iconMatch && iconMatch[1] && (iconMatch[1].endsWith('.svg') || iconMatch[1].endsWith('.png'))) {
                    logoCandidates.push({ url: iconMatch[1], score: 5 });
                }
            }
        }

        // Sort by score and return best
        if (logoCandidates.length > 0) {
            logoCandidates.sort((a, b) => b.score - a.score);
            // Return the highest scoring logo
            const bestLogo = logoCandidates[0];
            if (bestLogo && bestLogo.url) {
                return bestLogo.url;
            }
        }

        // Fallback: try common logo paths (return first as attempt)
        const commonPaths = [
            '/logo.svg',
            '/logo.png',
            '/images/logo.svg',
            '/images/logo.png',
            '/assets/logo.svg',
            '/assets/logo.png',
            '/static/logo.svg',
            '/img/logo.svg',
            '/img/logo.png'
        ];

        // Try to construct full URL for first common path
        if (domain) {
            const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
            return `${baseUrl}${commonPaths[0]}`; // Return first common path as fallback
        }

        return '';
    }

    extractProducts(pages) {
        const products = [];

        // Collect all structured products from scraper
        pages.forEach(page => {
            if (page.productSections && page.productSections.length > 0) {
                products.push(...page.productSections);
            }
        });

        // If no products found, try text-based extraction
        if (products.length === 0) {
            // Look for section headings that suggest products
            pages.forEach(page => {
                const text = page.text;
                const urlLower = page.url.toLowerCase();

                // Only extract from relevant pages
                if (urlLower.includes('product') || urlLower.includes('service') ||
                    urlLower.includes('solution') || urlLower.includes('offering')) {

                    // Try to match product descriptions
                    const lines = text.split('\n');
                    let currentHeading = '';

                    lines.forEach(line => {
                        line = line.trim();

                        // Check if line looks like a heading (short, ends with colon or is all caps)
                        if (line.length > 5 && line.length < 100) {
                            if (line.endsWith(':') || line === line.toUpperCase()) {
                                currentHeading = line.replace(':', '').trim();
                            }
                        }

                        // Check if next lines are description
                        if (currentHeading && line.length > 20 && line.length < 500 &&
                            !line.endsWith(':') && line !== line.toUpperCase()) {
                            products.push({
                                name: currentHeading,
                                description: line,
                                source: 'text-pattern'
                            });
                            currentHeading = ''; // Reset after match
                        }
                    });
                }
            });
        }

        // Remove duplicates
        const unique = [];
        const seen = new Set();
        products.forEach(p => {
            const key = p.name.toLowerCase();
            if (!seen.has(key) && p.name.length > 3) {
                seen.add(key);
                unique.push(p);
            }
        });

        return unique.slice(0, 20); // Limit to 20
    }

    extractPeople(pages) {
        const people = [];

        // Collect all people from scraper
        pages.forEach(page => {
            if (page.peopleData && page.peopleData.length > 0) {
                people.push(...page.peopleData);
            }
        });

        // Remove duplicates based on name
        const unique = [];
        const seen = new Set();
        people.forEach(p => {
            const key = p.name.toLowerCase().trim();
            if (key && !seen.has(key) && p.name.length > 2) {
                seen.add(key);
                // Infer role category from title
                const roleCategory = this.inferRoleCategory(p.title);
                unique.push({
                    name: p.name,
                    title: p.title || '',
                    role_category: roleCategory
                });
            }
        });

        return unique;
    }

    inferRoleCategory(title) {
        if (!title) return 'Other';

        const titleLower = title.toLowerCase();

        // Leadership keywords
        if (titleLower.match(/ceo|chief executive|president|founder|co-founder|managing director|chairman/)) {
            return 'Leadership';
        }

        // Engineering keywords
        if (titleLower.match(/cto|chief technology|engineer|developer|architect|technical|vp.*engineering|head.*engineering/)) {
            return 'Engineering';
        }

        // Sales keywords
        if (titleLower.match(/sales|business development|account|revenue|cro|chief revenue/)) {
            return 'Sales';
        }

        // Marketing keywords
        if (titleLower.match(/marketing|cmo|chief marketing|brand|communications|pr|public relations/)) {
            return 'Marketing';
        }

        return 'Other';
    }
}

module.exports = new HeuristicExtractor();
