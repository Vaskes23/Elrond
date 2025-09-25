import React from 'react';
import { Button, H1, Text, Tag, Intent } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import GlobeBackground from './GlobeBackground';
import { mockProducts } from '../mockData';
import DecryptedText from './DecryptedText';

/**
 * LandingPage Component
 *
 * Main landing page featuring:
 * - Animated "Elrond" title with decryption effect
 * - Left sidebar with recent products from mockData
 * - Call-to-action button
 * - 3D globe background
 */
const LandingPage: React.FC = () => {
    const handleGetStarted = () => {
        window.location.href = '/dashboard';
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#FFFFFF',
            padding: '0',
            margin: '0',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Globe Background */}
            <GlobeBackground />

            {/* Left Sidebar */}
            <div style={{
                position: 'fixed',
                left: '40px',
                top: '40px',
                bottom: '40px',
                width: '300px',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                {/* Recent Products - Displays latest 5 products from mockData */}
                <div style={{ marginTop: '20px', opacity: 0.9 }}>
                    <Text style={{
                        color: '#FFFFFF',
                        fontSize: '14px',
                        marginTop: '60px',
                        fontWeight: '500',
                        marginBottom: '16px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        Recent Products
                    </Text>

                    <div style={{ overflowY: 'auto' }}>
                        {mockProducts.slice(0, 5).map((product) => (
                            <div
                                key={product.id}
                                style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '4px',
                                    marginBottom: '8px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {/* Product header: ID and date */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        padding: '2px 6px',
                                        fontWeight: '600',
                                        color: '#fff',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '2px'
                                    }}>
                                        {product.identification}
                                    </div>
                                    <div style={{
                                        fontSize: '10px',
                                        color: '#8A9BA8'
                                    }}>
                                        {product.dateAdded.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>

                                {/* Product description with text truncation */}
                                <div style={{
                                    fontSize: '11px',
                                    color: '#B8C5D1',
                                    marginBottom: '8px',
                                    lineHeight: '1.4',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {product.description}
                                </div>

                                {/* Product metadata: HS code, category, origin */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        fontWeight: '500',
                                        color: '#fff',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '2px'
                                    }}>
                                        {product.hsCode}
                                    </div>

                                    <Tag
                                        minimal
                                        style={{
                                            fontSize: '9px',
                                            padding: '2px 6px',
                                            minHeight: 'auto',
                                            lineHeight: '1.2',
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            color: '#B8C5D1'
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
                                            <div style={{
                                                fontSize: '9px',
                                                color: '#8A9BA8',
                                                lineHeight: '1.2'
                                            }}>
                                                {product.origin}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                zIndex: 100
            }}>
                {/* Status Info */}
                <div style={{
                    position: 'absolute',
                    top: '-150px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '60px',
                    alignItems: 'center'
                }}>
                </div>

                {/* Main Title - Decrypted Text Animation */}
                <H1 style={{
                    fontSize: '180px',
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    margin: '0',
                    letterSpacing: '-4px',
                    lineHeight: '0.9',
                    fontFamily: '"Helvetica", sans-serif'
                }}>
                    <DecryptedText
                        text="Elrond"
                        animateOn="view"
                        speed={250}
                        maxIterations={60}
                        sequential={true}
                        revealDirection="center"
                        characters="0123456789......"
                        style={{
                            fontSize: 'inherit',
                            fontWeight: 'inherit',
                            color: 'inherit',
                            letterSpacing: 'inherit',
                            lineHeight: 'inherit',
                            fontFamily: 'inherit'
                        }}
                    />
                </H1>

                {/* Get Started Button - Large Black with White Border */}
                <Button
                    text="Get Started"
                    intent={Intent.NONE}
                    size="large"
                    icon={IconNames.ARROW_RIGHT}
                    onClick={handleGetStarted}
                    className="palantir-get-started-button-black"
                    style={{
                        marginTop: '40px',
                        fontSize: '18px',
                        padding: '20px 40px',
                        minHeight: '60px',
                        minWidth: '200px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        target.style.background = '#1a1a1a';
                        target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)';
                        target.style.transform = 'translateY(-2px) scale(1.02)';
                        target.style.borderColor = '#f0f0f0';
                    }}
                    onMouseLeave={(e) => {
                        const target = e.currentTarget;
                        target.style.background = '#000000';
                        target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)';
                        target.style.transform = 'translateY(0px) scale(1)';
                        target.style.borderColor = '#FFFFFF';
                    }}
                    onMouseDown={(e) => {
                        const target = e.currentTarget;
                        target.style.background = '#333333';
                        target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.4)';
                        target.style.transform = 'translateY(1px) scale(0.98)';
                    }}
                    onMouseUp={(e) => {
                        const target = e.currentTarget;
                        target.style.background = '#1a1a1a';
                        target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)';
                        target.style.transform = 'translateY(-2px) scale(1.02)';
                    }}
                />

                {/* Copyright */}
                <div style={{
                    position: 'absolute',
                    bottom: '-100px',
                    right: '-200px',
                    textAlign: 'right'
                }}>
                    <Text style={{ color: '#666', fontSize: '11px', letterSpacing: '1px' }}>
                        COPYRIGHT ©2025
                    </Text>
                    <Text style={{ color: '#666', fontSize: '11px', letterSpacing: '1px' }}>
                        Elrond
                    </Text>
                </div>
            </div>

            {/* Bottom Status */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                zIndex: 100,
                color: '#666',
                fontSize: '11px'
            }}>
                <Text>410.JB 98556 92748</Text>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="bp5-icon bp5-icon-warning-sign" style={{ fontSize: '12px' }} />
                    <span className="bp5-icon bp5-icon-cog" style={{ fontSize: '12px' }} />
                    <span className="bp5-icon bp5-icon-info-sign" style={{ fontSize: '12px' }} />
                </div>
            </div>

        </div>
    );
};

export default LandingPage;
