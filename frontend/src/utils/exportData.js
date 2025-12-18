/**
 * Export company data to CSV and PDF formats
 */

// Convert JSON to CSV
export const exportToCSV = (companyData) => {
    if (!companyData) return;

    const rows = [];

    // Company Info
    rows.push(['COMPANY INFORMATION']);
    rows.push(['Field', 'Value']);
    rows.push(['Name', companyData.company.name || '']);
    rows.push(['Domain', companyData.company.domain || '']);
    rows.push(['Industry', companyData.company.industry || '']);
    rows.push(['Sub-Industry', companyData.company.sub_industry || '']);
    rows.push(['Short Description', companyData.company.short_description || '']);
    rows.push(['Long Description', companyData.company.long_description || '']);
    rows.push([]);

    // CSV Details if available
    if (companyData.company.csv_details) {
        rows.push(['SUB-INDUSTRY CLASSIFICATION']);
        rows.push(['Field', 'Value']);
        rows.push(['Sector', companyData.company.csv_details.sector || '']);
        rows.push(['Industry', companyData.company.csv_details.industry || '']);
        rows.push(['Sub-Industry', companyData.company.csv_details.sub_industry || '']);
        rows.push(['SIC Code', companyData.company.csv_details.sic_code || '']);
        rows.push(['SIC Description', companyData.company.csv_details.sic_description || '']);
        rows.push(['Match Score', companyData.company.csv_details.match_score || '']);
        rows.push([]);
    }

    // Locations
    rows.push(['LOCATIONS']);
    rows.push(['Headquarters', companyData.locations?.headquarters || '']);
    rows.push([]);

    // Products & Services
    rows.push(['PRODUCTS & SERVICES']);
    rows.push(['Name', 'Description']);
    if (companyData.products_services && companyData.products_services.length > 0) {
        companyData.products_services.forEach(product => {
            rows.push([product.name || '', product.description || '']);
        });
    }
    rows.push([]);

    // People
    rows.push(['KEY PEOPLE']);
    rows.push(['Name', 'Title', 'Role Category']);
    if (companyData.people && companyData.people.length > 0) {
        companyData.people.forEach(person => {
            rows.push([person.name || '', person.title || '', person.role_category || '']);
        });
    }
    rows.push([]);

    // Tech Stack
    rows.push(['TECHNOLOGY STACK']);
    if (companyData.tech_stack && companyData.tech_stack.length > 0) {
        companyData.tech_stack.forEach(tech => {
            rows.push([tech]);
        });
    }
    rows.push([]);

    // Contact
    rows.push(['CONTACT INFORMATION']);
    rows.push(['Emails', (companyData.contact?.emails || []).join(', ')]);
    rows.push(['Phones', (companyData.contact?.phones || []).join(', ')]);
    rows.push([]);

    // Social Media
    rows.push(['SOCIAL MEDIA']);
    if (companyData.social_media) {
        Object.entries(companyData.social_media).forEach(([platform, url]) => {
            if (url) rows.push([platform.charAt(0).toUpperCase() + platform.slice(1), url]);
        });
    }

    // Convert to CSV string
    const csvContent = rows.map(row =>
        row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${companyData.company.name || 'company'}_data.csv`;
    link.click();
};

// Export to PDF
export const exportToPDF = async (companyData) => {
    if (!companyData) return;

    // Dynamic import of jsPDF
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    const checkPageBreak = () => {
        if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = 20;
        }
    };

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(companyData.company.name || 'Company Report', margin, yPosition);
    yPosition += 15;

    // Company Information
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Company Information', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Domain: ${companyData.company.domain || 'N/A'}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Industry: ${companyData.company.industry || 'N/A'}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Sub-Industry: ${companyData.company.sub_industry || 'N/A'}`, margin, yPosition);
    yPosition += lineHeight * 2;

    checkPageBreak();

    // Description
    if (companyData.company.short_description) {
        const splitText = doc.splitTextToSize(companyData.company.short_description, 170);
        doc.text(splitText, margin, yPosition);
        yPosition += splitText.length * lineHeight + 5;
    }

    checkPageBreak();

    // Locations
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Headquarters', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(companyData.locations?.headquarters || 'N/A', margin, yPosition);
    yPosition += lineHeight * 2;

    checkPageBreak();

    // Products
    if (companyData.products_services && companyData.products_services.length > 0) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Products & Services', margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        companyData.products_services.slice(0, 10).forEach(product => {
            checkPageBreak();
            doc.setFont(undefined, 'bold');
            doc.text(`• ${product.name}`, margin, yPosition);
            yPosition += lineHeight;
            doc.setFont(undefined, 'normal');
            const desc = doc.splitTextToSize(product.description || '', 160);
            doc.text(desc, margin + 5, yPosition);
            yPosition += desc.length * lineHeight + 3;
        });
        yPosition += 5;
    }

    checkPageBreak();

    // People
    if (companyData.people && companyData.people.length > 0) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Key People', margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        companyData.people.slice(0, 15).forEach(person => {
            checkPageBreak();
            if (person.name) {
                doc.text(`• ${person.name} - ${person.title || 'N/A'}`, margin, yPosition);
                yPosition += lineHeight;
            }
        });
        yPosition += 5;
    }

    checkPageBreak();

    // Tech Stack
    if (companyData.tech_stack && companyData.tech_stack.length > 0) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Technology Stack', margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(companyData.tech_stack.join(', '), margin, yPosition);
    }

    // Save
    doc.save(`${companyData.company.name || 'company'}_report.pdf`);
};
