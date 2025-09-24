import React from 'react';
import { Dialog, Button, Icon, Card, Tag, Divider, H3, Text } from '@blueprintjs/core';
import { WarningSign, InfoSign, Tick, Time } from '@blueprintjs/icons';
import { format } from 'date-fns';
import './TariffAlerts.css';

function TariffAlerts({ alerts, onClose, onMarkAsRead }) {
    const getAlertIcon = (type, severity) => {
        if (type === 'tariff_change') {
            return <Icon icon={<WarningSign />} iconSize={20} color="#ef4444" />;
        } else if (type === 'hs_code_update') {
            return <Icon icon={<InfoSign />} iconSize={20} color="#f59e0b" />;
        }
        return <Icon icon={<InfoSign />} iconSize={20} color="#3b82f6" />;
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high':
                return '#ef4444';
            case 'medium':
                return '#f59e0b';
            case 'low':
                return '#3b82f6';
            default:
                return '#6b7280';
        }
    };

    const getSeverityLabel = (severity) => {
        switch (severity) {
            case 'high':
                return 'High Priority';
            case 'medium':
                return 'Medium Priority';
            case 'low':
                return 'Low Priority';
            default:
                return 'Info';
        }
    };

    const unreadAlerts = alerts.filter(alert => !alert.read);
    const readAlerts = alerts.filter(alert => alert.read);

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon icon={<WarningSign />} iconSize={20} />
                    Tariff Alerts
                    {unreadAlerts.length > 0 && (
                        <Tag intent="danger" round>{unreadAlerts.length}</Tag>
                    )}
                </div>
            }
            style={{ width: '600px' }}
        >

            <div className="alerts-body">
                {alerts.length === 0 ? (
                    <Card className="empty-alerts" elevation={1}>
                        <Icon icon={<Tick />} iconSize={48} color="#10b981" />
                        <H3>No Alerts</H3>
                        <Text>You're all caught up! No tariff changes or updates at the moment.</Text>
                    </Card>
                ) : (
                    <>
                        {unreadAlerts.length > 0 && (
                            <div className="alerts-section">
                                <H3 className="section-title">Unread Alerts</H3>
                                <div className="alerts-list">
                                    {unreadAlerts.map((alert) => (
                                        <Card
                                            key={alert.id}
                                            className="alert-item unread"
                                            onClick={() => onMarkAsRead(alert.id)}
                                            interactive
                                            elevation={2}
                                        >
                                            <div className="alert-content">
                                                <div className="alert-header">
                                                    <Text strong className="alert-title">{alert.message}</Text>
                                                    <Tag
                                                        intent={alert.severity === 'high' ? 'danger' : alert.severity === 'medium' ? 'warning' : 'primary'}
                                                        round
                                                    >
                                                        {getSeverityLabel(alert.severity)}
                                                    </Tag>
                                                </div>
                                                <div className="alert-meta">
                                                    <Text className="alert-date">
                                                        <Icon icon={<Time />} iconSize={14} style={{ marginRight: '4px' }} />
                                                        {format(new Date(alert.date), 'MMM d, yyyy')}
                                                    </Text>
                                                    <Tag minimal>{alert.type.replace('_', ' ').toUpperCase()}</Tag>
                                                </div>
                                                <Divider />
                                                <Button
                                                    text="Mark as Read"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onMarkAsRead(alert.id);
                                                    }}
                                                    intent="primary"
                                                    small
                                                />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {readAlerts.length > 0 && (
                            <div className="alerts-section">
                                <H3 className="section-title">Read Alerts</H3>
                                <div className="alerts-list">
                                    {readAlerts.map((alert) => (
                                        <Card
                                            key={alert.id}
                                            className="alert-item read"
                                            elevation={1}
                                        >
                                            <div className="alert-content">
                                                <div className="alert-header">
                                                    <Text className="alert-title">{alert.message}</Text>
                                                    <Tag
                                                        intent={alert.severity === 'high' ? 'danger' : alert.severity === 'medium' ? 'warning' : 'primary'}
                                                        round
                                                        minimal
                                                    >
                                                        {getSeverityLabel(alert.severity)}
                                                    </Tag>
                                                </div>
                                                <div className="alert-meta">
                                                    <Text className="alert-date">
                                                        <Icon icon={<Time />} iconSize={14} style={{ marginRight: '4px' }} />
                                                        {format(new Date(alert.date), 'MMM d, yyyy')}
                                                    </Text>
                                                    <Tag minimal>{alert.type.replace('_', ' ').toUpperCase()}</Tag>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="alerts-footer">
                <Button text="Dismiss All" onClick={onClose} outlined />
            </div>
        </Dialog>
    );
}

export default TariffAlerts;
