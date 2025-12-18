import React from 'react';
import { Cpu, ArrowLeft } from 'lucide-react';
import './TechStackView.css';
import '../styles/BackButton.css';

function TechStackView({ techStack, onBack }) {
    if (!techStack || techStack.length === 0) {
        return (
            <div className="tech-stack-view">
                {onBack && (
                    <button className="back-button" onClick={onBack}>
                        <ArrowLeft size={20} />
                        Back to Overview
                    </button>
                )}
                <div className="empty-state">
                    <div className="empty-icon"><Cpu size={64} /></div>
                    <h2>No Technology Stack</h2>
                    <p>No technology information was detected from the website</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tech-stack-view">
            <div className="view-header">
                {onBack && (
                    <button className="back-button" onClick={onBack}>
                        <ArrowLeft size={20} />
                        Back to Overview
                    </button>
                )}
                <h2>Technology Stack</h2>
                <p>Technologies and platforms detected from company website</p>
            </div>

            <div className="tech-grid">
                {techStack.map((tech, idx) => (
                    <div key={idx} className="tech-card card">
                        <Cpu className="tech-icon" size={32} />
                        <h3>{tech}</h3>
                    </div>
                ))}
            </div>

            <div className="tech-cloud card">
                <h3>Technology Cloud</h3>
                <div className="tech-tags">
                    {techStack.map((tech, idx) => (
                        <span key={idx} className="tech-tag">{tech}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default TechStackView;
