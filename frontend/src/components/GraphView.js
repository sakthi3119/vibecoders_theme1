import React, { useState, useCallback, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { X, ArrowLeft } from 'lucide-react';
import './GraphView.css';
import '../styles/BackButton.css';

const NODE_COLORS = {
    Company: '#4f46e5',
    Product: '#f59e0b',
    Person: '#10b981',
    Location: '#ef4444',
    Technology: '#8b5cf6',
    Category: '#64748b'
};

const CATEGORY_ICONS = {
    Products: '📦',
    Locations: '📍',
    People: '👥',
    Technologies: '⚙️'
};

function GraphView({ graph, company, onBack }) {
    const [selectedNode, setSelectedNode] = useState(null);
    const [graphData, setGraphData] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const fgRef = useRef();

    useEffect(() => {
        if (!graph || !graph.nodes || !graph.edges) return;

        // Group nodes by type
        const nodesByType = graph.nodes.reduce((acc, node) => {
            if (node.type !== 'Company') {
                const categoryType = getCategoryForNodeType(node.type);
                if (!acc[categoryType]) acc[categoryType] = [];
                acc[categoryType].push(node);
            }
            return acc;
        }, {});

        // Create hierarchical structure
        const nodes = [];
        const links = [];
        const companyNode = graph.nodes.find(n => n.type === 'Company');

        if (companyNode) {
            // Company node (always visible at center) - show domain name
            const domainName = companyNode.data?.domain || companyNode.label;
            nodes.push({
                id: companyNode.id,
                name: domainName.replace(/^https?:\/\//, '').replace(/\/$/, ''),
                type: 'Company',
                data: companyNode.data,
                color: NODE_COLORS['Company'],
                val: 50,
                isCategory: false,
                fx: 0,
                fy: 0
            });
        }

        // Create category nodes with fixed positions in a circle
        const categories = Object.entries(nodesByType);
        const radius = 300;
        categories.forEach(([categoryName, categoryNodes], idx) => {
            const categoryId = `category:${categoryName}`;
            const angle = (idx * 2 * Math.PI) / categories.length - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            nodes.push({
                id: categoryId,
                name: categoryName,
                type: 'Category',
                data: { count: categoryNodes.length },
                color: NODE_COLORS['Category'],
                val: 30,
                isCategory: true,
                icon: CATEGORY_ICONS[categoryName],
                fx: x,
                fy: y
            });

            // Link category to company
            links.push({
                source: companyNode.id,
                target: categoryId,
                type: 'HAS_CATEGORY',
                color: '#cbd5e1',
                width: 3
            });

            // Create child nodes - ALWAYS VISIBLE with fixed positions
            const childRadius = 180;
            categoryNodes.forEach((childNode, childIdx) => {
                const childId = childNode.id;
                const childAngle = (childIdx * 2 * Math.PI) / Math.max(categoryNodes.length, 1);
                const childX = x + Math.cos(childAngle) * childRadius;
                const childY = y + Math.sin(childAngle) * childRadius;

                nodes.push({
                    id: childId,
                    name: childNode.label,
                    type: childNode.type,
                    data: childNode.data,
                    color: NODE_COLORS[childNode.type],
                    val: 15,
                    isCategory: false,
                    categoryId: categoryId,
                    fx: childX,
                    fy: childY
                });

                // Link child to category
                links.push({
                    source: categoryId,
                    target: childId,
                    type: graph.edges.find(e => e.to === childId || e.from === childId)?.type || 'BELONGS_TO',
                    color: '#e2e8f0',
                    width: 1.5
                });
            });
        });

        setGraphData({ nodes, links, allNodes: nodes, allLinks: links });

        // Center on company node and set proper zoom after mount
        setTimeout(() => {
            if (companyNode && fgRef.current) {
                fgRef.current.centerAt(0, 0, 1000);
                fgRef.current.zoom(0.7, 1000);
            }
        }, 500);
    }, [graph]);

    const getCategoryForNodeType = (nodeType) => {
        const categoryMap = {
            'Product': 'Products',
            'Location': 'Locations',
            'Person': 'People',
            'Technology': 'Technologies'
        };
        return categoryMap[nodeType] || nodeType;
    };

    const handleNodeClick = useCallback((node) => {
        if (!node.isCategory) {
            setSelectedNode(node);
            // Center on clicked node
            if (fgRef.current) {
                fgRef.current.centerAt(node.x, node.y, 500);
            }
        }
    }, []);

    const getConnectedNodes = useCallback((nodeId) => {
        if (!graphData) return [];
        return graphData.links
            .filter(link => link.source.id === nodeId || link.target.id === nodeId)
            .map(link => {
                const connectedId = link.source.id === nodeId ? link.target.id : link.source.id;
                const node = graphData.nodes.find(n => n.id === connectedId);
                return node ? { ...node, relationshipType: link.type } : null;
            })
            .filter(Boolean);
    }, [graphData]);

    const adjustColor = (color, amount) => {
        return '#' + color.replace(/^#/, '').replace(/../g, (colorPart) => {
            const adjusted = Math.min(255, Math.max(0, Number.parseInt(colorPart, 16) + amount));
            return ('0' + adjusted.toString(16)).slice(-2);
        });
    };

    if (!graphData || graphData.nodes.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h2>No Graph Data</h2>
                <p>No knowledge graph data available for this company</p>
            </div>
        );
    }

    return (
        <div className="graph-view">
            <div className="view-header">
                {onBack && (
                    <button className="back-button" onClick={onBack}>
                        <ArrowLeft size={20} />
                        Back to Overview
                    </button>
                )}
                <h2>🎯 Interactive Knowledge Graph</h2>
                <p>Structured visualization of company intelligence • Scroll to zoom • Click nodes for details</p>
            </div>

            <div className="graph-container">
                <div className="graph-canvas-wrapper card">
                    <ForceGraph2D
                        ref={fgRef}
                        graphData={graphData}
                        nodeLabel={node => node.isCategory ?
                            `${node.name} (${node.data.count} items)` :
                            `${node.name} (${node.type})`
                        }
                        nodeColor={node => node.color}
                        nodeRelSize={6}
                        nodeVal={node => node.val}
                        linkColor={link => link.color}
                        linkWidth={link => link.width || 2}
                        linkDirectionalArrowLength={5}
                        linkDirectionalArrowRelPos={1}
                        onNodeClick={handleNodeClick}
                        nodeCanvasObject={(node, ctx, globalScale) => {
                            // Skip rendering if node position is not yet initialized
                            if (!node.x || !node.y || isNaN(node.x) || isNaN(node.y)) {
                                return;
                            }

                            // Enhanced node rendering with glow effect
                            const size = node.val * 0.35;

                            // Glow effect for company and category nodes
                            if (node.type === 'Company' || node.isCategory) {
                                ctx.shadowColor = node.color;
                                ctx.shadowBlur = 20;
                            }

                            // Draw node circle with gradient
                            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size);
                            gradient.addColorStop(0, node.color);
                            gradient.addColorStop(1, adjustColor(node.color, -20));

                            ctx.beginPath();
                            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                            ctx.fillStyle = gradient;
                            ctx.fill();

                            // Border for better visibility
                            ctx.strokeStyle = adjustColor(node.color, -40);
                            ctx.lineWidth = 2;
                            ctx.stroke();

                            ctx.shadowBlur = 0;

                            // Draw icon for category nodes
                            if (node.isCategory && node.icon) {
                                const fontSize = 20 / globalScale;
                                ctx.font = `${fontSize}px Sans-Serif`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(node.icon, node.x, node.y);

                                // Draw expand/collapse indicator
                                const isExpanded = expandedCategories.has(node.id);
                                const indicatorSize = 12 / globalScale;
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(
                                    node.x + size - indicatorSize / 2,
                                    node.y - size + indicatorSize / 2,
                                    indicatorSize,
                                    indicatorSize
                                );
                                ctx.fillStyle = '#0f172a';
                                ctx.font = `bold ${indicatorSize}px Sans-Serif`;
                                ctx.fillText(
                                    isExpanded ? '−' : '+',
                                    node.x + size - indicatorSize / 2 + indicatorSize / 2,
                                    node.y - size + indicatorSize / 2 + indicatorSize / 2
                                );
                            }

                            // Draw label
                            const label = node.name;
                            const fontSize = node.type === 'Company' ? 16 / globalScale :
                                node.isCategory ? 14 / globalScale : 12 / globalScale;
                            ctx.font = `${node.type === 'Company' || node.isCategory ? 'bold' : 'normal'} ${fontSize}px Inter, Sans-Serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'top';

                            // Label background for better readability
                            const textWidth = ctx.measureText(label).width;
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                            ctx.fillRect(
                                node.x - textWidth / 2 - 4,
                                node.y + size + 4,
                                textWidth + 8,
                                fontSize + 4
                            );

                            ctx.fillStyle = '#0f172a';
                            ctx.fillText(label, node.x, node.y + size + 6);

                            // Count badge for categories
                            if (node.isCategory && node.data.count) {
                                const badgeSize = 18 / globalScale;
                                const badgeX = node.x + size * 0.7;
                                const badgeY = node.y - size * 0.7;

                                ctx.beginPath();
                                ctx.arc(badgeX, badgeY, badgeSize / 2, 0, 2 * Math.PI);
                                ctx.fillStyle = '#ef4444';
                                ctx.fill();

                                ctx.fillStyle = '#ffffff';
                                ctx.font = `bold ${badgeSize * 0.7}px Sans-Serif`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(node.data.count, badgeX, badgeY);
                            }
                        }}
                        cooldownTicks={0}
                        d3VelocityDecay={0.3}
                        d3AlphaDecay={0.02}
                        warmupTicks={0}
                        enableNodeDrag={false}
                    />
                </div>

                {/* Enhanced Legend */}
                <div className="graph-legend card">
                    <h4>🎨 Node Types</h4>
                    <div className="legend-items">
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: NODE_COLORS['Company'] }}></div>
                            <span>Company</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: NODE_COLORS['Category'] }}></div>
                            <span>Category</span>
                        </div>
                        {Object.entries(NODE_COLORS).filter(([type]) =>
                            !['Company', 'Category'].includes(type)
                        ).map(([type, color]) => (
                            <div key={type} className="legend-item">
                                <div className="legend-color" style={{ background: color }}></div>
                                <span>{type}</span>
                            </div>
                        ))}
                    </div>

                    <div className="legend-section">
                        <h4>💡 Tips</h4>
                        <ul className="tips-list">
                            <li>Click categories to expand</li>
                            <li>Drag nodes to rearrange</li>
                            <li>Scroll to zoom in/out</li>
                            <li>Click child nodes for details</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Enhanced Side Panel */}
            {selectedNode && !selectedNode.isCategory && (
                <div className="node-detail-panel enhanced-panel">
                    <div className="panel-header">
                        <div>
                            <div
                                className="node-type-badge"
                                style={{ background: NODE_COLORS[selectedNode.type] }}
                            >
                                {selectedNode.type}
                            </div>
                            <h3>{selectedNode.name}</h3>
                        </div>
                        <button className="close-button" onClick={() => setSelectedNode(null)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="panel-content">
                        {selectedNode.data && Object.keys(selectedNode.data).length > 0 && (
                            <div className="node-attributes">
                                <h4>📋 Details</h4>
                                {Object.entries(selectedNode.data).map(([key, value]) =>
                                    value ? (
                                        <div key={key} className="attribute-item">
                                            <span className="attribute-key">{key}:</span>
                                            <span className="attribute-value">{value}</span>
                                        </div>
                                    ) : null
                                )}
                            </div>
                        )}

                        <div className="node-connections">
                            <h4>🔗 Connections ({getConnectedNodes(selectedNode.id).length})</h4>
                            <div className="connections-list">
                                {getConnectedNodes(selectedNode.id).map((connNode, idx) => (
                                    <div
                                        key={idx}
                                        className="connection-item"
                                        onClick={() => {
                                            const node = graphData.nodes.find(n => n.id === connNode.id);
                                            if (node && !node.isCategory) handleNodeClick(node);
                                        }}
                                    >
                                        <div
                                            className="connection-color"
                                            style={{ background: NODE_COLORS[connNode.type] || '#64748b' }}
                                        ></div>
                                        <div className="connection-info">
                                            <div className="connection-name">{connNode.name}</div>
                                            <div className="connection-type">{connNode.relationshipType}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GraphView;
