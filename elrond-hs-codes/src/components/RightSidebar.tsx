import React from 'react';
import {
  Card,
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
  visible: boolean;
  onToggle: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ 
  products, 
  selectedProduct, 
  onProductSelect, 
  visible, 
  onToggle 
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
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

  const filteredProducts = sortedProducts.filter(product =>
    product.identification.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.hsCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!visible) return null;

  return (
    <div style={{ 
      padding: '16px 12px', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      minHeight: 0
    }}>
      {/* Header */}
      <div className="palantir-field-group" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
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
      <div className="palantir-field-group">
        <InputGroup
          leftIcon={IconNames.SEARCH}
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          rightElement={
            searchQuery ? (
              <Button
                icon={IconNames.CROSS}
                minimal
                onClick={() => setSearchQuery('')}
              />
            ) : undefined
          }
          fill
        />
      </div>

      {/* Statistics Card */}
      <Card className="palantir-field-group" style={{ padding: '12px 16px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr auto 1fr auto 1fr',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="palantir-heading" style={{ 
              fontSize: '18px', 
              margin: '0 0 2px 0',
              fontWeight: '600'
            }}>
              {sortedProducts.length}
            </div>
            <div className="palantir-caption" style={{ fontSize: '10px' }}>
              Total Products
            </div>
          </div>
          
          <Divider style={{ 
            height: '28px', 
            borderColor: '#1A252F',
            margin: 0
          }} />
          
          <div style={{ textAlign: 'center' }}>
            <div className="palantir-heading" style={{ 
              fontSize: '18px', 
              margin: '0 0 2px 0',
              fontWeight: '600'
            }}>
              {new Set(sortedProducts.map(p => p.category)).size}
            </div>
            <div className="palantir-caption" style={{ fontSize: '10px' }}>
              Categories
            </div>
          </div>
          
          <Divider style={{ 
            height: '28px', 
            borderColor: '#1A252F',
            margin: 0
          }} />
          
          <div style={{ textAlign: 'center' }}>
            <div className="palantir-heading" style={{ 
              fontSize: '18px', 
              margin: '0 0 2px 0',
              fontWeight: '600'
            }}>
              {new Set(sortedProducts.map(p => p.origin)).size}
            </div>
            <div className="palantir-caption" style={{ fontSize: '10px' }}>
              Countries
            </div>
          </div>
        </div>
      </Card>

      {/* Product List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredProducts.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%'
          }}>
            <span 
              className="bp5-icon bp5-icon-search" 
              style={{ marginBottom: '8px', color: '#5C7080', fontSize: '32px' }}
            />
            <div className="palantir-body" style={{ color: '#8A9BA8' }}>
              No products found
            </div>
          </div>
        ) : (
          filteredProducts.map((product) => (
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
              {/* Header with product ID and metadata */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div className="palantir-code" style={{ 
                  fontSize: '11px',
                  padding: '2px 6px',
                  fontWeight: '600'
                }}>
                  {product.identification}
                </div>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '10px'
                }}>
                  <div className="palantir-caption">
                    {formatDate(product.dateAdded)}
                  </div>
                  <div className="palantir-caption" style={{ opacity: '0.7' }}>
                    {formatTime(product.dateAdded)}
                  </div>
                </div>
              </div>

              {/* Product description */}
              <div className="palantir-body" style={{ 
                fontSize: '11px',
                color: '#B8C5D1',
                marginBottom: '8px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.4',
                minHeight: '30px'
              }}>
                {product.description}
              </div>

              {/* Tags and metadata */}
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <div className="palantir-code" style={{ 
                  fontSize: '10px',
                  padding: '2px 6px',
                  fontWeight: '500'
                }}>
                  {product.hsCode}
                </div>
                
                <Tag 
                  intent={getCategoryColor(product.category) as any}
                  minimal
                  style={{ 
                    fontSize: '9px',
                    padding: '2px 6px',
                    minHeight: 'auto',
                    lineHeight: '1.2'
                  }}
                >
                  {product.category}
                </Tag>
                
                {product.origin && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <span 
                      className="bp5-icon bp5-icon-globe" 
                      style={{ color: '#8A9BA8', fontSize: '9px' }}
                    />
                    <div className="palantir-caption" style={{ 
                      fontSize: '9px',
                      lineHeight: '1.2'
                    }}>
                      {product.origin}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <Divider style={{ margin: '12px 0', borderColor: '#1A252F' }} />
      <div className="palantir-field-group" style={{ 
        display: 'flex', 
        gap: '8px',
        marginBottom: 0
      }}>
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

export { RightSidebar };
