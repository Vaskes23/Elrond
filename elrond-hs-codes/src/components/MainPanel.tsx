import React from 'react';
import {
  Card,
  Text,
  Classes,
  Button,
  Tag,
  Divider,
  Callout,
  H1,
  H3
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Product } from '../types';

interface MainPanelProps {
  selectedProduct: Product | null;
  onLeftToggle: () => void;
  onRightToggle: () => void;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
}

export const MainPanel: React.FC<MainPanelProps> = ({
  selectedProduct,
  onLeftToggle,
  onRightToggle,
  leftSidebarVisible,
  rightSidebarVisible
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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


  return (
    <div style={{
      padding: '20px 24px',
      height: '100%',
      overflowY: 'auto',
      background: 'linear-gradient(180deg, #0A0E13 0%, #0C1117 100%)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!leftSidebarVisible && (
            <Button
              icon={IconNames.MENU}
              onClick={onLeftToggle}
              minimal
              large
            />
          )}
          <H1 className={Classes.HEADING} style={{ margin: 0 }}>
            HS Code Classification Dashboard
          </H1>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            text="Settings"
            icon={IconNames.COG}
            minimal
          />
          {!rightSidebarVisible && (
            <Button
              icon={IconNames.MENU}
              onClick={onRightToggle}
              minimal
              large
            />
          )}
        </div>
      </div>

      {selectedProduct ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Product Header Card */}
          <Card className="palantir-section" style={{ padding: '20px 24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px'
            }}>
              <div>
                <div className="palantir-heading" style={{ fontSize: '16px', marginBottom: '12px' }}>
                  {selectedProduct.identification}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Tag
                    intent="primary"
                    large
                    style={{ fontWeight: 'bold', fontSize: '16px' }}
                  >
                    HS: {selectedProduct.hsCode}
                  </Tag>
                  {selectedProduct.category && (
                    <Tag
                      intent={getCategoryColor(selectedProduct.category) as any}
                      minimal
                    >
                      {selectedProduct.category}
                    </Tag>
                  )}
                  {selectedProduct.origin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="bp5-icon bp5-icon-globe" style={{ color: '#D3D8DE', fontSize: '14px' }} />
                      <Text style={{ color: '#D3D8DE' }}>{selectedProduct.origin}</Text>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="palantir-caption" style={{ marginBottom: '4px' }}>
                  Added on
                </div>
                <div className="palantir-body" style={{ fontWeight: '500' }}>
                  {formatDate(selectedProduct.dateAdded)}
                </div>
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              margin: 0
            }}>
              {selectedProduct.description}
            </Text>
          </Card>

          {/* Classification Reasoning Card */}
          <Card style={{ marginBottom: '20px', padding: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <span
                className="bp5-icon bp5-icon-lightbulb"
                style={{ marginRight: '8px', color: '#D9822B', fontSize: '20px' }}
              />
              <div className="palantir-heading">
                Classification Reasoning
              </div>
            </div>

            <Callout intent="primary" style={{ backgroundColor: 'rgba(95, 107, 124, 0.15)', marginTop: '12px' }}>
              <div className="palantir-body" style={{
                fontSize: '13px',
                lineHeight: '1.6'
              }}>
                {selectedProduct.reasoning}
              </div>
            </Callout>
          </Card>

          {/* Additional Information Card */}
          <Card className="palantir-section" style={{ padding: '20px 24px' }}>
            <div className="palantir-heading" style={{ marginBottom: '16px' }}>
              Additional Information
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              <div>
                <div className="palantir-field-group">
                  <div className="palantir-caption" style={{ marginBottom: '4px' }}>
                    Product ID
                  </div>
                  <div className="palantir-code">
                    {selectedProduct.identification}
                  </div>
                </div>
              </div>

              <div>
                <div className="palantir-field-group">
                  <div className="palantir-caption" style={{ marginBottom: '4px' }}>
                    HS Code
                  </div>
                  <div className="palantir-code">
                    {selectedProduct.hsCode}
                  </div>
                </div>
              </div>

              {selectedProduct.category && (
                <div>
                  <div className="palantir-field-group">
                    <div className="palantir-caption" style={{ marginBottom: '4px' }}>
                      Category
                    </div>
                    <div className="palantir-body" style={{ fontWeight: '500' }}>
                      {selectedProduct.category}
                    </div>
                  </div>
                </div>
              )}

              {selectedProduct.origin && (
                <div>
                  <div className="palantir-field-group">
                    <div className="palantir-caption" style={{ marginBottom: '4px' }}>
                      Country of Origin
                    </div>
                    <div className="palantir-body" style={{ fontWeight: '500' }}>
                      {selectedProduct.origin}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Divider style={{ margin: '20px 0' }} />

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                text="Edit Classification"
                icon={IconNames.EDIT}
                intent="primary"
              />
              <Button
                text="Generate Report"
                icon={IconNames.DOCUMENT}
                minimal
              />
              <Button
                text="Export Details"
                icon={IconNames.EXPORT}
                minimal
              />
              <Button
                text="Archive"
                icon={IconNames.ARCHIVE}
                minimal
                intent="warning"
              />
            </div>
          </Card>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60%'
        }}>
          <span
            className="bp5-icon bp5-icon-shopping-cart"
            style={{ marginBottom: '16px', color: '#5C7080', fontSize: '64px' }}
          />
          <H3 className={Classes.HEADING} style={{
            color: '#5C7080',
            marginBottom: '8px'
          }}>
            No Product Selected
          </H3>
          <Text style={{ color: '#5C7080' }}>
            Select a product from the history panel to view its details
          </Text>
        </div>
      )}

    </div>
  );
};
