import React, { useState } from 'react';
import { Building2, Package, Users, MapPin, Cpu } from 'lucide-react';
import SubIndustryModal from './SubIndustryModal';
import './Overview.css';

function Overview({ company, graph, onViewChange }) {
    const [showModal, setShowModal] = useState(false);

    const stats = {
        products: company.products_services?.length || 0,
        people: company.people?.length || 0,
        locations: company.locations?.headquarters ? 1 : 0,
        tech: company.tech_stack?.length || 0
    };

    const handleCardClick = (view) => {
        if (onViewChange) {
            onViewChange(view);
        }
    };

    return (
        <div className="overview">
            <div className="view-header">
                <h2>Company Overview</h2>
                <p>Intelligence dashboard for {company.company.name || company.company.domain}</p>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
                        <Building2 size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Industry</div>
                        <div className="kpi-value">
                            {company.company.industry || 'Unknown'}
                        </div>
                    </div>
                </div>

                <div
                    className="kpi-card clickable"
                    onClick={() => company.company.csv_details && setShowModal(true)}
                    style={{ cursor: company.company.csv_details ? 'pointer' : 'default' }}
                >
                    <div className="kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                        <Building2 size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Sub-Industry {company.company.csv_details && '(Click for details)'}</div>
                        <div className="kpi-value" style={{ fontSize: '1rem' }}>
                            {company.company.sub_industry || 'Unknown'}
                        </div>
                    </div>
                </div>

                <div className="kpi-card clickable" onClick={() => handleCardClick('products')}>
                    <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <Package size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Products & Services</div>
                        <div className="kpi-value">{stats.products}</div>
                    </div>
                </div>

                <div className="kpi-card clickable" onClick={() => handleCardClick('people')}>
                    <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Key People</div>
                        <div className="kpi-value">{stats.people}</div>
                    </div>
                </div>

                <div className="kpi-card clickable" onClick={() => handleCardClick('locations')}>
                    <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <MapPin size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Locations</div>
                        <div className="kpi-value">{stats.locations}</div>
                    </div>
                </div>

                <div className="kpi-card clickable" onClick={() => handleCardClick('tech')}>
                    <div className="kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                        <Cpu size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Technologies</div>
                        <div className="kpi-value">{stats.tech}</div>
                    </div>
                </div>

                <div className="kpi-card clickable" onClick={() => handleCardClick('graph')}>
                    <div className="kpi-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
                        <Building2 size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Knowledge Graph</div>
                        <div className="kpi-value">{graph?.nodes?.length || 0}</div>
                    </div>
                </div>
            </div>

            {/* Sub-Industry Modal */}
            {showModal && (
                <SubIndustryModal
                    csvData={company.company.csv_details}
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* Company Summary */}
            <div className="company-summary card">
                <div className="summary-header">
                    <div className="summary-left">
                        {company.company.logo_url && (
                            <img
                                src={company.company.logo_url}
                                alt={company.company.name}
                                className="company-logo"
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        )}
                        <div>
                            <h3>{company.company.name || company.company.domain}</h3>
                            <a
                                href={company.company.domain.startsWith('http') ? company.company.domain : `https://${company.company.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="company-domain"
                            >
                                {company.company.domain}
                            </a>
                            {company.company.industry && (
                                <div className="industry-tags">
                                    <span className="badge info">{company.company.industry}</span>
                                    {company.company.sub_industry && (
                                        <span className="badge info">{company.company.sub_industry}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="summary-description">
                    <p>{company.company.long_description || company.company.short_description || 'No description available'}</p>
                </div>

                {/* Contact & Social */}
                <div className="summary-footer">
                    {company.contact && (company.contact.emails?.length > 0 || company.contact.phones?.length > 0 || (company.social_media && Object.values(company.social_media).some(v => v))) && (
                        <div className="contact-section">
                            <h4>Contact</h4>
                            {company.contact.emails?.length > 0 && (
                                <div className="contact-item">
                                    <strong>Email:</strong> {company.contact.emails.join(', ')}
                                </div>
                            )}
                            {company.contact.phones?.length > 0 && (
                                <div className="contact-item">
                                    <strong>Phone:</strong> {company.contact.phones.join(', ')}
                                </div>
                            )}
                            {company.social_media && (
                                <>
                                    {company.social_media.linkedin && (
                                        <div className="contact-item">
                                            <strong>LinkedIn:</strong> <a href={company.social_media.linkedin} target="_blank" rel="noopener noreferrer">{company.social_media.linkedin}</a>
                                        </div>
                                    )}
                                    {company.social_media.twitter && (
                                        <div className="contact-item">
                                            <strong>Twitter:</strong> <a href={company.social_media.twitter} target="_blank" rel="noopener noreferrer">{company.social_media.twitter}</a>
                                        </div>
                                    )}
                                    {company.social_media.facebook && (
                                        <div className="contact-item">
                                            <strong>Facebook:</strong> <a href={company.social_media.facebook} target="_blank" rel="noopener noreferrer">{company.social_media.facebook}</a>
                                        </div>
                                    )}
                                    {company.social_media.instagram && (
                                        <div className="contact-item">
                                            <strong>Instagram:</strong> <a href={company.social_media.instagram} target="_blank" rel="noopener noreferrer">{company.social_media.instagram}</a>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Graph Stats */}
            {graph && (
                <div className="graph-stats-card card">
                    <h3>Knowledge Graph Statistics</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-value">{graph.nodes?.length || 0}</div>
                            <div className="stat-label">Total Nodes</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{graph.edges?.length || 0}</div>
                            <div className="stat-label">Total Edges</div>
                        </div>
                        {graph.stats?.nodeTypes && Object.entries(graph.stats.nodeTypes).map(([type, count]) => (
                            <div key={type} className="stat-item">
                                <div className="stat-value">{count}</div>
                                <div className="stat-label">{type}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Overview;
