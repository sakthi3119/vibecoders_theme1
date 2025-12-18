import React, { useState } from 'react';
import { Search, Download, FileText, FileDown } from 'lucide-react';
import './TopBar.css';
import { exportToCSV, exportToPDF } from '../utils/exportData';

function TopBar({ onAnalyze, companies, selectedCompany, onSelectCompany, onDownloadCSV, onDownloadPDF }) {
    const [domain, setDomain] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [downloadMenuFor, setDownloadMenuFor] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (domain.trim()) {
            onAnalyze(domain.trim());
            setDomain('');
        }
    };

    const handleDownloadForCompany = (company, format) => {
        if (company.status !== 'processed' || !company.data) return;

        if (format === 'csv') {
            exportToCSV(company.data);
        } else {
            exportToPDF(company.data);
        }
        setDownloadMenuFor(null);
    };

    return (
        <div className="topbar">
            <div className="topbar-left">
                <h1 className="topbar-title">
                    <span className="topbar-icon">🔍</span>
                    InsightHub
                </h1>
            </div>

            <div className="topbar-center">
                <form onSubmit={handleSubmit} className="search-form">
                    <div className="search-input-group">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Enter company domain (e.g., stripe.com)"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className="search-input"
                        />
                        <button
                            type="submit"
                            disabled={!domain.trim()}
                            className="search-button"
                        >
                            Analyze
                        </button>
                    </div>
                </form>
            </div>

            <div className="topbar-right">
                {selectedCompany && (
                    <>
                        <div className="download-menu-container">
                            <button
                                className="download-button"
                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                title="Download data"
                            >
                                <Download size={18} />
                                <span>Download</span>
                            </button>

                            {showDownloadMenu && (
                                <div className="download-dropdown">
                                    <button
                                        className="download-option csv"
                                        onClick={() => {
                                            onDownloadCSV();
                                            setShowDownloadMenu(false);
                                        }}
                                    >
                                        <FileText size={18} />
                                        <span>Download CSV</span>
                                    </button>
                                    <button
                                        className="download-option pdf"
                                        onClick={() => {
                                            onDownloadPDF();
                                            setShowDownloadMenu(false);
                                        }}
                                    >
                                        <FileDown size={18} />
                                        <span>Download PDF</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="company-selector" onClick={() => setShowDropdown(!showDropdown)}>
                            <div className="selected-company">
                                <span className="company-name">{selectedCompany.name}</span>
                                {selectedCompany.status === 'processing' ? (
                                    <span className="progress-indicator">{Math.round(selectedCompany.progress)}%</span>
                                ) : (
                                    <span className={`status-badge status-${selectedCompany.status}`}>
                                        {selectedCompany.status === 'processed' && '✓'}
                                        {selectedCompany.status === 'failed' && '✗'}
                                    </span>
                                )}
                            </div>

                            {showDropdown && companies.length > 1 && (
                                <div className="company-dropdown">
                                    {companies.map((comp, idx) => (
                                        <div
                                            key={idx}
                                            className={`dropdown-item ${comp === selectedCompany ? 'active' : ''}`}
                                        >
                                            <div
                                                className="dropdown-item-info"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (comp.status === 'processed') {
                                                        onSelectCompany(comp);
                                                        setShowDropdown(false);
                                                    }
                                                }}
                                            >
                                                <span>{comp.name}</span>
                                                {comp.status === 'processing' ? (
                                                    <div className="mini-progress">
                                                        <div className="mini-progress-bar" style={{ width: `${comp.progress}%` }}></div>
                                                        <span className="mini-progress-text">{Math.round(comp.progress)}%</span>
                                                    </div>
                                                ) : (
                                                    <span className={`status-badge status-${comp.status}`}>
                                                        {comp.status === 'processed' && '✓'}
                                                        {comp.status === 'failed' && '✗'}
                                                    </span>
                                                )}
                                            </div>
                                            {comp.status === 'processed' && (
                                                <div className="dropdown-actions">
                                                    <button
                                                        className="mini-download-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDownloadMenuFor(downloadMenuFor === comp.domain ? null : comp.domain);
                                                        }}
                                                        title="Download"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    {downloadMenuFor === comp.domain && (
                                                        <div className="mini-download-menu">
                                                            <button onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadForCompany(comp, 'csv');
                                                            }}>
                                                                <FileText size={14} /> CSV
                                                            </button>
                                                            <button onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadForCompany(comp, 'pdf');
                                                            }}>
                                                                <FileDown size={14} /> PDF
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default TopBar;
