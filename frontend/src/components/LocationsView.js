import React from 'react';
import { MapPin, ArrowLeft } from 'lucide-react';
import './LocationsView.css';
import '../styles/BackButton.css';

function LocationsView({ locations, onBack }) {
    const hasLocations = locations?.headquarters;

    if (!hasLocations) {
        return (
            <div className="locations-view">
                {onBack && (
                    <button className="back-button" onClick={onBack}>
                        <ArrowLeft size={20} />
                        Back to Overview
                    </button>
                )}
                <div className="empty-state">
                    <div className="empty-icon"><MapPin size={64} /></div>
                    <h2>No Location Information</h2>
                    <p>No location data was extracted from the website</p>
                </div>
            </div>
        );
    }

    return (
        <div className="locations-view">
            <div className="view-header">
                {onBack && (
                    <button className="back-button" onClick={onBack}>
                        <ArrowLeft size={20} />
                        Back to Overview
                    </button>
                )}
                <h2>Headquarters Location</h2>
                <p>Company headquarters location</p>
            </div>

            <div className="locations-container">
                {locations.headquarters && (
                    <div className="location-card card headquarters">
                        <div className="location-header">
                            <MapPin className="location-icon hq" size={24} />
                            <div>
                                <span className="location-type badge success">Headquarters</span>
                                <h3>{locations.headquarters}</h3>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LocationsView;
