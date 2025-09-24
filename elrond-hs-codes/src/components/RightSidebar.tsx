import React from 'react';
import {
  Card,
  Text,
  Button,
  InputGroup,
  Tag,
  Divider,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Product } from '../types';

interface RightSidebarProps {
  products: Product[];
  selectedProduct: Product | null;
  onProductSelect: (product: Product) => void;
  onToggle: () => void;
  visible: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  products,
  selectedProduct,
  onProductSelect,
  onToggle,
  visible,
  searchQuery,
  onSearchChange
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'electronics': return 'primary';
      case 'apparel': return 'success';
      case 'cosmetics': return 'warning';
      case 'furniture': return 'warning';
      case 'food & beverages': return 'danger';
      default: return undefined;
    }
  };

  const sortedProducts = [...products].sort((a, b) => 
    new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  );

  if (!visible) return null;

  return (
    <div style={{ 
      padding: '20px 16px', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      minHeight: 0
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div className="palantir-heading">
          Product History
        </div>
        <Button
          icon={IconNames.MENU_CLOSED}
          onClick={onToggle}
          minimal
          small
        />
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
        <InputGroup
          leftIcon={IconNames.SEARCH}
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          rightElement={
            searchQuery ? (
              <Button
                icon={IconNames.CROSS}
                minimal
                small
                onClick={() => onSearchChange('')}
              />
            ) : undefined
          }
        />
      </div>

      {/* Stats */}
      <Card className="palantir-field-group" style={{ padding: '16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="palantir-heading" style={{ fontSize: '18px', margin: 0 }}>
              {sortedProducts.length}
            </div>
            <div className="palantir-caption">
              Total Products
            </div>
          </div>
          <Divider style={{ height: '40px', margin: '0 12px' }} />
          <div style={{ textAlign: 'center' }}>
            <div className="palantir-heading" style={{ fontSize: '18px', margin: 0 }}>
              {new Set(sortedProducts.map(p => p.category)).size}
            </div>
            <div className="palantir-caption">
              Categories
            </div>
          </div>
          <Divider style={{ height: '40px', margin: '0 12px' }} />
          <div style={{ textAlign: 'center' }}>
            <div className="palantir-heading" style={{ fontSize: '18px', margin: 0 }}>
              {new Set(sortedProducts.map(p => p.origin)).size}
            </div>
            <div className="palantir-caption">
              Countries
            </div>
          </div>
        </div>
      </Card>

      {/* Product List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        minHeight: 0
      }}>
        {sortedProducts.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px'
          }}>
            <span 
              className="bp5-icon bp5-icon-search" 
              style={{ marginBottom: '8px', color: '#5C7080', fontSize: '32px' }}
            />
            <Text style={{ color: '#5C7080' }}>
              No products found
            </Text>
          </div>
        ) : (
          sortedProducts.map((product) => (
            <div
              key={product.id}
              className={`data-row ${selectedProduct?.id === product.id ? 'selected' : ''}`}
              onClick={() => onProductSelect(product)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                border: selectedProduct?.id === product.id 
                  ? '1px solid #E1E8ED' 
                  : '1px solid #1A252F',
                backgroundColor: selectedProduct?.id === product.id 
                  ? 'rgba(225, 232, 237, 0.08)' 
                  : 'rgba(255, 255, 255, 0.02)',
                borderRadius: '4px',
                marginBottom: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '6px'
              }}>
                <div className="data-cell">
                  <div className="palantir-body" style={{ 
                    fontWeight: '600',
                    fontSize: '12px',
                    color: selectedProduct?.id === product.id ? '#E1E8ED' : '#E1E8ED'
                  }}>
                    {product.identification}
                  </div>
                </div>
                <div className="data-cell narrow" style={{ textAlign: 'right' }}>
                  <div className="palantir-caption">
                    {formatDate(product.dateAdded)}
                  </div>
                  <div className="palantir-caption" style={{ fontSize: '10px' }}>
                    {formatTime(product.dateAdded)}
                  </div>
                </div>
              </div>

              <div className="palantir-body" style={{ 
                fontSize: '11px',
                color: '#B8C5D1',
                marginBottom: '8px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.4'
              }}>
                {product.description}
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div className="palantir-code" style={{ fontSize: '10px' }}>
                  {product.hsCode}
                </div>
                
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {product.category && (
                    <Tag 
                      intent={getCategoryColor(product.category) as any}
                      minimal
                      style={{ fontSize: '10px' }}
                    >
                      {product.category}
                    </Tag>
                  )}
                  {product.origin && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span 
                        className="bp5-icon bp5-icon-globe" 
                        style={{ marginRight: '2px', color: '#D3D8DE', fontSize: '10px' }}
                      />
                      <Text style={{ fontSize: '10px', color: '#D3D8DE' }}>
                        {product.origin}
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <Divider style={{ margin: '16px 0' }} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button
          text="Export List"
          icon={IconNames.EXPORT}
          small
          fill
          minimal
        />
        <Button
          text="Filter"
          icon={IconNames.FILTER}
          small
          minimal
        />
      </div>
    </div>
  );
};
