const axios = require('axios');

/**
 * Extracts and enriches location data for companies
 * Uses Google Maps Places API for structured data (optional)
 */
class LocationExtractor {
    constructor() {
        this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
        this.useGoogleMaps = this.googleApiKey.length > 0;
    }

    async extractLocations(scrapedData, heuristicData, companyName) {
        const locations = {
            headquarters: '',
            addresses: [],
            coordinates: null
        };

        // STEP 1: Extract from scraped website content
        const scrapedLocations = this.extractFromScrapedData(scrapedData);

        // STEP 2: If Google Maps API available, enrich with structured data
        if (this.useGoogleMaps && companyName) {
            try {
                const googleData = await this.fetchFromGoogleMaps(companyName);
                if (googleData) {
                    if (googleData.headquarters) {
                        locations.headquarters = googleData.headquarters;
                    }
                    if (googleData.addresses && googleData.addresses.length > 0) {
                        locations.addresses = googleData.addresses;
                    }
                    if (googleData.coordinates) {
                        locations.coordinates = googleData.coordinates;
                    }
                }
            } catch (error) {
                console.warn('Google Maps API error:', error.message);
            }
        }

        // STEP 3: Use scraped data if Google Maps didn't provide info
        if (!locations.headquarters && scrapedLocations.headquarters) {
            locations.headquarters = scrapedLocations.headquarters;
        }
        if (locations.addresses.length === 0 && scrapedLocations.addresses.length > 0) {
            locations.addresses = scrapedLocations.addresses;
        }

        return locations;
    }

    extractFromScrapedData(scrapedData) {
        const locations = {
            headquarters: '',
            addresses: []
        };

        const allText = scrapedData.pages.map(p => p.text).join('\n\n');

        // Extract from footer addresses (common pattern: City, State/Country, Postal Code)
        const footerAddressPattern = /([A-Z][a-zA-Z\s]+),\s*([A-Z][a-zA-Z\s]+),\s*([A-Z]{2}\d{1,2}\s*\d[A-Z]{2}|\d{5,6})/g;
        const footerMatches = [...allText.matchAll(footerAddressPattern)];
        if (footerMatches.length > 0) {
            // Extract city and country from footer
            const match = footerMatches[0];
            const city = match[1].trim();
            const region = match[2].trim();
            if (!locations.headquarters && city && region) {
                locations.headquarters = `${city}, ${region}`;
            }
            // Add full addresses
            footerMatches.forEach(m => {
                const fullAddr = m[0].trim();
                if (fullAddr.length > 10 && !locations.addresses.includes(fullAddr)) {
                    locations.addresses.push(fullAddr);
                }
            });
        }

        // Extract headquarters - try dual HQ pattern first
        const dualHqMatch = allText.match(/(?:dual headquarters in)\s+([A-Z][a-zA-Z\s]+)\s+and\s+([A-Z][a-zA-Z\s]+)/i);
        if (dualHqMatch) {
            const loc1 = dualHqMatch[1].trim();
            const loc2 = dualHqMatch[2].trim();
            if (loc1.length > 2 && loc1.length < 50 && loc2.length > 2 && loc2.length < 50) {
                locations.headquarters = `${loc1} and ${loc2}`;
            }
        }

        // Single headquarters pattern
        if (!locations.headquarters) {
            const hqPatterns = [
                /(?:headquarters?|headquartered|head office|hq)(?:\s+(?:is|are|located|in|at|:))?\s+(?:in\s+)?([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?)/i,
                /(?:based in|located in)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?)/i
            ];

            for (const pattern of hqPatterns) {
                const match = allText.match(pattern);
                if (match && match[1]) {
                    const location = match[1]
                        .trim()
                        .replace(/\s+/g, ' ')
                        .split(/\s+as\s+well\s+as|offices/i)[0]
                        .trim();

                    if (location.length > 3 && location.length < 100) {
                        locations.headquarters = location;
                        break;
                    }
                }
            }
        }

        // Office locations removed - only headquarters needed

        // Extract full addresses
        const addressPattern = /\d+[\w\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Place|Pl|House|Building)[^.]{10,150}/gi;
        const addressMatches = allText.match(addressPattern);
        if (addressMatches) {
            const validAddresses = addressMatches
                .map(a => a.trim())
                .filter(a => {
                    // Filter out false positives (product descriptions, navigation menus, etc.)
                    const lower = a.toLowerCase();
                    const wordCount = a.split(' ').length;
                    return !lower.includes('data') &&
                        !lower.includes('campaign') &&
                        !lower.includes('email') &&
                        !lower.includes('book a demo') &&
                        !lower.includes('discovery') &&
                        !lower.includes('proposal') &&
                        !lower.includes('onboarding') &&
                        !lower.includes('questions') &&
                        wordCount > 3 && wordCount < 20; // Reasonable address length
                })
                .filter((a, i, arr) => arr.indexOf(a) === i)
                .slice(0, 3);

            locations.addresses.push(...validAddresses);
        }

        // If still no headquarters but have addresses, extract city from address
        if (!locations.headquarters && locations.addresses.length > 0) {
            const addr = locations.addresses[0];
            // Try to extract "City, Country" or "City, State" from address
            const cityMatch = addr.match(/([A-Z][a-zA-Z\s]+),\s*([A-Z][a-zA-Z\s]+)/);
            if (cityMatch) {
                locations.headquarters = `${cityMatch[1].trim()}, ${cityMatch[2].trim()}`;
            }
        }

        return locations;
    }

    async fetchFromGoogleMaps(companyName) {
        if (!this.useGoogleMaps) {
            return null;
        }

        try {
            const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json`;
            const searchResponse = await axios.get(searchUrl, {
                params: {
                    input: companyName,
                    inputtype: 'textquery',
                    fields: 'place_id,name,formatted_address,geometry',
                    key: this.googleApiKey
                },
                timeout: 5000 // Reduced from 10s to 5s
            });

            if (!searchResponse.data.candidates || searchResponse.data.candidates.length === 0) {
                return null;
            }

            const place = searchResponse.data.candidates[0];

            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
            const detailsResponse = await axios.get(detailsUrl, {
                params: {
                    place_id: place.place_id,
                    fields: 'name,formatted_address,address_components,geometry,types',
                    key: this.googleApiKey
                },
                timeout: 5000 // Reduced from 10s to 5s
            });

            const details = detailsResponse.data.result;
            const city = details.address_components?.find(c => c.types.includes('locality'))?.long_name || '';
            const country = details.address_components?.find(c => c.types.includes('country'))?.long_name || '';

            let headquarters = '';
            if (city && country) {
                headquarters = `${city}, ${country}`;
            } else if (details.formatted_address) {
                const parts = details.formatted_address.split(',');
                headquarters = parts.length >= 2 ? parts.slice(-2).join(',').trim() : details.formatted_address;
            }

            return {
                headquarters,
                addresses: details.formatted_address ? [details.formatted_address] : [],
                coordinates: details.geometry?.location || null
            };

        } catch (error) {
            console.warn('Google Maps error:', error.message);
            return null;
        }
    }

    inferLocationFromDomain(domain) {
        const tldMap = {
            '.in': 'India',
            '.co.in': 'India',
            '.uk': 'United Kingdom',
            '.co.uk': 'United Kingdom',
            '.us': 'United States',
            '.de': 'Germany',
            '.fr': 'France',
            '.jp': 'Japan',
            '.cn': 'China',
            '.au': 'Australia',
            '.ca': 'Canada',
            '.sg': 'Singapore',
            '.ae': 'United Arab Emirates'
        };

        for (const [tld, country] of Object.entries(tldMap)) {
            if (domain.endsWith(tld)) {
                return country;
            }
        }

        return domain.endsWith('.com') ? 'United States' : 'Unknown';
    }
}

module.exports = new LocationExtractor();
