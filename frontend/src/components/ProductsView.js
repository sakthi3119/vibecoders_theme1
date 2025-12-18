import React from 'react';
import { Package, ArrowLeft } from 'lucide-react';
import './ProductsView.css';
import '../styles/BackButton.css';

function ProductsView({ products, onBack }) {
    if (!products || products.length === 0) {
        return (
            <div className="products-view">
                {onBack && (
                    <button className="back-button" onClick={onBack}>
                        <ArrowLeft size={20} />
                        Back to Overview
                    </button>
                )}
                <div className="empty-state">
                    <div className="empty-icon"><Package size={64} /></div>
                    <h2>No Products or Services</h2>
                    <p>No product information was extracted from the website</p>
                </div>
            </div>
        );
    }

    return (
        <div className="products-view">
            <div className="view-header">
                {onBack && (
                    <button className="back-button" onClick={onBack}>
                        <ArrowLeft size={20} />
                        Back to Overview
                    </button>
                )}
                <h2>Products & Services</h2>
                <p>Offerings and solutions provided by the company</p>
            </div>

            <div className="products-grid">
                {products.map((product, idx) => (
                    <div key={idx} className="product-card card">
                        <div className="product-header">
                            <Package className="product-icon" size={24} />
                            <h3>{product.name}</h3>
                        </div>
                        <p className="product-description">{product.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ProductsView;
