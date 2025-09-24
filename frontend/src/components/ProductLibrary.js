import React from 'react';
import { Card, Button, Icon, Tag, Divider } from '@blueprintjs/core';
import { Package, WarningSign, Plus } from '@blueprintjs/icons';
import { format } from 'date-fns';
import './ProductLibrary.css';

function ProductLibrary({ products, selectedProduct, onSelectProduct, onAddProduct }) {
    const getProductIcon = (category) => {
        switch (category?.toLowerCase()) {
            case 'steel':
            case 'metal':
                return 'M';
            case 'plastic':
                return 'P';
            case 'electronic':
                return 'E';
            case 'textile':
                return 'T';
            case 'chemical':
                return 'C';
            default:
                return 'O';
        }
    };

    const getCategoryColor = (category) => {
        switch (category?.toLowerCase()) {
            case 'steel':
            case 'metal':
                return '#64748b';
            case 'plastic':
                return '#3b82f6';
            case 'electronic':
                return '#10b981';
            case 'textile':
                return '#f59e0b';
            default:
                return '#6b7280';
        }
    };

    return (
        <div className="product-library">
            <div className="library-header">
                <h2 className="library-title">Product Library</h2>
                <Button
                    icon={<Plus />}
                    onClick={onAddProduct}
                    minimal
                    className="add-btn-mobile"
                />
            </div>

            <div className="products-list">
                {products.length === 0 ? (
                    <Card className="empty-state" elevation={1}>
                        <Icon icon={<Package />} iconSize={48} color="#cbd5e1" />
                        <h3 className="empty-text">No products yet</h3>
                        <p className="empty-subtext">Add your first product to get started</p>
                        <Button
                            icon={<Plus />}
                            text="Add Product"
                            onClick={onAddProduct}
                            intent="primary"
                            large
                        />
                    </Card>
                ) : (
                    products.map((product) => (
                        <Card
                            key={product.id}
                            className={`product-item ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                            onClick={() => onSelectProduct(product)}
                            interactive
                            elevation={selectedProduct?.id === product.id ? 3 : 1}
                        >
                            <div className="product-content">
                                <div className="product-icon" style={{ backgroundColor: getCategoryColor(product.category) }}>
                                    {getProductIcon(product.category)}
                                </div>

                                <div className="product-info">
                                    <div className="product-header">
                                        <h3 className="product-name">{product.name}</h3>
                                        {product.hasAlerts && (
                                            <Icon icon={<WarningSign />} iconSize={16} color="#ef4444" />
                                        )}
                                    </div>

                                    <p className="product-description">{product.description}</p>

                                    <div className="product-meta">
                                        <Tag intent="primary" round>{product.category}</Tag>
                                        <span className="product-date">
                                            {format(new Date(product.dateAdded), 'MMM d, yyyy')}
                                        </span>
                                    </div>

                                    <Divider />

                                    <div className="product-stats">
                                        <Tag minimal>
                                            {product.hsCodes?.length || 0} HS codes
                                        </Tag>
                                        <Tag intent="success" minimal>
                                            {product.hsCodes?.[0]?.confidence || 0}% confidence
                                        </Tag>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

export default ProductLibrary;
