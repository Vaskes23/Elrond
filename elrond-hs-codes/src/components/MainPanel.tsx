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
import { Product, DashboardMetrics } from '../types';

interface MainPanelProps {
  selectedProduct: Product | null;
  onLeftToggle: () => void;
  onRightToggle: () => void;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  onAddProduct: () => void;
  onClearSelectedProduct: () => void;
  products: Product[];
}

export const MainPanel: React.FC<MainPanelProps> = ({
  selectedProduct,
  onLeftToggle,
  onRightToggle,
  leftSidebarVisible,
  rightSidebarVisible,
  onAddProduct,
  onClearSelectedProduct,
  products
}) => {

  // Calculate dashboard metrics
  const calculateMetrics = (): DashboardMetrics => {
    const totalProducts = products.length;
    const classified = products.filter(p => p.status === 'classified').length;
    const pending = products.filter(p => p.status === 'pending').length;
    const needsReview = products.filter(p => p.status === 'needs_review').length;

    const totalConfidence = products.reduce((sum, p) => sum + (p.confidence || 0), 0);
    const averageConfidence = totalProducts > 0 ? Math.round(totalConfidence / totalProducts) : 0;

    // Recent activity (products added in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = products.filter(p => p.dateAdded > sevenDaysAgo).length;

    return {
      totalProducts,
      classified,
      pending,
      needsReview,
      averageConfidence,
      recentActivity
    };
  };

  const metrics = calculateMetrics();


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
    <div className="gotham-grid-bg" style={{
      padding: '20px 24px',
      height: '100%',
      overflowY: 'auto',
      background: 'linear-gradient(135deg, #111418 0%, #0F161C 100%)'
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
          <h1 className="gotham-header" style={{ margin: 0 }}>
            HS Code Classification Dashboard
          </h1>
        </div>

      </div>

      {/* Dashboard Metrics Section */}
      <div className="animate-fade-in-up" style={{ marginBottom: '32px' }}>
        <div className="gotham-caption" style={{ marginBottom: '20px', textAlign: 'center' }}>
          System Overview
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '8px'
        }}>
          {/* Total Products Metric */}
          <Card className="metric-card status-total" style={{
            padding: '24px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)'
            }} />
            <div className="metric-number" style={{
              fontSize: '36px',
              marginBottom: '8px'
            }}>
              {metrics.totalProducts}
            </div>
            <div className="gotham-caption" style={{ color: '#cccccc' }}>
              Total Products
            </div>
          </Card>

          {/* Classified Metric */}
          <Card className="metric-card status-classified" style={{
            padding: '24px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(0, 153, 96, 0.6) 50%, transparent 100%)'
            }} />
            <div className="metric-number" style={{
              fontSize: '36px',
              marginBottom: '8px'
            }}>
              {metrics.classified}
            </div>
            <div className="gotham-caption">
              Classified
            </div>
          </Card>

          {/* Pending Metric */}
          <Card className="metric-card status-pending status-pulse" style={{
            padding: '24px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(217, 130, 43, 0.6) 50%, transparent 100%)'
            }} />
            <div className="metric-number" style={{
              fontSize: '36px',
              marginBottom: '8px'
            }}>
              {metrics.pending}
            </div>
            <div className="gotham-caption">
              Pending
            </div>
          </Card>

          {/* Needs Review Metric */}
          <Card className="metric-card status-needs-review status-pulse" style={{
            padding: '24px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(219, 55, 55, 0.6) 50%, transparent 100%)'
            }} />
            <div className="metric-number" style={{
              fontSize: '36px',
              marginBottom: '8px'
            }}>
              {metrics.needsReview}
            </div>
            <div className="gotham-caption">
              Need Review
            </div>
          </Card>
        </div>

        {/* Secondary Metrics Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginTop: '16px'
        }}>


        </div>
      </div>

      {selectedProduct ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Unified Product Details Card */}
          <Card className="palantir-section gotham-card-hover animate-fade-in-up" style={{
            padding: '40px',
            background: 'rgba(120, 120, 120, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)'
          }}>
            {/* Product Header Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '32px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div className="gotham-mono" style={{ fontSize: '24px', color: '#ffffff' }}>
                    {selectedProduct.identification}
                  </div>
                  <div className="gotham-caption" style={{
                    fontSize: '12px',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: `1px solid ${selectedProduct.status === 'classified' ? 'rgba(0, 153, 96, 0.4)' :
                      selectedProduct.status === 'pending' ? 'rgba(217, 130, 43, 0.4)' :
                        'rgba(219, 55, 55, 0.4)'
                      }`,
                    backgroundColor:
                      selectedProduct.status === 'classified' ? 'rgba(0, 153, 96, 0.1)' :
                        selectedProduct.status === 'pending' ? 'rgba(217, 130, 43, 0.1)' :
                          'rgba(219, 55, 55, 0.1)',
                    color:
                      selectedProduct.status === 'classified' ? '#3DCC91' :
                        selectedProduct.status === 'pending' ? '#FFB366' :
                          '#FF7373',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {selectedProduct.status === 'needs_review' ? 'Need Review' :
                      selectedProduct.status === 'pending' ? 'Pending' : 'Classified'}
                  </div>
                  {selectedProduct.confidence && (
                    <div className="gotham-caption" style={{
                      fontSize: '12px',
                      color: selectedProduct.confidence > 85 ? '#3DCC91' :
                        selectedProduct.confidence > 60 ? '#FFB366' : '#FF7373',
                      fontWeight: '500'
                    }}>
                      {selectedProduct.confidence}% confidence
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Tag
                    intent="primary"
                    large
                    style={{ fontWeight: 'bold', fontSize: '18px', padding: '8px 16px' }}
                  >
                    HS: {selectedProduct.hsCode}
                  </Tag>
                  {selectedProduct.category && (
                    <Tag
                      intent={getCategoryColor(selectedProduct.category) as any}
                      minimal
                      style={{ fontSize: '14px', padding: '6px 12px' }}
                    >
                      {selectedProduct.category}
                    </Tag>
                  )}
                  {selectedProduct.origin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="bp5-icon bp5-icon-globe" style={{ color: '#D3D8DE', fontSize: '16px' }} />
                      <Text style={{ color: '#D3D8DE', fontSize: '14px' }}>{selectedProduct.origin}</Text>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="gotham-caption" style={{ marginBottom: '8px' }}>
                  Added on
                </div>
                <div className="gotham-mono" style={{ fontWeight: '500', fontSize: '14px' }}>
                  {formatDate(selectedProduct.dateAdded)}
                </div>
              </div>
            </div>

            {/* Product Description */}
            <div style={{ marginBottom: '32px' }}>
              <div className="gotham-subheader" style={{ marginBottom: '16px' }}>
                Product Description
              </div>
              <div className="gotham-body" style={{
                fontSize: '16px',
                lineHeight: '1.6',
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {selectedProduct.description}
              </div>
            </div>

            {/* Classification Reasoning Section */}
            <div style={{ marginBottom: '32px' }}>
              <Callout
                intent="primary"
                icon={null}
                style={{
                  backgroundColor: 'rgba(120, 120, 120, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px',
                  borderRadius: '8px'
                }}>
                <div style={{
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div className="gotham-subheader" style={{ margin: 0 }}>
                    Classification Reasoning
                  </div>
                </div>

                <div className="gotham-body" style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  {selectedProduct.reasoning}
                </div>
              </Callout>
            </div>

            {/* Alternative HS Codes Section */}
            {selectedProduct.alternativeHSCodes && selectedProduct.alternativeHSCodes.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div className="gotham-subheader" style={{ marginBottom: '20px' }}>
                  Alternative HS Code Suggestions
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '16px'
                }}>
                  {/* Primary/Selected HS Code */}
                  <div style={{
                    padding: '20px',
                    background: 'rgba(0, 153, 96, 0.1)',
                    border: '2px solid rgba(0, 153, 96, 0.4)',
                    borderRadius: '8px',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      left: '16px',
                      background: '#3DCC91',
                      color: '#000',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      SELECTED
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div className="gotham-code" style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#3DCC91',
                          marginBottom: '4px'
                        }}>
                          {selectedProduct.hsCode}
                        </div>
                        {selectedProduct.category && (
                          <Tag
                            intent="success"
                            minimal
                            style={{ fontSize: '11px' }}
                          >
                            {selectedProduct.category}
                          </Tag>
                        )}
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#3DCC91'
                      }}>
                        {selectedProduct.confidence}%
                      </div>
                    </div>

                    <div className="gotham-body" style={{
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      {selectedProduct.reasoning}
                    </div>
                  </div>

                  {/* Alternative HS Codes */}
                  {selectedProduct.alternativeHSCodes.map((alternative, index) => (
                    <div
                      key={alternative.code}
                      style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        position: 'relative'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '-6px',
                        left: '12px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: index === 0 ? '#FFB366' : '#8A9BA8',
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        {index + 2}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div className="gotham-code" style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#ffffff',
                            marginBottom: '4px'
                          }}>
                            {alternative.code}
                          </div>
                          {alternative.category && (
                            <Tag
                              intent={alternative.confidence > 75 ? 'warning' : 'none'}
                              minimal
                              style={{ fontSize: '10px' }}
                            >
                              {alternative.category}
                            </Tag>
                          )}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: alternative.confidence > 75 ? '#FFB366' :
                            alternative.confidence > 60 ? '#D3D8DE' : '#8A9BA8'
                        }}>
                          {alternative.confidence}%
                        </div>
                      </div>

                      <div className="gotham-body" style={{
                        fontSize: '12px',
                        lineHeight: '1.4',
                        color: 'rgba(255, 255, 255, 0.8)'
                      }}>
                        {alternative.reasoning}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customs Call Section - Only show if confidence < 80% */}
            {selectedProduct.confidence && selectedProduct.confidence < 80 && (
              <div style={{ marginBottom: '32px' }}>
                {selectedProduct.status === 'pending' ? (
                  // Pending Status - Simple message
                  <Callout
                    intent="warning"
                    icon={null}
                    style={{
                      backgroundColor: 'rgba(217, 130, 43, 0.1)',
                      border: '1px solid rgba(217, 130, 43, 0.3)',
                      padding: '24px',
                      borderRadius: '8px'
                    }}>
                    <div style={{
                      marginBottom: '16px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="gotham-subheader" style={{ margin: 0 }}>
                          Customs Verification
                        </div>
                        <div style={{
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: '#FFB366',
                          backgroundColor: 'rgba(217, 130, 43, 0.2)',
                          border: '1px solid rgba(217, 130, 43, 0.4)'
                        }}>
                          PENDING
                        </div>
                      </div>
                    </div>

                    <div className="gotham-body" style={{
                      fontSize: '15px',
                      lineHeight: '1.6',
                      textAlign: 'center',
                      padding: '20px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '500' }}>
                        🤖 AI Agent will confirm the HS code with customs
                      </div>
                      <div style={{ color: '#FFB366', fontSize: '13px' }}>
                        Due to confidence level below 80%, our AI agent will contact customs authorities to verify the classification.
                      </div>
                    </div>
                  </Callout>
                ) : selectedProduct.status === 'needs_review' ? (
                  selectedProduct.customsCall ? (
                    // Needs Review Status - Full call details
                    <Callout
                      intent={selectedProduct.customsCall.outcome === 'confirmed' ? 'success' :
                        selectedProduct.customsCall.outcome === 'updated' ? 'warning' :
                          selectedProduct.customsCall.outcome === 'rejected' ? 'danger' : 'none'}
                      icon={null}
                      style={{
                        backgroundColor: selectedProduct.customsCall.outcome === 'confirmed' ? 'rgba(0, 153, 96, 0.1)' :
                          selectedProduct.customsCall.outcome === 'updated' ? 'rgba(217, 130, 43, 0.1)' :
                            selectedProduct.customsCall.outcome === 'rejected' ? 'rgba(219, 55, 55, 0.1)' :
                              'rgba(120, 120, 120, 0.1)',
                        border: `1px solid ${selectedProduct.customsCall.outcome === 'confirmed' ? 'rgba(0, 153, 96, 0.3)' :
                          selectedProduct.customsCall.outcome === 'updated' ? 'rgba(217, 130, 43, 0.3)' :
                            selectedProduct.customsCall.outcome === 'rejected' ? 'rgba(219, 55, 55, 0.3)' :
                              'rgba(255, 255, 255, 0.1)'}`,
                        padding: '24px',
                        borderRadius: '8px'
                      }}>
                      <div style={{
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="gotham-subheader" style={{ margin: 0 }}>
                            Customs Verification - Completed
                          </div>
                          <div style={{
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: selectedProduct.customsCall.outcome === 'confirmed' ? '#3DCC91' :
                              selectedProduct.customsCall.outcome === 'updated' ? '#FFB366' :
                                selectedProduct.customsCall.outcome === 'rejected' ? '#FF7373' : '#ffffff',
                            backgroundColor: selectedProduct.customsCall.outcome === 'confirmed' ? 'rgba(0, 153, 96, 0.2)' :
                              selectedProduct.customsCall.outcome === 'updated' ? 'rgba(217, 130, 43, 0.2)' :
                                selectedProduct.customsCall.outcome === 'rejected' ? 'rgba(219, 55, 55, 0.2)' :
                                  'rgba(255, 255, 255, 0.1)',
                            border: `1px solid ${selectedProduct.customsCall.outcome === 'confirmed' ? 'rgba(0, 153, 96, 0.4)' :
                              selectedProduct.customsCall.outcome === 'updated' ? 'rgba(217, 130, 43, 0.4)' :
                                selectedProduct.customsCall.outcome === 'rejected' ? 'rgba(219, 55, 55, 0.4)' :
                                  'rgba(255, 255, 255, 0.2)'}`
                          }}>
                            {selectedProduct.customsCall.outcome.toUpperCase()}
                          </div>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '24px' }}>
                          <div className="gotham-caption">
                            Agent: {selectedProduct.customsCall.agentName}
                          </div>
                          <div className="gotham-caption">
                            Date: {new Date(selectedProduct.customsCall.callDate).toLocaleDateString()}
                          </div>
                          {selectedProduct.customsCall.customsOfficer && (
                            <div className="gotham-caption">
                              Officer: {selectedProduct.customsCall.customsOfficer}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Completion Status */}
                      <div style={{
                        marginBottom: '20px',
                        padding: '16px',
                        background: 'rgba(0, 153, 96, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(0, 153, 96, 0.2)',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#3DCC91',
                          marginBottom: '4px'
                        }}>
                          ✅ AI Agent has completed customs verification
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                          The agent successfully contacted customs authorities and confirmed the HS code classification
                        </div>
                      </div>

                      {/* Call Summary */}
                      <div style={{ marginBottom: '20px' }}>
                        <div className="gotham-caption" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>
                          Agent's Call Summary
                        </div>
                        <div className="gotham-body" style={{
                          fontSize: '14px',
                          lineHeight: '1.6',
                          padding: '16px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {selectedProduct.customsCall.summary}
                        </div>
                      </div>

                      {/* Call Transcription */}
                      <div>
                        <div className="gotham-caption" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>
                          Full Call Transcription
                        </div>
                        <div className="gotham-body" style={{
                          fontSize: '13px',
                          lineHeight: '1.6',
                          padding: '16px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          fontFamily: 'JetBrains Mono, monospace',
                          whiteSpace: 'pre-line',
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}>
                          {selectedProduct.customsCall.transcription}
                        </div>
                      </div>

                      {/* Confirmed HS Code if different */}
                      {selectedProduct.customsCall.confirmedHSCode &&
                        selectedProduct.customsCall.confirmedHSCode !== selectedProduct.hsCode && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <div className="gotham-caption" style={{ marginBottom: '8px' }}>
                              Confirmed HS Code
                            </div>
                            <div className="gotham-code" style={{
                              fontSize: '16px',
                              color: '#3DCC91',
                              fontWeight: '600'
                            }}>
                              {selectedProduct.customsCall.confirmedHSCode}
                            </div>
                          </div>
                        )}
                    </Callout>
                  ) : (
                    // Needs Review but no call data - Error state
                    <Callout
                      intent="danger"
                      icon={null}
                      style={{
                        backgroundColor: 'rgba(219, 55, 55, 0.1)',
                        border: '1px solid rgba(219, 55, 55, 0.3)',
                        padding: '24px',
                        borderRadius: '8px'
                      }}>
                      <div className="gotham-subheader" style={{ margin: 0, marginBottom: '12px' }}>
                        Missing Call Data
                      </div>
                      <div className="gotham-body" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        This product is marked as "needs review" but the customs call data is missing. Please contact support.
                      </div>
                    </Callout>
                  )
                ) : null}
              </div>
            )}

            {/* Product Information Grid */}
            <div style={{ marginBottom: '32px' }}>
              <div className="gotham-subheader" style={{ marginBottom: '20px' }}>
                Product Information
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px'
              }}>
                <div>
                  <div className="palantir-field-group">
                    <div className="gotham-caption" style={{ marginBottom: '8px' }}>
                      Product ID
                    </div>
                    <div className="gotham-code" style={{ fontSize: '14px' }}>
                      {selectedProduct.identification}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="palantir-field-group">
                    <div className="gotham-caption" style={{ marginBottom: '8px' }}>
                      HS Code
                    </div>
                    <div className="gotham-code" style={{ fontSize: '14px' }}>
                      {selectedProduct.hsCode}
                    </div>
                  </div>
                </div>

                {selectedProduct.category && (
                  <div>
                    <div className="palantir-field-group">
                      <div className="gotham-caption" style={{ marginBottom: '8px' }}>
                        Category
                      </div>
                      <div className="gotham-body" style={{ fontWeight: '500', fontSize: '14px' }}>
                        {selectedProduct.category}
                      </div>
                    </div>
                  </div>
                )}

                {selectedProduct.origin && (
                  <div>
                    <div className="palantir-field-group">
                      <div className="gotham-caption" style={{ marginBottom: '8px' }}>
                        Country of Origin
                      </div>
                      <div className="gotham-body" style={{ fontWeight: '500', fontSize: '14px' }}>
                        {selectedProduct.origin}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="palantir-field-group">
                    <div className="gotham-caption" style={{ marginBottom: '8px' }}>
                      Classification Status
                    </div>
                    <div className="gotham-body" style={{
                      fontWeight: '500',
                      fontSize: '14px',
                      color:
                        selectedProduct.status === 'classified' ? '#3DCC91' :
                          selectedProduct.status === 'pending' ? '#FFB366' :
                            '#FF7373'
                    }}>
                      {selectedProduct.status === 'needs_review' ? 'Need Review' :
                        selectedProduct.status === 'pending' ? 'Pending' : 'Classified'}
                    </div>
                  </div>
                </div>

                {selectedProduct.confidence && (
                  <div>
                    <div className="palantir-field-group">
                      <div className="gotham-caption" style={{ marginBottom: '8px' }}>
                        Confidence Score
                      </div>
                      <div className="gotham-body" style={{
                        fontWeight: '500',
                        fontSize: '14px',
                        color: selectedProduct.confidence > 85 ? '#3DCC91' :
                          selectedProduct.confidence > 60 ? '#FFB366' : '#FF7373'
                      }}>
                        {selectedProduct.confidence}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Section */}
            <Divider style={{ margin: '24px 0' }} />

            <div>
              <div className="gotham-subheader" style={{ marginBottom: '16px' }}>
                Actions
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button
                  text="Accept"
                  intent="primary"
                  large
                  onClick={onClearSelectedProduct}
                />


              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60%',
          textAlign: 'center'
        }}>
          <span
            className="bp5-icon bp5-icon-shopping-cart"
            style={{ marginBottom: '24px', color: '#666666', fontSize: '80px', opacity: 0.6 }}
          />
          <h2 className="gotham-header" style={{
            color: '#cccccc',
            marginBottom: '16px',
            fontSize: '28px'
          }}>
            No Product Selected
          </h2>
          <div className="gotham-body" style={{
            color: '#999999',
            maxWidth: '400px',
            lineHeight: '1.6'
          }}>
            Select a product from the history panel to view its classification details and reasoning
          </div>
        </div>
      )}

    </div>
  );
};
