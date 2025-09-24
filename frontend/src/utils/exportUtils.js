// Export utility functions for different formats

export const exportToCSV = (products) => {
    const headers = [
        'Product Name',
        'Description',
        'Category',
        'Date Added',
        'Primary HS Code',
        'HS Code Description',
        'Confidence %',
        'EU Duty Rate',
        'US Duty Rate',
        'China Duty Rate'
    ];

    const csvData = products.map(product => [
        product.name,
        product.description,
        product.category,
        new Date(product.dateAdded).toLocaleDateString(),
        product.hsCodes?.[0]?.code || '',
        product.hsCodes?.[0]?.description || '',
        product.hsCodes?.[0]?.confidence || 0,
        product.dutyRates?.EU?.rate || '',
        product.dutyRates?.US?.rate || '',
        product.dutyRates?.China?.rate || ''
    ]);

    const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
};

export const exportToJSON = (products) => {
    return JSON.stringify(products, null, 2);
};

export const exportToPDF = async (product) => {
    // This is a simplified PDF generation
    // In a real application, you'd use a library like jsPDF or Puppeteer
    const content = `
HS Compliance Copilot - Product Report
=====================================

Product Information:
Name: ${product.name}
Description: ${product.description}
Category: ${product.category}
Date Added: ${new Date(product.dateAdded).toLocaleDateString()}

HS Codes:
${product.hsCodes?.map((code, index) =>
        `${index + 1}. ${code.code} - ${code.description} (${code.confidence}% confidence)`
    ).join('\n') || 'No HS codes available'}

Duty Rates:
${Object.entries(product.dutyRates || {}).map(([region, rate]) =>
        `${region}: ${rate.rate} (${rate.type})`
    ).join('\n')}

Citations:
${product.citations?.map(citation =>
        `• ${citation.source} - ${citation.reference}\n  ${citation.excerpt}`
    ).join('\n\n') || 'No citations available'}

Generated on: ${new Date().toLocaleString()}
  `;

    return content;
};

export const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
