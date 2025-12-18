const express = require('express');
const router = express.Router();
const scraper = require('../services/scraper');
const heuristicExtractor = require('../services/heuristicExtractor');
const llmExtractor = require('../services/llmExtractor');
const graphGenerator = require('../services/graphGenerator');

router.post('/analyze', async (req, res) => {
    try {
        const { domain } = req.body;

        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        console.log(`[ANALYZE] Starting analysis for: ${domain}`);

        // Step 1: Scrape website
        console.log('[SCRAPE] Scraping website...');
        const scrapedData = await scraper.scrapeWebsite(domain);

        if (!scrapedData || scrapedData.pages.length === 0) {
            return res.status(400).json({
                error: 'Unable to scrape website',
                message: 'No pages could be scraped from the domain'
            });
        }

        // Step 2: Extract heuristic data (now async for location extraction)
        console.log('[HEURISTIC] Extracting structured data...');
        const heuristicData = await heuristicExtractor.extract(scrapedData);

        // Step 3: LLM extraction
        console.log('[LLM] Processing with LLM...');
        const companyData = await llmExtractor.extractCompanyData(scrapedData, heuristicData);

        // Step 4: Generate knowledge graph
        console.log('[GRAPH] Generating knowledge graph...');
        const graphData = graphGenerator.generate(companyData);

        console.log('[SUCCESS] Analysis complete');

        res.json({
            success: true,
            data: {
                company: companyData,
                graph: graphData
            }
        });

    } catch (error) {
        console.error('[ERROR] Analysis failed:', error);
        res.status(500).json({
            error: 'Analysis failed',
            message: error.message
        });
    }
});

// Batch analysis endpoint
router.post('/analyze/batch', async (req, res) => {
    try {
        const { domains } = req.body;

        if (!domains || !Array.isArray(domains)) {
            return res.status(400).json({ error: 'Domains array is required' });
        }

        console.log(`[BATCH] Starting batch analysis for ${domains.length} domains`);

        const results = [];

        for (const domain of domains) {
            try {
                console.log(`[BATCH] Processing: ${domain}`);

                const scrapedData = await scraper.scrapeWebsite(domain);
                const heuristicData = heuristicExtractor.extract(scrapedData);
                const companyData = await llmExtractor.extractCompanyData(scrapedData, heuristicData);
                const graphData = graphGenerator.generate(companyData);

                results.push({
                    domain,
                    success: true,
                    data: { company: companyData, graph: graphData }
                });

            } catch (error) {
                console.error(`[BATCH] Failed for ${domain}:`, error.message);
                results.push({
                    domain,
                    success: false,
                    error: error.message
                });
            }
        }

        console.log(`[BATCH] Complete. ${results.filter(r => r.success).length}/${domains.length} successful`);

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('[ERROR] Batch analysis failed:', error);
        res.status(500).json({
            error: 'Batch analysis failed',
            message: error.message
        });
    }
});

module.exports = router;
