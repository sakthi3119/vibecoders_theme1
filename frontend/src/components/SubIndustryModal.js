import React from 'react';
import { X, FileDown, FileText } from 'lucide-react';
import './SubIndustryModal.css';

function SubIndustryModal({ csvData, onClose }) {
    const downloadCSV = () => {
        if (!csvData) return;

        const csvContent = [
            ['Field', 'Value'],
            ['Sector', csvData.sector || 'N/A'],
            ['Industry', csvData.industry || 'N/A'],
            ['Sub-Industry', csvData.sub_industry || 'N/A'],
            ['SIC Code', csvData.sic_code || 'N/A'],
            ['SIC Description', csvData.sic_description || 'N/A'],
            ['Match Score', csvData.match_score || 'N/A']
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sub-industry-${csvData.sub_industry || 'data'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const downloadPDF = async () => {
        if (!csvData) return;

        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.text('Sub-Industry Classification', 20, 20);

            doc.setFontSize(12);
            let yPos = 40;
            const lineHeight = 10;

            const fields = [
                ['Sector:', csvData.sector || 'N/A'],
                ['Industry:', csvData.industry || 'N/A'],
                ['Sub-Industry:', csvData.sub_industry || 'N/A'],
                ['SIC Code:', csvData.sic_code || 'N/A'],
                ['SIC Description:', csvData.sic_description || 'N/A'],
                ['Match Score:', csvData.match_score || 'N/A']
            ];

            fields.forEach(([label, value]) => {
                doc.setFont(undefined, 'bold');
                doc.text(label, 20, yPos);
                doc.setFont(undefined, 'normal');
                const lines = doc.splitTextToSize(value, 150);
                doc.text(lines, 60, yPos);
                yPos += lineHeight * lines.length;
            });

            doc.save(`sub-industry-${csvData.sub_industry || 'data'}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please ensure jsPDF is installed.');
        }
    };
    if (!csvData) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Sub-Industry Classification Details</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="csv-details-grid">
                        <div className="csv-detail-item">
                            <label>Sector</label>
                            <div className="csv-value">{csvData.sector || 'N/A'}</div>
                        </div>

                        <div className="csv-detail-item">
                            <label>Industry</label>
                            <div className="csv-value">{csvData.industry || 'N/A'}</div>
                        </div>

                        <div className="csv-detail-item full-width">
                            <label>Sub-Industry</label>
                            <div className="csv-value highlight">{csvData.sub_industry || 'N/A'}</div>
                        </div>

                        <div className="csv-detail-item">
                            <label>SIC Code</label>
                            <div className="csv-value">{csvData.sic_code || 'N/A'}</div>
                        </div>

                        <div className="csv-detail-item full-width">
                            <label>SIC Description</label>
                            <div className="csv-value">{csvData.sic_description || 'N/A'}</div>
                        </div>

                        {csvData.match_score && (
                            <div className="csv-detail-item">
                                <label>Match Score</label>
                                <div className="csv-value score">{csvData.match_score}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-download csv" onClick={downloadCSV}>
                        <FileText size={18} />
                        Download CSV
                    </button>
                    <button className="btn-download pdf" onClick={downloadPDF}>
                        <FileDown size={18} />
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SubIndustryModal;
