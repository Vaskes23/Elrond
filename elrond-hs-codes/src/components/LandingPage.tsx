import React from 'react';
import { Button, H1, H2, H3, Text, Card } from '@blueprintjs/core';
import GlobeBackground from './GlobeBackground';

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
            fontFamily: '"Elrond", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        background: '#FFFFFF',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <span className="bp5-icon bp5-icon-globe" style={{ fontSize: '16px', color: '#000' }} />
                    </div>
                    <Text style={{
                        fontSize: '18px',
                        color: '#FFFFFF',
                        fontWeight: '500',
                        letterSpacing: '0.5px'
                    }}>
                        Elrond
                    </Text>
                </div>

                {/* Search */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    padding: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="bp5-icon bp5-icon-search" style={{ fontSize: '14px', color: '#999' }} />
                        <Text style={{ color: '#999', fontSize: '14px' }}>Search targets...</Text>
                    </div>
                </div>

                {/* Navigation Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        padding: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        <Text style={{ color: '#fff', fontSize: '12px', fontWeight: '500' }}>
                            Stage ▼ Target Status ▼ Battlespace ▼
                        </Text>
                    </div>
                </div>

                {/* Recommended Taskings */}
                <div style={{ marginTop: '20px' }}>
                    <Text style={{
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '16px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        Recommended Taskings
                    </Text>

                    {/* Task Items */}
                    {[
                        { target: 'VZBD8', location: 'MUTANT FALCON', status: 'P/N', code: 'MTE/NC/SOTUP/OGM' },
                        { target: 'VZBD8', location: 'MUTANT FALCON', status: 'P/N', code: 'MTE/NC/SOTUP/OGM' },
                        { target: 'SAILBOAT/SA-5', location: 'MUTANT FALCON', status: 'RHDME', code: 'MTE/NC/SOTUP/OGM' },
                        { target: 'VZBD8', location: 'MUTANT FALCON', status: 'RHDME', code: 'MTE/NC/SOTUP/OGM' },
                        { target: 'VZBD8', location: 'MUTANT FALCON', status: 'RHDME', code: 'MTE/NC/SOTUP/OGM' },
                        { target: 'NQ-2', location: 'SA-5', status: 'P/N', code: 'MTE/NC/SOTUP/OGM' },
                        { target: 'MEXU/RQ-5A-6', location: 'SA-5', status: 'P/N', code: 'MTE/NC/SOTUP/OGM' }
                    ].map((task, index) => (
                        <Card key={index} style={{
                            background: 'rgba(139, 69, 19, 0.3)',
                            border: '1px solid #8B4513',
                            borderRadius: '4px',
                            padding: '12px',
                            marginBottom: '8px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    background: '#ff6b6b',
                                    borderRadius: '50%'
                                }} />
                                <Text style={{ color: '#fff', fontSize: '11px', fontWeight: '500' }}>
                                    {task.target}
                                </Text>
                            </div>
                            <Text style={{ color: '#ccc', fontSize: '10px', marginBottom: '2px' }}>
                                {task.location}
                            </Text>
                            <Text style={{ color: '#999', fontSize: '9px' }}>
                                {task.status} • {task.code}
                            </Text>
                        </Card>
                    ))}
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
                    <div style={{ textAlign: 'left' }}>
                        <Text style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            YOU ARE
                        </Text>
                        <Text style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                            NOW
                        </Text>
                        <Text style={{ color: '#888', fontSize: '12px' }}>
                            ENTERING
                        </Text>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <Text style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            TIME: 3 MNS
                        </Text>
                        <Text style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                            SCROLL
                        </Text>
                        <Text style={{ color: '#888', fontSize: '12px' }}>
                            TO EXPLORE
                        </Text>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <Text style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            THE OPERATING
                        </Text>
                        <Text style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                            SYSTEM FOR GLOBAL
                        </Text>
                        <Text style={{ color: '#888', fontSize: '12px' }}>
                            DECISION MAKING
                        </Text>
                    </div>
                </div>

                {/* Main Title */}
                <H1 style={{
                    fontSize: '180px',
                    fontWeight: '300',
                    color: '#FFFFFF',
                    margin: '0',
                    letterSpacing: '-4px',
                    lineHeight: '0.9',
                    fontFamily: '"Elrond", sans-serif'
                }}>
                    Elrond
                </H1>

                {/* Copyright */}
                <div style={{
                    position: 'absolute',
                    bottom: '-100px',
                    right: '-200px',
                    textAlign: 'right'
                }}>
                    <Text style={{ color: '#666', fontSize: '11px', letterSpacing: '1px' }}>
                        COPYRIGHT ©2024
                    </Text>
                    <Text style={{ color: '#666', fontSize: '11px', letterSpacing: '1px' }}>
                        Elrond
                    </Text>
                    <Text style={{ color: '#666', fontSize: '11px', letterSpacing: '1px' }}>
                        TECHNOLOGIES INC.
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

            {/* Get Started Button */}
            <Button
                text="Get Started"
                onClick={handleGetStarted}
                style={{
                    position: 'fixed',
                    top: '40px',
                    right: '40px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    zIndex: 100
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                }}
            />
        </div>
    );
};

export default LandingPage;
