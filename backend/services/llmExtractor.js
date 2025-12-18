const axios = require('axios');
const SubIndustryMatcher = require('./subIndustryMatcher');

/**
 * LLM Extractor - Converts scraped content into STRICT JSON
 * Uses OpenAI, Anthropic Claude, or Ollama
 * CRITICAL: Returns only valid JSON, no prose
 * Prioritizes CSV-based sub-industry matching over LLM guessing
 */
class LLMExtractor {
    constructor() {
        this.provider = process.env.LLM_PROVIDER || 'ollama';
        this.subIndustryMatcher = new SubIndustryMatcher();

        if (this.provider === 'openai') {
            this.apiKey = process.env.OPENAI_API_KEY;
        } else if (this.provider === 'anthropic') {
            this.apiKey = process.env.ANTHROPIC_API_KEY;
        } else if (this.provider === 'ollama') {
            this.ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
            this.ollamaModel = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
        }
    }

    async extractCompanyData(scrapedData, heuristicData) {
        // Prepare context for LLM
        const context = this.prepareContext(scrapedData, heuristicData);

        // STEP 1: Try CSV-based sub-industry matching first
        const csvMatches = this.subIndustryMatcher.findMatches(
            context.text,
            heuristicData.companyName,
            scrapedData.domain
        );

        console.log(`CSV Matcher found ${csvMatches.length} matches`);
        if (csvMatches.length > 0) {
            console.log('Top CSV match:', csvMatches[0].sub_industry, 'Score:', csvMatches[0].score);
        }

        // Generate prompt (may include CSV guidance)
        const prompt = this.generateExtractionPrompt(context, csvMatches);

        // Call LLM
        const llmResponse = await this.callLLM(prompt);

        // Parse and validate JSON
        const companyData = this.parseAndValidate(llmResponse);

        // STEP 2: If CSV has good matches, override LLM's sub-industry guess
        if (csvMatches.length > 0 && csvMatches[0].score > 20) {
            const bestMatch = csvMatches[0];
            companyData.company.sub_industry = bestMatch.sub_industry;
            companyData.company.industry = bestMatch.industry;
            // Store full CSV data for frontend
            companyData.company.csv_details = {
                sector: bestMatch.sector,
                industry: bestMatch.industry,
                sub_industry: bestMatch.sub_industry,
                sic_code: bestMatch.sic_code,
                sic_description: bestMatch.sic_description,
                match_score: bestMatch.score
            };
            console.log('Overriding LLM with CSV match:', bestMatch.sub_industry);
        }

        // STEP 3: Validate products for marketplaces - ensure minimum count and no taxonomy leakage
        if (context.companyType === 'B2C_MARKETPLACE') {
            const validationResult = this.validateMarketplaceProducts(companyData.products_services, context, companyData.company);
            if (!validationResult.valid) {
                console.warn('WARNING: Marketplace products validation failed:', validationResult.reason);
                companyData.products_services = this.generateFallbackProducts(context, companyData.company);
            }
        } else if (!companyData.products_services || companyData.products_services.length === 0) {
            // For other types, just ensure not empty
            console.warn('WARNING: products_services is empty, applying fallback extraction');
            companyData.products_services = this.generateFallbackProducts(context, companyData.company);
        }

        // STEP 4: Validate people - ensure array is NEVER empty
        if (!companyData.people || companyData.people.length === 0) {
            console.warn('WARNING: people array is empty, applying fallback extraction');
            companyData.people = this.generateFallbackPeople(context, companyData.company);
        }

        // STEP 5: Validate descriptions - ensure NEVER empty
        if (!companyData.company.short_description || companyData.company.short_description.trim().length < 10) {
            console.warn('WARNING: short_description is empty or too short, generating fallback');
            companyData.company.short_description = this.generateFallbackShortDescription(heuristicData.companyName, context);
        }
        if (!companyData.company.long_description || companyData.company.long_description.trim().length < 50) {
            console.warn('WARNING: long_description is empty or too short, generating fallback');
            companyData.company.long_description = this.generateFallbackLongDescription(heuristicData.companyName, context, companyData.company.short_description);
        }

        // STEP 6: Ensure domain is always set
        if (!companyData.company.domain) {
            companyData.company.domain = context.domain;
        }

        // Merge with heuristic data (heuristic data takes precedence where available)
        return this.mergeData(companyData, heuristicData);
    }

    validateMarketplaceProducts(products, context, companyInfo) {
        if (!products || products.length === 0) {
            return { valid: false, reason: 'No products found' };
        }

        // Check if products contain industry/sub-industry labels (taxonomy leakage)
        const industryLabel = companyInfo.sub_industry?.toLowerCase() || '';
        const hasIndustryLeakage = products.some(p =>
            p.name.toLowerCase() === industryLabel ||
            p.name.toLowerCase().includes(industryLabel)
        );

        if (hasIndustryLeakage && products.length === 1) {
            return { valid: false, reason: 'Single product matches industry taxonomy - likely incorrect extraction' };
        }

        // For marketplaces, require minimum 3 products
        if (products.length < 3) {
            return { valid: false, reason: `Only ${products.length} products found, marketplace needs ≥3 categories` };
        }

        return { valid: true };
    }

    generateFallbackProducts(context, companyInfo) {
        const products = [];
        const type = context.companyType;
        const text = context.text.toLowerCase();

        if (type === 'B2C_MARKETPLACE') {
            // PRIORITY 1: Use navigation categories if available
            if (context.navigationCategories && context.navigationCategories.length >= 3) {
                console.log('Using navigation categories as products');
                context.navigationCategories.forEach(cat => {
                    products.push({
                        name: cat.name,
                        description: `Wide range of ${cat.name.toLowerCase()} products available for online shopping and delivery`
                    });
                });
            } else {
                // FALLBACK: Extract categories from text patterns
                const categoryMatches = text.match(/\b(fashion|electronics|mobile|laptop|home|kitchen|beauty|grocery|books|toys|sports|appliances|clothing|footwear|accessories|furniture|appliances)\b/gi) || [];
                const uniqueCategories = [...new Set(categoryMatches.map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()))];

                uniqueCategories.slice(0, 5).forEach(cat => {
                    products.push({
                        name: cat,
                        description: `Wide range of ${cat.toLowerCase()} products available for online shopping`
                    });
                });
            }

            // Add platform capabilities as services
            products.push({
                name: 'Online Shopping Platform',
                description: `E-commerce marketplace enabling customers to browse, purchase, and receive products with secure payment and delivery options`
            });

            products.push({
                name: 'Seller Marketplace Services',
                description: `Platform enabling sellers to list products, manage inventory, and reach customers across the region`
            });

        } else if (type === 'CONSUMER_PLATFORM') {
            // Detect platform type
            if (text.includes('food') || text.includes('restaurant') || text.includes('delivery')) {
                products.push({
                    name: 'Food Delivery Service',
                    description: 'Platform connecting customers with restaurants for online food ordering and delivery'
                });
            }
            if (text.includes('ride') || text.includes('cab') || text.includes('driver')) {
                products.push({
                    name: 'Ride Booking Service',
                    description: 'Platform for booking rides and connecting with drivers for transportation'
                });
            }
            if (text.includes('grocery')) {
                products.push({
                    name: 'Grocery Delivery',
                    description: 'Online grocery shopping and home delivery service'
                });
            }

        } else {
            // Generic fallback
            products.push({
                name: companyInfo.name || 'Platform Service',
                description: companyInfo.short_description || companyInfo.long_description || 'Digital platform providing services to customers'
            });
        }

        return products.length > 0 ? products : [
            {
                name: 'Core Platform',
                description: 'Main service offering of the company'
            }
        ];
    }

    generateFallbackPeople(context, companyInfo) {
        const people = [];
        const type = context.companyType;
        const text = context.text.toLowerCase();

        // TIER 2: Check if leadership pages are linked but not scraped
        const hasLeadershipLinks = text.includes('leadership') ||
            text.includes('our team') ||
            text.includes('management') ||
            text.includes('board of directors');

        if (hasLeadershipLinks) {
            // Add role placeholders for common leadership positions
            people.push(
                {
                    name: '',
                    title: 'Chief Executive Officer',
                    role_category: 'Leadership'
                },
                {
                    name: '',
                    title: 'Leadership Team',
                    role_category: 'Leadership'
                }
            );
        } else {
            // TIER 3: Functional roles based on company type
            if (type === 'B2C_MARKETPLACE') {
                people.push(
                    {
                        name: '',
                        title: 'Platform Operations Team',
                        role_category: 'Operations'
                    },
                    {
                        name: '',
                        title: 'Seller Management & Support',
                        role_category: 'Other'
                    },
                    {
                        name: '',
                        title: 'Engineering & Technology',
                        role_category: 'Engineering'
                    }
                );
            } else if (type === 'CONSUMER_PLATFORM') {
                people.push(
                    {
                        name: '',
                        title: 'Operations & Service Delivery',
                        role_category: 'Operations'
                    },
                    {
                        name: '',
                        title: 'Technology & Product',
                        role_category: 'Engineering'
                    }
                );
            } else if (type === 'B2B_SAAS') {
                people.push(
                    {
                        name: '',
                        title: 'Product & Engineering',
                        role_category: 'Engineering'
                    },
                    {
                        name: '',
                        title: 'Sales & Customer Success',
                        role_category: 'Sales'
                    }
                );
            } else {
                // TIER 4: Generic "not disclosed" entry
                people.push({
                    name: '',
                    title: 'Leadership information not publicly disclosed',
                    role_category: 'Other'
                });
            }
        }

        return people;
    }

    generateFallbackShortDescription(companyName, context) {
        // Try to extract from homepage title or meta description
        if (context.text && context.text.length > 0) {
            const firstPage = context.text.split('---')[0];
            const metaMatch = firstPage.match(/META:\s*([^\n]{20,200})/);
            if (metaMatch && metaMatch[1]) {
                return metaMatch[1].trim();
            }
        }

        // Fallback: Generate based on industry/type
        const type = context.companyType || 'OTHER';
        const name = companyName || 'This company';

        if (type === 'B2C_MARKETPLACE') {
            return `${name} is an online marketplace platform connecting buyers and sellers.`;
        } else if (type === 'CONSUMER_PLATFORM') {
            return `${name} is a consumer platform providing digital services to users.`;
        } else if (type === 'B2B_SAAS') {
            return `${name} provides software solutions for businesses.`;
        } else if (type === 'CONTENT_MEDIA') {
            return `${name} is a media and content platform.`;
        } else {
            return `${name} is a company providing products and services to customers.`;
        }
    }

    generateFallbackLongDescription(companyName, context, shortDesc) {
        const name = companyName || 'This company';
        const domain = context.domain || 'their website';
        const type = context.companyType || 'OTHER';

        let description = shortDesc + ' ';

        // Add context-based information
        if (type === 'B2C_MARKETPLACE') {
            description += `The platform enables users to discover and purchase products from multiple sellers in one convenient location. ${name} focuses on providing a seamless shopping experience with secure transactions and reliable delivery services. `;
        } else if (type === 'CONSUMER_PLATFORM') {
            description += `Through their digital platform, ${name} delivers convenient services directly to consumers, leveraging technology to enhance user experience. The company operates in the consumer services sector, focusing on meeting customer needs efficiently. `;
        } else if (type === 'B2B_SAAS') {
            description += `${name} offers cloud-based software solutions designed to help businesses streamline their operations and improve productivity. Their platform serves companies looking to digitize and optimize their business processes. `;
        } else {
            description += `${name} operates in their industry sector, serving customers through ${domain}. The company is committed to delivering quality products and services to meet market demands. `;
        }

        // Add generic closing
        description += `For more information about ${name} and their offerings, visit their official website.`;

        return description;
    }

    prepareContext(scrapedData, heuristicData) {
        // Combine text from all pages (limit size)
        const combinedText = scrapedData.pages
            .map(p => `PAGE: ${p.url}\nTITLE: ${p.title}\nMETA: ${p.metaDescription}\nCONTENT:\n${p.text}`)
            .join('\n\n---\n\n')
            .substring(0, 30000); // Limit to ~30k chars

        // Extract structured product sections from scraper AND heuristics
        const structuredProducts = [];
        const navigationCategories = [];

        // From scraper - product sections
        scrapedData.pages.forEach(page => {
            if (page.productSections && page.productSections.length > 0) {
                structuredProducts.push(...page.productSections);
            }
            // From scraper - navigation categories
            if (page.navigationCategories && page.navigationCategories.length > 0) {
                navigationCategories.push(...page.navigationCategories);
            }
        });

        // From heuristics
        if (heuristicData.products && heuristicData.products.length > 0) {
            structuredProducts.push(...heuristicData.products);
        }

        // Extract people from scraper AND heuristics
        const structuredPeople = [];
        scrapedData.pages.forEach(page => {
            if (page.peopleData && page.peopleData.length > 0) {
                structuredPeople.push(...page.peopleData);
            }
        });
        if (heuristicData.people && heuristicData.people.length > 0) {
            structuredPeople.push(...heuristicData.people);
        }

        // Remove duplicates
        const uniqueProducts = [];
        const seen = new Set();
        structuredProducts.forEach(p => {
            const key = p.name.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueProducts.push(p);
            }
        });

        // Remove duplicate categories
        const uniqueCategories = [];
        const seenCats = new Set();
        navigationCategories.forEach(cat => {
            const key = cat.name.toLowerCase();
            if (!seenCats.has(key)) {
                seenCats.add(key);
                uniqueCategories.push(cat);
            }
        });

        // Remove duplicate people
        const uniquePeople = [];
        const seenPeople = new Set();
        structuredPeople.forEach(p => {
            const key = p.name.toLowerCase().trim();
            if (key && key.length > 2 && !seenPeople.has(key)) {
                seenPeople.add(key);
                uniquePeople.push(p);
            }
        });

        // Infer company type from content
        const companyType = this.inferCompanyType(combinedText, scrapedData.pages);
        console.log('Inferred company type:', companyType);
        console.log('Navigation categories found:', uniqueCategories.length);
        console.log('Structured people found:', uniquePeople.length);

        return {
            domain: scrapedData.domain,
            text: combinedText,
            heuristics: heuristicData,
            structuredProducts: uniqueProducts,
            navigationCategories: uniqueCategories,
            structuredPeople: uniquePeople,
            companyType
        };
    }

    inferCompanyType(text, pages) {
        const textLower = text.toLowerCase();
        const urls = pages.map(p => p.url.toLowerCase()).join(' ');
        const combined = textLower + ' ' + urls;

        // B2C Marketplace signals
        const marketplaceScore = (
            (combined.match(/\b(marketplace|shop|buy|sell|cart|checkout|sellers|vendors|products|categories|deals|offers|browse|add to cart)\b/g) || []).length * 2 +
            (combined.match(/\b(fashion|electronics|grocery|home|kitchen|books|toys|beauty|accessories)\b/g) || []).length +
            (combined.match(/\b(delivery|shipping|order|track order|returns|refund)\b/g) || []).length
        );

        // Consumer Platform signals (food, transport, services)
        const platformScore = (
            (combined.match(/\b(delivery|rides?|drivers?|restaurants?|food|menu|book now|track|live tracking)\b/g) || []).length * 2 +
            (combined.match(/\b(customers?|users?|order now|get started|download app)\b/g) || []).length
        );

        // B2B SaaS signals
        const saasScore = (
            (combined.match(/\b(api|integration|enterprise|business|solution|platform|dashboard|analytics|workspace|collaboration|management|automation)\b/g) || []).length * 2 +
            (combined.match(/\b(pricing|plans|features|documentation|developers|free trial|sign up|demo)\b/g) || []).length +
            (combined.match(/\b(teams?|organizations?|companies|businesses)\b/g) || []).length
        );

        // Content/Media signals
        const mediaScore = (
            (combined.match(/\b(watch|stream|video|news|article|blog|content|media|entertainment|shows?)\b/g) || []).length * 2 +
            (combined.match(/\b(subscribe|channel|playlist|episodes?)\b/g) || []).length
        );

        // Enterprise Tech signals
        const enterpriseScore = (
            (combined.match(/\b(infrastructure|cloud|security|compliance|scalable|deployment|kubernetes|database|server)\b/g) || []).length * 2 +
            (combined.match(/\b(enterprise|mission critical|high availability|disaster recovery)\b/g) || []).length
        );

        // Determine type based on highest score
        const scores = {
            B2C_MARKETPLACE: marketplaceScore,
            CONSUMER_PLATFORM: platformScore,
            B2B_SAAS: saasScore,
            CONTENT_MEDIA: mediaScore,
            ENTERPRISE_TECH: enterpriseScore
        };

        const maxScore = Math.max(...Object.values(scores));
        const companyType = Object.keys(scores).find(key => scores[key] === maxScore);

        // Default to OTHER if scores are too low
        return maxScore < 5 ? 'OTHER' : companyType;
    }

    generateExtractionPrompt(context, csvMatches = []) {
        // Add CSV guidance if matches found
        let csvGuidance = '';
        if (csvMatches.length > 0) {
            const top5 = csvMatches.slice(0, 5);
            csvGuidance = `\n\nSUGGESTED SUB-INDUSTRIES (from database):
${top5.map((m, i) => `${i + 1}. ${m.sub_industry} (Industry: ${m.industry}, Sector: ${m.sector})`).join('\n')}

IMPORTANT: If any of these suggested sub-industries match the company, use it EXACTLY as shown above.`;
        }

        // Add structured products if available
        let productGuidance = '';
        if (context.structuredProducts && context.structuredProducts.length > 0) {
            productGuidance = `\n\nSTRUCTURED PRODUCTS/SERVICES FOUND (use these if accurate):
${context.structuredProducts.slice(0, 15).map((p, i) =>
                `${i + 1}. ${p.name}${p.description ? `: ${p.description.substring(0, 150)}` : ''}`
            ).join('\n')}

IMPORTANT: Use these structured products if they accurately represent the company's offerings. You can refine descriptions but keep product names.`;
        }

        // Add navigation categories if available (for marketplaces)
        let categoryGuidance = '';
        if (context.navigationCategories && context.navigationCategories.length > 0) {
            categoryGuidance = `\n\nNAVIGATION CATEGORIES FOUND (for marketplaces - use ALL of these as products):
${context.navigationCategories.slice(0, 15).map((cat, i) => `${i + 1}. ${cat.name}`).join('\n')}

CRITICAL FOR MARKETPLACES: These are product categories from site navigation. Include ALL of them as products with appropriate descriptions.`;
        }

        // Add people guidance if available
        let peopleGuidance = '';
        if (context.structuredPeople && context.structuredPeople.length > 0) {
            peopleGuidance = `\n\nSTRUCTURED PEOPLE FOUND (leadership/team extracted from website):
${context.structuredPeople.slice(0, 20).map((p, i) =>
                `${i + 1}. ${p.name}${p.title ? ` - ${p.title}` : ''}`
            ).join('\n')}

CRITICAL: Use these actual people found on the website. DO NOT replace with placeholders. You MUST include all real names found above.`;
        }

        // Add company-type-specific extraction guidance
        let typeGuidance = '';
        if (context.companyType === 'B2C_MARKETPLACE') {
            typeGuidance = `\n\nCOMPANY TYPE: B2C MARKETPLACE/E-COMMERCE
🚨 CRITICAL RULES FOR MARKETPLACES:
1. NEVER use industry/sub-industry labels as products
2. Extract NAVIGATION CATEGORIES listed above as products
3. If ≥3 categories found → Use ALL of them, do NOT pick just one
4. Add platform capabilities as additional services
5. Each category needs a description (what products are in that category)
6. Minimum 3 products for a functioning marketplace
7. DO NOT collapse multiple categories into a single item`;
        } else if (context.companyType === 'CONSUMER_PLATFORM') {
            typeGuidance = `\n\nCOMPANY TYPE: CONSUMER PLATFORM
FOR PLATFORMS (like Swiggy, Zomato, Uber, Ola):
- DO NOT leave products_services empty
- Extract platform VERTICALS as products (Food Delivery, Grocery Delivery, Ride Services, etc.)
- Extract user-facing FEATURES as services (Real-time Tracking, Payment Options, Restaurant Discovery, etc.)
- Describe what users can DO on the platform
- Minimum 2-4 products for a functioning platform`;
        } else if (context.companyType === 'B2B_SAAS') {
            typeGuidance = `\n\nCOMPANY TYPE: B2B SAAS
FOR SAAS PRODUCTS:
- Extract actual product/service names
- Extract feature sets as separate products if distinct
- Each product needs technical description`;
        } else if (context.companyType === 'CONTENT_MEDIA') {
            typeGuidance = `\n\nCOMPANY TYPE: CONTENT/MEDIA
FOR MEDIA PLATFORMS:
- Extract content categories/types as products
- Extract platform features as services
- Describe content offerings and distribution capabilities`;
        }

        return `You are a data extraction engine. Your ONLY job is to extract company information from website content and output STRICT JSON.

DOMAIN: ${context.domain}

WEBSITE CONTENT:
${context.text}

KNOWN DATA (use if available):
- Company Name: ${context.heuristics.companyName || 'unknown'}
- Emails: ${context.heuristics.emails.join(', ') || 'none'}
- Phones: ${context.heuristics.phones.join(', ') || 'none'}
- Social Media: ${JSON.stringify(context.heuristics.socialMedia)}
- Tech Stack: ${context.heuristics.techStack.join(', ') || 'none'}
- Headquarters: ${context.heuristics.locations?.headquarters || 'unknown'}
- Office Locations: ${context.heuristics.locations?.offices?.join(', ') || 'none'}
- Addresses: ${context.heuristics.locations?.addresses?.join(' | ') || 'none'}${csvGuidance}${categoryGuidance}${productGuidance}${peopleGuidance}${typeGuidance}

YOUR TASK:
Extract company information and output ONLY valid JSON in this EXACT structure:

{
  "company": {
    "name": "",
    "domain": "${context.domain}",
    "logo_url": "${context.heuristics.logoUrl || ''}",
    "short_description": "",
    "long_description": "",
    "industry": "",
    "sub_industry": ""
  },
  "products_services": [
    {
      "name": "",
      "description": ""
    }
  ],
  "locations": {
    "headquarters": ""
  },
  "people": [
    {
      "name": "",
      "title": "",
      "role_category": "Leadership | Engineering | Sales | Marketing | Other"
    }
  ],
  "contact": {
    "emails": ${JSON.stringify(context.heuristics.emails)},
    "phones": ${JSON.stringify(context.heuristics.phones)},
    "contact_page": ""
  },
  "social_media": ${JSON.stringify(context.heuristics.socialMedia)},
  "tech_stack": ${JSON.stringify(context.heuristics.techStack)}
}

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanation, no prose
2. If data not found → use empty string "" or empty array []
3. NEVER hallucinate - use only scraped content

4. 🚨 ABSOLUTE SEPARATION OF CONCERNS:
   - industry/sub_industry = classification labels ONLY
   - products_services = actual offerings/categories from website
   - NEVER use industry/sub_industry labels to populate products_services
   - These fields must be completely independent

5. For products_services (MANDATORY - NEVER EMPTY):
   
   IF B2C_MARKETPLACE:
   - Use navigation categories provided above (if available, use ALL of them)
   - DO NOT pick single "best match" - include all categories
   - Add platform capabilities as services
   - Minimum 3 products
   - FORBIDDEN: Using industry label as product name
   
   IF CONSUMER_PLATFORM:
   - Extract service verticals (Food Delivery, Grocery, Rides, etc.)
   - Extract platform features (Tracking, Payments, Discovery, etc.)
   - Minimum 2 products
   
   IF B2B_SAAS:
   - Extract actual product names and feature sets
   - Minimum 1 product
   
   IF NO CLEAR PRODUCTS:
   - Describe main platform/service as a product
   - Extract any capabilities/functions as products
   
   GLOBAL RULE: products_services can ONLY be empty if site is non-functional/dead

6. For people array (MANDATORY - MULTI-TIER EXTRACTION):
   
   TIER 1 - EXPLICIT PEOPLE (Highest Priority):
   - Extract ONLY if names appear on: About Us, Leadership, Team, Company pages
   - Include name, title, role_category
   - NEVER hallucinate or guess names
   
   TIER 2 - ROLE PLACEHOLDERS (If leadership page exists but not scraped):
   - Add role-based entries WITHOUT names
   - Example: {"name": "", "title": "Chief Executive Officer", "role_category": "Leadership"}
   - This is better than empty array
   
   TIER 3 - FUNCTIONAL ROLES (If no people info available):
   - Infer organizational roles from platform capabilities
   - Examples: Platform Operations Team, Engineering & Technology, Customer Support
   - Format: {"name": "", "title": "Platform Operations Team", "role_category": "Operations"}
   
   TIER 4 - EXPLICIT DISCLOSURE (Last resort):
   - If absolutely no signals: {"name": "", "title": "Leadership information not publicly disclosed", "role_category": "Other"}
   
   🚨 CRITICAL: people array must contain at least 1 entry. Empty array = UI failure.
   
   FORBIDDEN: Hallucinating CEO names, scraping LinkedIn, guessing founders

7. For locations object (MANDATORY):
   - headquarters: Must be "City, Country" format (e.g., "San Francisco, USA", "Mumbai, India", "London, UK")
   - If headquarters shown in KNOWN DATA above, use it EXACTLY
   - If no explicit location in KNOWN DATA, extract from website content:
     * Contact page addresses
     * "About Us" / "Company" page mentions
     * Copyright notices (e.g., "© 2024 Company Inc, California")
     * Press releases mentioning locations
   - MINIMUM: headquarters must have a valid city/country value

8. 🚨 Short description (MANDATORY - NEVER EMPTY):
   - 1-2 sentences summarizing what the company does
   - If homepage has tagline/hero text, use that
   - Must be present even if generic: "[Company] provides [service/product] to [audience]"
   - Examples: "Stripe provides payment processing for online businesses", "Netflix is a streaming service for movies and TV shows"
   
9. 🚨 Long description (MANDATORY - NEVER EMPTY):
   - COMPREHENSIVE 3-5 paragraph description including:
   - Company overview and what they do
   - Company history, founding story, or milestones (if available)
   - Mission, vision, or core values (if mentioned)
   - Scale/reach: number of customers, users, markets served, global presence
   - Key differentiators or competitive advantages
   - Growth trajectory or future plans (if mentioned)
   MINIMUM: 150 words, MAXIMUM: 500 words
   Extract from: About Us, Company, Our Story, Mission pages
   If detailed info not available: combine multiple sections to build comprehensive description
10. Industry examples: "Technology", "Healthcare", "Finance", "E-commerce", etc.
11. Role categories: MUST be one of: Leadership, Engineering, Sales, Marketing, Other
12. Each product MUST have both name and description (at least 10 words for description)

OUTPUT JSON NOW:`;
    }

    async callLLM(prompt) {
        if (this.provider === 'openai') {
            return await this.callOpenAI(prompt);
        } else if (this.provider === 'anthropic') {
            return await this.callAnthropic(prompt);
        } else if (this.provider === 'ollama') {
            return await this.callOllama(prompt);
        } else {
            throw new Error(`Unknown LLM provider: ${this.provider}`);
        }
    }

    async callOpenAI(prompt) {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a JSON extraction engine. Output only valid JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0,
                    max_tokens: 2000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI API error:', error.response?.data || error.message);
            throw new Error('LLM extraction failed');
        }
    }

    async callAnthropic(prompt) {
        try {
            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 2000,
                    temperature: 0,
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                },
                {
                    headers: {
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.content[0].text.trim();
        } catch (error) {
            console.error('Anthropic API error:', error.response?.data || error.message);
            throw new Error('LLM extraction failed');
        }
    }

    async callOllama(prompt) {
        try {
            const response = await axios.post(
                `${this.ollamaUrl}/api/generate`,
                {
                    model: this.ollamaModel,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0,
                        num_predict: 2000
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 90000 // Reduced from 120s to 90s (1.5 minutes)
                }
            );

            return response.data.response.trim();
        } catch (error) {
            console.error('Ollama API error:', error.response?.data || error.message);
            throw new Error('LLM extraction failed - check if Ollama is running and model is available');
        }
    }

    parseAndValidate(llmResponse) {
        try {
            // Remove markdown code blocks if present
            let cleaned = llmResponse.trim();
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
            }

            const data = JSON.parse(cleaned);

            // Validate structure
            if (!data.company || !data.contact) {
                throw new Error('Invalid JSON structure');
            }

            return data;
        } catch (error) {
            console.error('JSON parse error:', error.message);
            console.error('Raw response:', llmResponse);

            // Return fallback structure
            return this.getFallbackStructure();
        }
    }

    mergeData(llmData, heuristicData) {
        // Heuristic data takes precedence for certain fields
        return {
            company: {
                ...llmData.company,
                name: llmData.company.name || heuristicData.companyName,
                domain: llmData.company.domain || heuristicData.domain || '',
                logo_url: heuristicData.logoUrl || llmData.company.logo_url,
                short_description: llmData.company.short_description || '',
                long_description: llmData.company.long_description || ''
            },
            products_services: llmData.products_services || [],
            locations: {
                headquarters: heuristicData.locations?.headquarters || llmData.locations?.headquarters || '',
                addresses: heuristicData.locations?.addresses || [],
                coordinates: heuristicData.locations?.coordinates || null
            },
            people: llmData.people || [],
            contact: {
                emails: heuristicData.emails.length > 0 ? heuristicData.emails : llmData.contact?.emails || [],
                phones: heuristicData.phones.length > 0 ? heuristicData.phones : llmData.contact?.phones || [],
                contact_page: llmData.contact?.contact_page || ''
            },
            social_media: heuristicData.socialMedia,
            tech_stack: heuristicData.techStack
        };
    }

    getFallbackStructure() {
        return {
            company: {
                name: '',
                domain: '',
                logo_url: '',
                short_description: '',
                long_description: '',
                industry: '',
                sub_industry: ''
            },
            products_services: [],
            locations: {
                headquarters: ''
            },
            people: [],
            contact: {
                emails: [],
                phones: [],
                contact_page: ''
            },
            social_media: {
                linkedin: '',
                twitter: '',
                facebook: '',
                instagram: ''
            },
            tech_stack: []
        };
    }
}

module.exports = new LLMExtractor();
