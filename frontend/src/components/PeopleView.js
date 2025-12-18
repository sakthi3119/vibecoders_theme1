import React from 'react';
import { Users, ArrowLeft } from 'lucide-react';
import './PeopleView.css';
import '../styles/BackButton.css';

function PeopleView({ people, onBack }) {
    if (!people || people.length === 0) {
        return (
            <div className="people-view">
                {onBack && (
                    <button className="back-button" onClick={onBack}>
                        <ArrowLeft size={20} />
                        Back to Overview
                    </button>
                )}
                <div className="empty-state">
                    <div className="empty-icon"><Users size={64} /></div>
                    <h2>No People Information</h2>
                    <p>No team member data was extracted from the website</p>
                </div>
            </div>
        );
    }

    return (
        <div className="people-view">
            <div className="view-header">
                {onBack && (
                    <button className="back-button" onClick={onBack}>
                        <ArrowLeft size={20} />
                        Back to Overview
                    </button>
                )}
                <h2>Team Members</h2>
                <p>Key people and leadership identified from company website</p>
            </div>

            <div className="people-grid">
                {people.map((person, idx) => (
                    <div key={idx} className="person-card card">
                        <div className="person-avatar">
                            {person.name
                                ? person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                : person.role_category?.charAt(0).toUpperCase() || '?'
                            }
                        </div>
                        <div className="person-info">
                            <h3>{person.name || person.title}</h3>
                            {person.name && <p className="person-title">{person.title}</p>}
                            {!person.name && <p className="person-note">Details not publicly available</p>}
                            <span className="badge info">{person.role_category}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PeopleView;
