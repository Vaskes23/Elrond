import React, { useState } from 'react';
import { Dialog, Button, Icon, FormGroup, HTMLSelect, TextArea, H3, Text, Card } from '@blueprintjs/core';
import { Document, Download, Duplicate, Tick } from '@blueprintjs/icons';
import { format } from 'date-fns';
import './BTIGenerator.css';

function BTIGenerator({ product, onClose }) {
    const [copied, setCopied] = useState(false);
    const [selectedHSCode, setSelectedHSCode] = useState(product?.hsCodes?.[0] || null);

    if (!product) return null;

    const generateBTIContent = () => {
        const currentDate = format(new Date(), 'MMMM d, yyyy');
        const hsCode = selectedHSCode || product.hsCodes?.[0];

        return `BINDING TARIFF INFORMATION (BTI) DRAFT
===============================================

Product Information:
-------------------
Product Name: ${product.name}
Description: ${product.description}
Category: ${product.category}
Date of Application: ${currentDate}

Recommended Classification:
--------------------------
HS Code: ${hsCode?.code || 'N/A'}
Description: ${hsCode?.description || 'N/A'}
Confidence Level: ${hsCode?.confidence || 0}%

Alternative Classifications:
---------------------------
${product.hsCodes?.slice(1, 3).map((code, index) =>
            `${index + 2}. ${code.code} - ${code.description} (${code.confidence}% confidence)`
        ).join('\n') || 'No alternatives available'}

Duty Rates by Region:
--------------------
${Object.entries(product.dutyRates || {}).map(([region, rate]) =>
            `${region}: ${rate.rate} (${rate.type})`
        ).join('\n')}

Regulatory References:
---------------------
${product.citations?.map(citation =>
            `• ${citation.source} - ${citation.reference}\n  ${citation.excerpt}\n  Date: ${citation.date}`
        ).join('\n\n') || 'No citations available'}

Legal Basis:
------------
This classification is based on the Harmonized System (HS) nomenclature and the 
World Customs Organization (WCO) Explanatory Notes. The recommended HS code 
${hsCode?.code || 'N/A'} is determined based on the product's material composition, 
intended use, and manufacturing process.

Confidence Assessment:
---------------------
The recommended classification has a confidence level of ${hsCode?.confidence || 0}% 
based on the analysis of product characteristics and comparison with similar 
classifications in the EU TARIC database.

Validity Period:
---------------
This BTI is valid for 3 years from the date of issue, subject to changes in 
the Harmonized System or relevant regulations.

Prepared by: HS Compliance Copilot
Generated on: ${currentDate}
Version: 1.0`;
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generateBTIContent());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleDownload = () => {
        const content = generateBTIContent();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BTI_Draft_${product.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon icon={<Document />} iconSize={20} />
                    BTI Draft Generator
                </div>
            }
            style={{ width: '800px' }}
        >
            <div className="bti-body">
                <FormGroup label="Select HS Code" labelFor="hs-code-select">
                    <HTMLSelect
                        id="hs-code-select"
                        value={selectedHSCode?.code || ''}
                        onChange={(e) => {
                            const code = product.hsCodes?.find(c => c.code === e.target.value);
                            setSelectedHSCode(code);
                        }}
                        fill
                        large
                    >
                        {product.hsCodes?.map((code, index) => (
                            <option key={code.code} value={code.code}>
                                {code.code} - {code.description} ({code.confidence}%)
                            </option>
                        ))}
                    </HTMLSelect>
                </FormGroup>

                <Card className="bti-preview" elevation={1}>
                    <div className="preview-header">
                        <H3>BTI Draft Preview</H3>
                        <div className="preview-actions">
                            <Button
                                icon={copied ? <Tick /> : <Duplicate />}
                                text={copied ? 'Copied!' : 'Copy'}
                                onClick={handleCopy}
                                disabled={copied}
                                intent={copied ? 'success' : 'primary'}
                                style={{ marginRight: '8px' }}
                            />
                            <Button
                                icon={<Download />}
                                text="Download"
                                onClick={handleDownload}
                                intent="primary"
                            />
                        </div>
                    </div>

                    <div className="bti-content">
                        <TextArea
                            value={generateBTIContent()}
                            readOnly
                            fill
                            rows={20}
                            style={{ fontFamily: 'monospace', fontSize: '12px' }}
                        />
                    </div>
                </Card>
            </div>

            <div className="bti-footer">
                <Text className="disclaimer">
                    This is a draft BTI generated by HS Compliance Copilot. Please review
                    and verify all information before submitting to customs authorities.
                </Text>
            </div>
        </Dialog>
    );
}

export default BTIGenerator;
