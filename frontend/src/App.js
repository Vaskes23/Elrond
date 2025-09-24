import React, { useState, useEffect } from 'react';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import Header from './components/Header';
import ProductLibrary from './components/ProductLibrary';
import ProductDetails from './components/ProductDetails';
import AddProductModal from './components/AddProductModal';
import TariffAlerts from './components/TariffAlerts';
import BTIGenerator from './components/BTIGenerator';
import { exportToCSV, exportToJSON, exportToPDF, downloadFile } from './utils/exportUtils';
import './App.css';

function App() {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);
    const [showBTIGenerator, setShowBTIGenerator] = useState(false);
    const [alerts, setAlerts] = useState([]);

    // Load products from localStorage on component mount
    useEffect(() => {
        const savedProducts = localStorage.getItem('hsComplianceProducts');
        if (savedProducts) {
            setProducts(JSON.parse(savedProducts));
        }
    }, []);

    // Save products to localStorage whenever products change
    useEffect(() => {
        localStorage.setItem('hsComplianceProducts', JSON.stringify(products));
    }, [products]);

    // Generate demo alerts
    useEffect(() => {
        const demoAlerts = [
            {
                id: 1,
                type: 'tariff_change',
                productId: 'steel-bolts',
                message: 'New anti-dumping duty on steel screws',
                severity: 'high',
                date: new Date('2024-01-15')
            },
            {
                id: 2,
                type: 'hs_code_update',
                productId: 'plastic-casings',
                message: 'HS code 3926.90.98 updated for plastic casings',
                severity: 'medium',
                date: new Date('2024-01-10')
            }
        ];
        setAlerts(demoAlerts);
    }, []);

    const handleExport = async (format) => {
        if (!selectedProduct) return;

        try {
            let content, filename, mimeType;

            switch (format) {
                case 'csv':
                    content = exportToCSV([selectedProduct]);
                    filename = `product_${selectedProduct.name.replace(/\s+/g, '_')}.csv`;
                    mimeType = 'text/csv';
                    break;
                case 'json':
                    content = exportToJSON([selectedProduct]);
                    filename = `product_${selectedProduct.name.replace(/\s+/g, '_')}.json`;
                    mimeType = 'application/json';
                    break;
                case 'pdf':
                    content = await exportToPDF(selectedProduct);
                    filename = `product_${selectedProduct.name.replace(/\s+/g, '_')}.txt`;
                    mimeType = 'text/plain';
                    break;
                default:
                    return;
            }

            downloadFile(content, filename, mimeType);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const addProduct = (productData) => {
        const newProduct = {
            id: Date.now().toString(),
            name: productData.name,
            description: productData.description,
            category: productData.category,
            dateAdded: new Date(),
            hsCodes: generateHSCodes(productData.name),
            dutyRates: generateDutyRates(),
            citations: generateCitations(productData.name),
            hasAlerts: false
        };

        setProducts(prev => [...prev, newProduct]);
        setSelectedProduct(newProduct);
        setShowAddModal(false);
    };

    const selectProduct = (product) => {
        setSelectedProduct(product);
    };

    const generateHSCodes = (productName) => {
        // Demo HS codes based on product type
        const hsCodeMap = {
            'steel': [
                { code: '7318.15.80', description: 'Screws, bolts and nuts, of iron or steel', confidence: 95 },
                { code: '7318.15.90', description: 'Other screws, bolts and nuts, of iron or steel', confidence: 88 },
                { code: '7318.16.00', description: 'Rivets, of iron or steel', confidence: 75 }
            ],
            'plastic': [
                { code: '3926.90.98', description: 'Other articles of plastics', confidence: 92 },
                { code: '3926.90.99', description: 'Other articles of plastics, n.e.s.', confidence: 85 },
                { code: '3926.90.90', description: 'Other articles of plastics, n.e.s.', confidence: 78 }
            ],
            'electronic': [
                { code: '8504.40.95', description: 'Static converters', confidence: 90 },
                { code: '8504.40.99', description: 'Other static converters', confidence: 82 },
                { code: '8504.50.95', description: 'Other inductors', confidence: 70 }
            ]
        };

        const productType = productName.toLowerCase();
        if (productType.includes('steel') || productType.includes('bolt')) {
            return hsCodeMap.steel;
        } else if (productType.includes('plastic') || productType.includes('casing')) {
            return hsCodeMap.plastic;
        } else if (productType.includes('electronic') || productType.includes('charger') || productType.includes('laptop')) {
            return hsCodeMap.electronic;
        }

        return hsCodeMap.steel; // Default
    };

    const generateDutyRates = () => {
        return {
            'EU': { rate: '6.5%', type: 'MFN' },
            'US': { rate: '2.5%', type: 'MFN' },
            'China': { rate: '8.0%', type: 'MFN' }
        };
    };

    const generateCitations = (productName) => {
        return [
            {
                source: 'EU TARIC',
                reference: 'Commission Regulation (EU) 2023/1234',
                excerpt: 'Classification of mechanical fasteners under heading 7318',
                date: '2023-12-15'
            },
            {
                source: 'WCO Explanatory Notes',
                reference: 'EN 7318.15',
                excerpt: 'Screws, bolts and nuts are classified according to their material and use',
                date: '2023-11-20'
            }
        ];
    };

    const unreadAlertsCount = alerts.filter(alert => !alert.read).length;

    return (
        <div className="app">
            <Header
                onAddProduct={() => setShowAddModal(true)}
                onShowAlerts={() => setShowAlerts(true)}
                alertsCount={unreadAlertsCount}
            />

            <div className="main-content">
                <ProductLibrary
                    products={products}
                    selectedProduct={selectedProduct}
                    onSelectProduct={selectProduct}
                    onAddProduct={() => setShowAddModal(true)}
                />

                <ProductDetails
                    product={selectedProduct}
                    onGenerateBTI={() => setShowBTIGenerator(true)}
                    onExport={handleExport}
                />
            </div>

            {showAddModal && (
                <AddProductModal
                    onClose={() => setShowAddModal(false)}
                    onAddProduct={addProduct}
                />
            )}

            {showAlerts && (
                <TariffAlerts
                    alerts={alerts}
                    onClose={() => setShowAlerts(false)}
                    onMarkAsRead={(alertId) => {
                        setAlerts(prev => prev.map(alert =>
                            alert.id === alertId ? { ...alert, read: true } : alert
                        ));
                    }}
                />
            )}

            {showBTIGenerator && selectedProduct && (
                <BTIGenerator
                    product={selectedProduct}
                    onClose={() => setShowBTIGenerator(false)}
                />
            )}
        </div>
    );
}

export default App;
