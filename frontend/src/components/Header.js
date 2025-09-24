import React from 'react';
import { Button, Navbar, NavbarGroup, NavbarHeading, Icon } from '@blueprintjs/core';
import { Bell, Plus, GitBranch } from '@blueprintjs/icons';
import './Header.css';

function Header({ onAddProduct, onShowAlerts, alertsCount }) {
    return (
        <Navbar className="bp4-dark" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
            <NavbarGroup align="left">
                <Icon icon={<GitBranch />} iconSize={24} color="#60a5fa" style={{ marginRight: '12px' }} />
                <NavbarHeading style={{ color: 'white', fontWeight: '700', fontSize: '1.5rem' }}>
                    HS Compliance Copilot
                </NavbarHeading>
            </NavbarGroup>

            <NavbarGroup align="right">
                <Button
                    icon="plus"
                    text="Add Product"
                    onClick={onAddProduct}
                    intent="primary"
                    large
                    style={{ marginRight: '12px' }}
                />

                <Button
                    icon="notifications"
                    onClick={onShowAlerts}
                    intent="warning"
                    minimal
                    large
                    style={{ position: 'relative' }}
                >
                    {alertsCount > 0 && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                background: '#ef4444',
                                color: 'white',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '600'
                            }}
                        >
                            {alertsCount}
                        </div>
                    )}
                </Button>
            </NavbarGroup>
        </Navbar>
    );
}

export default Header;
