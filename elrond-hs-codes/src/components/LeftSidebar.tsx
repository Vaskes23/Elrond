import React, { useState, useRef } from 'react';
import {
  Button,
  ButtonGroup,
  Card,
  InputGroup,
  Divider,
  FileInput,
  OverlayToaster,
  Position,
  Intent
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ChatMessage } from '../types';
import { mockChatMessages } from '../mockData';
import ElrondLogo from '../ElrondLogoWhite.png';

interface LeftSidebarProps {
  onToggle: () => void;
  visible: boolean;
  onAddProduct: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ onToggle, visible, onAddProduct }) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [currentMessage, setCurrentMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
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

        {/* Quick Actions Section */}
        <Card
          className="palantir-field-group"
          style={{
            padding: '16px',
            backgroundColor: '#111418',
            border: '1px solid #1C2127'
          }}
        >

          <ButtonGroup
            fill
            vertical
            style={{
              gap: '8px'
            }}
          >
            <Button
              icon={IconNames.PLUS}
              text="Add New Product"
              onClick={onAddProduct}
              style={{
                backgroundColor: '#1C2127',
                border: '1px solid #5F6B7C',
                color: '#D3D8DE',
                justifyContent: 'flex-start',
                padding: '12px 16px',
                marginBottom: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLElement;
                target.style.backgroundColor = '#5F6B7C';
                target.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLElement;
                target.style.backgroundColor = '#1C2127';
                target.style.color = '#D3D8DE';
              }}
            />

            <Card
              style={{
                padding: '12px 16px',
                backgroundColor: '#1C2127',
                border: '1px solid #5F6B7C',
                marginBottom: '8px'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span
                  className="bp5-icon bp5-icon-cloud-upload"
                  style={{
                    color: '#5F6B7C',
                    fontSize: '16px'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <FileInput
                    text="Upload Files..."
                    onChange={handleFileUpload}
                    inputProps={{ accept: '.pdf,.doc,.docx,.txt,.csv' }}
                    fill
                    buttonText="Browse"
                    style={{ margin: 0 }}
                  />
                </div>
              </div>
            </Card>

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
              style={{
                backgroundColor: '#1C2127',
                border: '1px solid #5F6B7C',
                color: '#D3D8DE',
                justifyContent: 'flex-start',
                padding: '12px 16px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLElement;
                target.style.backgroundColor = '#5F6B7C';
                target.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLElement;
                target.style.backgroundColor = '#1C2127';
                target.style.color = '#D3D8DE';
              }}
            />
          </ButtonGroup>
        </Card>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card className="palantir-field-group" style={{ padding: '16px' }}>
            <div className="palantir-subheading" style={{ marginBottom: '12px' }}>
              Uploaded Files ({uploadedFiles.length})
            </div>
            <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="data-row" style={{
                  padding: '8px 12px',
                  margin: '4px 0',
                  borderRadius: '3px',
                  border: '1px solid #1A252F'
                }}>
                  <div className="data-cell">
                    <div className="palantir-body" style={{ fontSize: '11px' }}>
                      {file.name}
                    </div>
                  </div>
                  <div className="data-cell narrow" style={{ textAlign: 'right' }}>
                    <div className="palantir-caption">
                      {Math.round(file.size / 1024)}KB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Divider style={{ margin: '20px 0', borderColor: '#1A252F' }} />

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