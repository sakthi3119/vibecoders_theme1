/**
 * Knowledge Graph Generator
 * Converts company JSON into graph format (nodes + edges)
 * No database - just JSON structure
 */
class GraphGenerator {
    generate(companyData) {
        const nodes = [];
        const edges = [];

        // Company node (root)
        const companyId = this.sanitizeId(companyData.company.domain);
        nodes.push({
            id: companyId,
            type: 'Company',
            label: companyData.company.name || companyData.company.domain,
            data: {
                domain: companyData.company.domain,
                description: companyData.company.short_description,
                industry: companyData.company.industry
            }
        });

        // Product nodes
        companyData.products_services.forEach((product, idx) => {
            if (product.name) {
                const productId = `product:${this.sanitizeId(product.name)}-${idx}`;
                nodes.push({
                    id: productId,
                    type: 'Product',
                    label: product.name,
                    data: {
                        description: product.description
                    }
                });

                edges.push({
                    from: companyId,
                    to: productId,
                    type: 'HAS_PRODUCT'
                });
            }
        });

        // Location nodes
        if (companyData.locations.headquarters) {
            const hqId = `location:${this.sanitizeId(companyData.locations.headquarters)}`;
            nodes.push({
                id: hqId,
                type: 'Location',
                label: companyData.locations.headquarters,
                data: {
                    type: 'Headquarters'
                }
            });

            edges.push({
                from: companyId,
                to: hqId,
                type: 'HEADQUARTERED_AT'
            });
        }

        // People nodes
        companyData.people.forEach((person, idx) => {
            if (person.name) {
                const personId = `person:${this.sanitizeId(person.name)}-${idx}`;
                nodes.push({
                    id: personId,
                    type: 'Person',
                    label: person.name,
                    data: {
                        title: person.title,
                        role_category: person.role_category
                    }
                });

                edges.push({
                    from: personId,
                    to: companyId,
                    type: 'WORKS_AT'
                });
            }
        });

        // Technology nodes
        companyData.tech_stack.forEach((tech, idx) => {
            if (tech) {
                const techId = `tech:${this.sanitizeId(tech)}-${idx}`;
                nodes.push({
                    id: techId,
                    type: 'Technology',
                    label: tech,
                    data: {}
                });

                edges.push({
                    from: companyId,
                    to: techId,
                    type: 'USES_TECH'
                });
            }
        });

        return {
            nodes,
            edges,
            stats: {
                totalNodes: nodes.length,
                totalEdges: edges.length,
                nodeTypes: this.getNodeTypeCounts(nodes)
            }
        };
    }

    sanitizeId(str) {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    getNodeTypeCounts(nodes) {
        const counts = {};
        nodes.forEach(node => {
            counts[node.type] = (counts[node.type] || 0) + 1;
        });
        return counts;
    }
}

module.exports = new GraphGenerator();
