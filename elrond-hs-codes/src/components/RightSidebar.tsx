import React, { useRef } from 'react';
import {
  Card,
  Button,
  InputGroup,
  Tag,
  Divider,
  ButtonGroup,
  FileInput,
  OverlayToaster,
  Position,
  Intent,
  Text
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Product } from '../types';

interface RightSidebarProps {
  products: Product[];
  selectedProduct: Product | null;
  onProductSelect: (product: Product) => void;
  visible: boolean;
  onToggle: () => void;
  onAddProduct: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  products,
  selectedProduct,
  onProductSelect,
  visible,
  onToggle,
  onAddProduct
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const toasterRef = useRef<OverlayToaster>(null);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'classified': return { color: '#3DCC91', bg: 'rgba(0, 153, 96, 0.1)', border: 'rgba(0, 153, 96, 0.3)' };
      case 'pending': return { color: '#FFB366', bg: 'rgba(217, 130, 43, 0.1)', border: 'rgba(217, 130, 43, 0.3)' };
      case 'needs_review': return { color: '#FF7373', bg: 'rgba(219, 55, 55, 0.1)', border: 'rgba(219, 55, 55, 0.3)' };
      default: return { color: '#D3D8DE', bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'classified': return 'Classified';
      case 'pending': return 'Pending';
      case 'needs_review': return 'Need Review';
      default: return 'Unknown';
    }
  };

  const handleFileUpload = (event: React.FormEvent<HTMLLabelElement>) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);

      toasterRef.current?.show({
        message: `Uploaded ${newFiles.length} file(s) successfully`,
        intent: Intent.SUCCESS,
        timeout: 3000
      });
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
    <>
        {/* Quick Actions Section */}
        <Card className="gotham-card-hover" style={{
          padding: '24px',
          marginBottom: '16px',
          background: 'rgba(120, 120, 120, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)'
        }}>
          <div className="gotham-caption" style={{ marginBottom: '16px' }}>
            Quick Actions
          </div>
          <ButtonGroup style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexDirection: 'column' }}>
            {/* Add Product Action */}
            <Button
              icon={IconNames.PLUS}
              text="Add New Product"
              onClick={onAddProduct}
              intent="primary"
              fill
            />

            {/* File Upload Action */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'rgba(120, 120, 120, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              backdropFilter: 'blur(10px)'
            }}>
              <span
                className="bp5-icon bp5-icon-cloud-upload"
                style={{ color: '#ffffff', fontSize: '14px' }}
              />
              <FileInput
                text="Upload Files..."
                onChange={handleFileUpload}
                inputProps={{ accept: '.pdf,.doc,.docx,.txt,.csv' }}
                buttonText="Browse"
                style={{ margin: 0, flex: 1 }}
              />
            </div>

            {/* Create Report Action */}
            <Button
              icon={IconNames.DOCUMENT}
              text="Create New Report"
              onClick={() => {
                toasterRef.current?.show({
                  message: 'New report feature coming soon!',
                  intent: Intent.SUCCESS,
                  icon: IconNames.DOCUMENT,
                });
              }}
              fill
            />
          </ButtonGroup>

          {/* Uploaded Files Display */}
          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <Text style={{ fontSize: '11px', color: '#D3D8DE', marginBottom: '6px' }}>
                Uploaded Files ({uploadedFiles.length})
              </Text>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                maxHeight: '50px',
                overflowY: 'auto'
              }}>
                {uploadedFiles.map((file, index) => (
                  <Tag key={index} minimal style={{ fontSize: '9px' }}>
                    {file.name} ({Math.round(file.size / 1024)}KB)
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </Card>

        <OverlayToaster ref={toasterRef} position={Position.TOP} />
      <div style={{
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0
      }}>
        {/* System Overview - Compact */}
        <div style={{ marginBottom: '16px' }}>
          <div className="gotham-caption" style={{ marginBottom: '12px', textAlign: 'center', fontSize: '12px' }}>
            System Overview
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px'
          }}>
            {/* Total Products */}
            <div style={{
              padding: '12px',
              textAlign: 'center',
              background: 'rgba(120, 120, 120, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '4px',
                color: '#ffffff'
              }}>
                {sortedProducts.length}
              </div>
              <div className="gotham-caption" style={{ fontSize: '9px' }}>
                Total Products
              </div>
            </div>

            {/* Classified */}
            <div style={{
              padding: '12px',
              textAlign: 'center',
              background: 'rgba(0, 153, 96, 0.1)',
              border: '1px solid rgba(0, 153, 96, 0.3)',
              borderRadius: '6px',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '4px',
                color: '#3DCC91'
              }}>
                {sortedProducts.filter(p => p.status === 'classified').length}
              </div>
              <div className="gotham-caption" style={{ fontSize: '9px' }}>
                Classified
              </div>
            </div>

            {/* Pending */}
            <div style={{
              padding: '12px',
              textAlign: 'center',
              background: 'rgba(217, 130, 43, 0.1)',
              border: '1px solid rgba(217, 130, 43, 0.3)',
              borderRadius: '6px',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '4px',
                color: '#FFB366'
              }}>
                {sortedProducts.filter(p => p.status === 'pending').length}
              </div>
              <div className="gotham-caption" style={{ fontSize: '9px' }}>
                Pending
              </div>
            </div>

            {/* Needs Review */}
            <div style={{
              padding: '12px',
              textAlign: 'center',
              background: 'rgba(219, 55, 55, 0.1)',
              border: '1px solid rgba(219, 55, 55, 0.3)',
              borderRadius: '6px',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '4px',
                color: '#FF7373'
              }}>
                {sortedProducts.filter(p => p.status === 'needs_review').length}
              </div>
              <div className="gotham-caption" style={{ fontSize: '9px' }}>
                Need Review
              </div>
            </div>
          </div>
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
                {/* Header with product ID and status */}
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
                    ...getStatusColor(product.status),
                    fontSize: '9px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    border: `1px solid ${getStatusColor(product.status).border}`,
                    backgroundColor: getStatusColor(product.status).bg,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {getStatusLabel(product.status)}
                  </div>
                </div>

                {/* Date metadata */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '10px',
                  marginBottom: '8px'
                }}>
                  <div className="palantir-caption">
                    {formatDate(product.dateAdded)}
                  </div>
                  <div className="palantir-caption" style={{ opacity: '0.7' }}>
                    {formatTime(product.dateAdded)}
                  </div>
                  {product.confidence && (
                    <div className="palantir-caption" style={{
                      marginLeft: 'auto',
                      fontSize: '9px',
                      color: product.confidence > 85 ? '#3DCC91' : product.confidence > 60 ? '#FFB366' : '#FF7373'
                    }}>
                      {product.confidence}% confidence
                    </div>
                  )}
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
      </div>
    </>
  );
};

export { RightSidebar };
