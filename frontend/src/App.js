import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import TopBar from './components/TopBar';
import Overview from './components/Overview';
import GraphView from './components/GraphView';
import ProductsView from './components/ProductsView';
import PeopleView from './components/PeopleView';
import LocationsView from './components/LocationsView';
import TechStackView from './components/TechStackView';
import { exportToCSV, exportToPDF } from './utils/exportData';

const API_URL = 'http://localhost:5000/api';

function App() {
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [currentView, setCurrentView] = useState('overview');
    const [error, setError] = useState('');

    const analyzeCompany = async (domain) => {
        // Create processing entry immediately
        const processingRecord = {
            domain,
            name: domain,
            status: 'processing',
            progress: 0,
            data: null,
            graph: null,
            timestamp: new Date().toISOString()
        };

        setCompanies(prev => {
            const filtered = prev.filter(c => c.domain !== domain);
            return [processingRecord, ...filtered].slice(0, 10);
        });

        // Always select this company when processing starts
        setSelectedCompany(processingRecord);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setCompanies(prev => prev.map(c => {
                    if (c.domain === domain && c.status === 'processing') {
                        const updatedCompany = { ...c, progress: Math.min(c.progress + Math.random() * 15, 90) };
                        // Also update selectedCompany if it's the one being processed
                        setSelectedCompany(current =>
                            current?.domain === domain ? updatedCompany : current
                        );
                        return updatedCompany;
                    }
                    return c;
                }));
            }, 500);

            const response = await axios.post(`${API_URL}/analyze`, { domain });
            clearInterval(progressInterval);

            if (response.data.success) {
                const { company, graph } = response.data.data;

                const companyRecord = {
                    domain,
                    name: company.company.name || domain,
                    status: 'processed',
                    progress: 100,
                    data: company,
                    graph,
                    timestamp: new Date().toISOString()
                };

                setCompanies(prev => prev.map(c =>
                    c.domain === domain ? companyRecord : c
                ));

                // Always update selected company when it's processed
                setSelectedCompany(companyRecord);
                setCurrentView('overview');
                setError('');
            } else {
                setCompanies(prev => prev.map(c =>
                    c.domain === domain
                        ? { ...c, status: 'failed', progress: 0 }
                        : c
                ));
            }
        } catch (err) {
            console.error('Analysis error:', err);
            setCompanies(prev => prev.map(c =>
                c.domain === domain
                    ? { ...c, status: 'failed', progress: 0 }
                    : c
            ));
            if (selectedCompany?.domain === domain) {
                setError(err.response?.data?.message || 'Failed to analyze company');
            }
        }
    };

    const handleDownloadCSV = () => {
        if (!selectedCompany || !selectedCompany.data) return;
        exportToCSV(selectedCompany.data);
    };

    const handleDownloadPDF = () => {
        if (!selectedCompany || !selectedCompany.data) return;
        exportToPDF(selectedCompany.data);
    };

    const renderView = () => {
        if (error) {
            return (
                <div className="error-container">
                    <div className="error-icon">⚠️</div>
                    <h3>Analysis Failed</h3>
                    <p>{error}</p>
                </div>
            );
        }

        if (!selectedCompany) {
            return (
                <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <h2>No Company Selected</h2>
                    <p>Enter a company domain in the top bar to begin analysis</p>
                </div>
            );
        }

        if (selectedCompany.status === 'processing') {
            return (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Analyzing {selectedCompany.domain}...</p>
                    <span className="loading-subtitle">Scraping • Extracting • Building graph</span>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${selectedCompany.progress}%` }}></div>
                    </div>
                    <span className="progress-text">{Math.round(selectedCompany.progress)}% Complete</span>
                </div>
            );
        }

        if (selectedCompany.status === 'failed') {
            return (
                <div className="error-container">
                    <div className="error-icon">⚠️</div>
                    <h3>Analysis Failed</h3>
                    <p>Failed to analyze {selectedCompany.domain}</p>
                </div>
            );
        }

        const { data, graph } = selectedCompany;

        switch (currentView) {
            case 'overview':
                return <Overview company={data} graph={graph} onViewChange={setCurrentView} />;
            case 'graph':
                return <GraphView graph={graph} company={data} onBack={() => setCurrentView('overview')} />;
            case 'products':
                return <ProductsView products={data.products_services} onBack={() => setCurrentView('overview')} />;
            case 'people':
                return <PeopleView people={data.people} onBack={() => setCurrentView('overview')} />;
            case 'locations':
                return <LocationsView locations={data.locations} onBack={() => setCurrentView('overview')} />;
            case 'tech':
                return <TechStackView techStack={data.tech_stack} onBack={() => setCurrentView('overview')} />;
            default:
                return <Overview company={data} graph={graph} onViewChange={setCurrentView} />;
        }
    };

    return (
        <div className="app">
            <TopBar
                onAnalyze={analyzeCompany}
                companies={companies}
                selectedCompany={selectedCompany}
                onSelectCompany={setSelectedCompany}
                onDownloadCSV={handleDownloadCSV}
                onDownloadPDF={handleDownloadPDF}
            />

            <main className="content">
                {renderView()}
            </main>
        </div>
    );
}

export default App;
