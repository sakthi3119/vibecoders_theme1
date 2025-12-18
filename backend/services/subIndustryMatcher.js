const fs = require('fs');
const path = require('path');

/**
 * Sub-Industry Matcher - Fuzzy keyword matching against CSV database
 * Prioritizes CSV lookup over LLM guessing
 */
class SubIndustryMatcher {
    constructor() {
        this.subIndustries = [];
        this.loadCSV();
    }

    loadCSV() {
        try {
            const csvPath = path.join(__dirname, '..', 'sub_Industry_Classification(in).csv');
            const csvContent = fs.readFileSync(csvPath, 'utf-8');

            // Parse CSV (skip header)
            const lines = csvContent.split('\n').slice(1);

            this.subIndustries = lines
                .filter(line => line.trim())
                .map(line => {
                    // Simple CSV parsing (handle quoted fields)
                    const parts = this.parseCSVLine(line);
                    return {
                        sub_industry: parts[0] || '',
                        industry: parts[1] || '',
                        sector: parts[2] || '',
                        sic_code: parts[3] || '',
                        sic_description: parts[4] || ''
                    };
                })
                .filter(item => item.sub_industry); // Remove empty entries

            console.log(`Loaded ${this.subIndustries.length} sub-industries from CSV`);
        } catch (error) {
            console.error('Error loading CSV:', error.message);
            this.subIndustries = [];
        }
    }

    parseCSVLine(line) {
        const parts = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());
        return parts;
    }

    /**
     * Find top 5 matching sub-industries using fuzzy keyword matching
     * @param {string} companyDescription - Company description/content
     * @param {string} companyName - Company name
     * @param {string} domain - Company domain
     * @returns {Array} Top 5 matches with scores
     */
    findMatches(companyDescription = '', companyName = '', domain = '') {
        // Combine all text for matching
        const searchText = `${companyName} ${domain} ${companyDescription}`.toLowerCase();

        // Calculate scores for each sub-industry
        const scores = this.subIndustries.map(item => {
            const score = this.calculateMatchScore(searchText, item);
            return {
                ...item,
                score
            };
        });

        // Sort by score (descending) and return top 5
        const topMatches = scores
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        return topMatches;
    }

    /**
     * Get full CSV details for a specific sub-industry name
     * @param {string} subIndustryName - Sub-industry name to find
     * @returns {object|null} Full CSV row data or null
     */
    getSubIndustryDetails(subIndustryName) {
        if (!subIndustryName) return null;

        const normalized = subIndustryName.toLowerCase().trim();
        return this.subIndustries.find(
            item => item.sub_industry.toLowerCase().trim() === normalized
        ) || null;
    }

    /**
     * Calculate fuzzy match score
     * @param {string} searchText - Text to search in
     * @param {object} subIndustryItem - Sub-industry item from CSV
     * @returns {number} Match score
     */
    calculateMatchScore(searchText, item) {
        let score = 0;

        // Extract keywords from sub_industry, industry, sector, and SIC description
        const keywords = this.extractKeywords(
            `${item.sub_industry} ${item.industry} ${item.sector} ${item.sic_description}`
        );

        // Score based on keyword matches
        for (const keyword of keywords) {
            if (searchText.includes(keyword)) {
                // Longer keywords get higher scores
                score += keyword.length;

                // Exact sub_industry name match gets bonus
                if (item.sub_industry.toLowerCase() === keyword) {
                    score += 50;
                }
            }
        }

        // Bonus for matching sub_industry name directly
        if (searchText.includes(item.sub_industry.toLowerCase())) {
            score += 100;
        }

        // Bonus for matching industry
        if (searchText.includes(item.industry.toLowerCase())) {
            score += 30;
        }

        return score;
    }

    /**
     * Extract meaningful keywords from text
     * @param {string} text - Text to extract keywords from
     * @returns {Array} Array of keywords
     */
    extractKeywords(text) {
        // Common stop words to ignore
        const stopWords = new Set([
            'the', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'a', 'an', 'is', 'of',
            'with', 'as', 'by', 'from', 'that', 'this', 'be', 'are', 'was', 'were',
            'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'could', 'should', 'may', 'might', 'can', 'other', 'n.e.c.', 'activities'
        ]);

        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word)) // Remove short words and stop words
            .filter((word, index, self) => self.indexOf(word) === index); // Remove duplicates
    }

    /**
     * Get best match (top 1)
     * @param {string} companyDescription - Company description/content
     * @param {string} companyName - Company name
     * @param {string} domain - Company domain
     * @returns {object|null} Best match or null
     */
    getBestMatch(companyDescription, companyName, domain) {
        const matches = this.findMatches(companyDescription, companyName, domain);
        return matches.length > 0 ? matches[0] : null;
    }
}

module.exports = SubIndustryMatcher;
