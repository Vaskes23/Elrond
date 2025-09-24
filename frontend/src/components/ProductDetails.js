import React, { useState } from 'react';
import { Card, Button, Icon, Tag, Divider, Collapse, H1, H2, H3, H4, H5, Text } from '@blueprintjs/core';
import { ChevronDown, ChevronUp, Document, Download, Tag as TagIcon } from '@blueprintjs/icons';
import { format } from 'date-fns';
import './ProductDetails.css';

function ProductDetails({ product, onGenerateBTI, onExport }) {
    const [expandedCodes, setExpandedCodes] = useState({});
    const [expandedCitations, setExpandedCitations] = useState({});

    if (!product) {
        return (
            <div className="product-details">
                <Card className="empty-details" elevation={2}>
                    <Icon icon={<Document />} iconSize={64} color="#cbd5e1" />
                    <H3>Select a Product</H3>
                    <Text color="muted">Choose a product from the library to view its HS codes, duty rates, and compliance information.</Text>
                </Card>
            </div>
        );
    }

    const toggleCodeExpansion = (code) => {
        setExpandedCodes(prev => ({
            ...prev,
            [code]: !prev[code]
        }));
    };

    const toggleCitationExpansion = (index) => {
        setExpandedCitations(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 90) return '#10b981';
        if (confidence >= 75) return '#f59e0b';
        return '#ef4444';
    };

    const getConfidenceLabel = (confidence) => {
        if (confidence >= 90) return 'High';
        if (confidence >= 75) return 'Medium';
        return 'Low';
    };

    return (
        <div className="product-details">
            <Card className="details-header" elevation={2}>
                <div className="product-title-section">
                    <H1 className="product-title">{product.name}</H1>
                    <Text className="product-subtitle">{product.description}</Text>
                    <div className="product-badges">
                        <Tag intent="primary" large>{product.category}</Tag>
                        <Tag minimal large>
                            Added {format(new Date(product.dateAdded), 'MMM d, yyyy')}
                        </Tag>
                    </div>
                </div>
            </Card>

            <div className="details-content">
                {/* HS Codes Section */}
                <Card className="results-section" elevation={1}>
                    <H3 className="section-title">
                        <Icon icon={<TagIcon />} iconSize={20} style={{ marginRight: '8px' }} />
                        Top HS Codes
                    </H3>
                    <div className="hs-codes-list">
                        {product.hsCodes?.map((hsCode, index) => (
                            <Card key={index} className="hs-code-card" elevation={1}>
                                <div className="hs-code-header">
                                    <div className="hs-code-info">
                                        <Text className="hs-code-number" strong>{hsCode.code}</Text>
                                        <Tag
                                            intent={getConfidenceColor(hsCode.confidence) === '#10b981' ? 'success' :
                                                getConfidenceColor(hsCode.confidence) === '#f59e0b' ? 'warning' : 'danger'}
                                            round
                                        >
                                            {hsCode.confidence}% {getConfidenceLabel(hsCode.confidence)}
                                        </Tag>
                                    </div>
                                    <Button
                                        icon={expandedCodes[hsCode.code] ? "chevron-up" : "chevron-down"}
                                        minimal
                                        small
                                        onClick={() => toggleCodeExpansion(hsCode.code)}
                                    />
                                </div>
                                <Text className="hs-code-description">{hsCode.description}</Text>
                                <Collapse isOpen={expandedCodes[hsCode.code]}>
                                    <Divider />
                                    <div className="hs-code-details">
                                        <div className="detail-row">
                                            <Text strong>Classification:</Text>
                                            <Text>{hsCode.code}</Text>
                                        </div>
                                        <div className="detail-row">
                                            <Text strong>Confidence Score:</Text>
                                            <Text>{hsCode.confidence}%</Text>
                                        </div>
                                        <div className="detail-row">
                                            <Text strong>Ranking:</Text>
                                            <Text>#{index + 1}</Text>
                                        </div>
                                    </div>
                                </Collapse>
                            </Card>
                        ))}
                    </div>
                </Card>

                {/* Duty Rates Section */}
                <Card className="results-section" elevation={1}>
                    <H3 className="section-title">
                        <Icon icon={<Download />} iconSize={20} style={{ marginRight: '8px' }} />
                        Duty Rates by Region
                    </H3>
                    <div className="duty-rates-grid">
                        {Object.entries(product.dutyRates || {}).map(([region, rate]) => (
                            <Card key={region} className="duty-rate-card" elevation={1}>
                                <H4 className="region-name">{region}</H4>
                                <Text className="duty-rate" style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                                    {rate.rate}
                                </Text>
                                <Tag minimal>{rate.type}</Tag>
                            </Card>
                        ))}
                    </div>
                </Card>

                {/* Citations Section */}
                <Card className="results-section" elevation={1}>
                    <H3 className="section-title">
                        <Icon icon={<Document />} iconSize={20} style={{ marginRight: '8px' }} />
                        Regulatory Citations
                    </H3>
                    <div className="citations-list">
                        {product.citations?.map((citation, index) => (
                            <Card key={index} className="citation-card" elevation={1}>
                                <div className="citation-header">
                                    <div className="citation-source">
                                        <Text strong>{citation.source}</Text>
                                        <Text className="source-ref">{citation.reference}</Text>
                                    </div>
                                    <Button
                                        icon={expandedCitations[index] ? "chevron-up" : "chevron-down"}
                                        minimal
                                        small
                                        onClick={() => toggleCitationExpansion(index)}
                                    />
                                </div>
                                <Text className="citation-excerpt">{citation.excerpt}</Text>
                                <Collapse isOpen={expandedCitations[index]}>
                                    <Divider />
                                    <div className="citation-details">
                                        <div className="detail-row">
                                            <Text strong>Date:</Text>
                                            <Text>{citation.date}</Text>
                                        </div>
                                        <div className="detail-row">
                                            <Text strong>Source:</Text>
                                            <Text>{citation.source}</Text>
                                        </div>
                                    </div>
                                </Collapse>
                            </Card>
                        ))}
                    </div>
                </Card>

                {/* BTI Generator Section */}
                <Card className="results-section" elevation={1}>
                    <H3 className="section-title">
                        <Icon icon={<Document />} iconSize={20} style={{ marginRight: '8px' }} />
                        BTI Draft Generator
                    </H3>
                    <div className="bti-section">
                        <Text>
                            Generate a Binding Tariff Information (BTI) draft for this product based on the recommended HS codes.
                        </Text>
                        <Button
                            icon={<Document />}
                            text="Generate BTI Draft"
                            onClick={onGenerateBTI}
                            intent="primary"
                            large
                            style={{ marginTop: '16px' }}
                        />
                    </div>
                </Card>

                {/* Export Section */}
                <Card className="results-section" elevation={1}>
                    <H3 className="section-title">
                        <Icon icon={<Download />} iconSize={20} style={{ marginRight: '8px' }} />
                        Export Data
                    </H3>
                    <div className="export-buttons">
                        <Button
                            icon={<Download />}
                            text="CSV"
                            onClick={() => onExport('csv')}
                            outlined
                        />
                        <Button
                            icon={<Download />}
                            text="JSON"
                            onClick={() => onExport('json')}
                            outlined
                        />
                        <Button
                            icon={<Download />}
                            text="PDF"
                            onClick={() => onExport('pdf')}
                            outlined
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default ProductDetails;
