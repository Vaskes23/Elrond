import React, { useState, useRef } from 'react';
import {
  Button,
  Card,
  InputGroup,
  OverlayToaster,
  Position
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { useNavigate } from 'react-router-dom';
import { ChatMessage } from '../types';
import { mockChatMessages } from '../mockData';
// @ts-ignore
import ElrondLogo from '../ElrondLogoWhite.png';

interface LeftSidebarProps {
  onToggle: () => void;
  visible: boolean;
}


export const LeftSidebar: React.FC<LeftSidebarProps> = ({ onToggle, visible }) => {
  const navigate = useNavigate();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toasterRef = useRef<OverlayToaster>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      message: currentMessage,
      isUser: true,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    setCurrentMessage('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: 'Thank you for your message. I\'m analyzing your request and will provide HS code classification assistance shortly.',
        isUser: false,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
      scrollToBottom();
    }, 1000);

    scrollToBottom();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!visible) return null;

  return (
    <>
      <OverlayToaster ref={toasterRef} position={Position.TOP} />
      <div style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0
      }}>
        {/* Header */}
        <div className="palantir-field-group" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'linear-gradient(145deg, #141B22 0%, #0F161C 100%)',
          border: '1px solid #1A252F',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => navigate('/')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            <img
              src={ElrondLogo}
              alt="Elrond Logo"
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'contain',
                filter: 'brightness(1.2) contrast(1.1)'
              }}
            />
            <div className="palantir-heading" style={{
              fontSize: '16px',
              fontWeight: 'bold',
              margin: 0,
              background: 'linear-gradient(135deg, #E1E8ED 0%, #B8C5D1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.5px'
            }}>
              Elrond
            </div>
          </div>

          <Button
            icon={IconNames.MENU_CLOSED}
            onClick={onToggle}
            minimal
            small
            style={{
              color: '#8A9BA8',
              padding: '6px'
            }}
            title="Hide Sidebar"
          />
        </div>


        {/* Chat Section */}
        <Card style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          padding: '12px 16px'
        }}>
          <div className="palantir-heading" style={{ marginBottom: '12px' }}>
            Chat
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '16px'
          }}>
            {chatMessages.map((msg) => (
              <div key={msg.id} style={{
                padding: '12px 16px',
                marginBottom: '8px',
                border: '1px solid #1A252F',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                transition: 'all 0.15s ease'
              }}>
                {/* Header with sender and timestamp */}
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
                    {msg.isUser ? 'You' : 'AI Assistant'}
                  </div>
                  <div className="palantir-caption" style={{ fontSize: '10px' }}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>

                {/* Message content */}
                <div className="palantir-body" style={{
                  fontSize: '11px',
                  color: '#B8C5D1',
                  lineHeight: '1.4',
                  margin: 0
                }}>
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="palantir-field-group" style={{
            display: 'flex',
            gap: '8px',
            marginBottom: 0
          }}>
            <InputGroup
              placeholder="Type your message..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              fill
              rightElement={
                currentMessage.trim() ? (
                  <Button
                    icon={IconNames.SEND_MESSAGE}
                    minimal
                    onClick={handleSendMessage}
                    style={{ marginRight: '4px' }}
                  />
                ) : undefined
              }
            />
          </div>
        </Card>
      </div>
    </>
  );
};