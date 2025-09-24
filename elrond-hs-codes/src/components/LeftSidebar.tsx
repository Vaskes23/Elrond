import React, { useState, useRef } from 'react';
import {
  Button,
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
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="palantir-heading">
            AI Assistant
          </div>
          <Button
            icon={IconNames.MENU_CLOSED}
            onClick={onToggle}
            minimal
            small
          />
        </div>

        {/* Quick Actions Section */}
        <div className="palantir-field-group">
          <div className="palantir-subheading" style={{ marginBottom: '12px' }}>
            Quick Actions
          </div>

          <div style={{
            display: 'grid',
            gap: '8px'
          }}>
            {/* Add Product Card */}
            <Card
              interactive
              style={{
                padding: '12px 16px',
                border: '1px solid #1A252F',
                background: 'linear-gradient(145deg, #141B22 0%, #0F161C 100%)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={onAddProduct}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span className="bp5-icon bp5-icon-plus" style={{
                  color: '#3DCC91',
                  fontSize: '16px'
                }} />
                <div className="palantir-body" style={{
                  fontWeight: '500',
                  color: '#E1E8ED'
                }}>
                  Add New Product
                </div>
              </div>
            </Card>

            {/* File Upload Card */}
            <Card style={{
              padding: '12px 16px',
              border: '1px solid #1A252F',
              background: 'linear-gradient(145deg, #141B22 0%, #0F161C 100%)',
              transition: 'all 0.15s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span className="bp5-icon bp5-icon-cloud-upload" style={{
                  color: '#8A9BA8',
                  fontSize: '16px'
                }} />
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

            {/* New Report Card */}
            <Card
              interactive
              style={{
                padding: '12px 16px',
                border: '1px solid #1A252F',
                background: 'linear-gradient(145deg, #141B22 0%, #0F161C 100%)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => {
                toasterRef.current?.show({
                  message: 'New report feature coming soon!',
                  intent: Intent.SUCCESS,
                  icon: IconNames.DOCUMENT,
                });
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span className="bp5-icon bp5-icon-document" style={{
                  color: '#3DCC91',
                  fontSize: '16px'
                }} />
                <div className="palantir-body" style={{
                  fontWeight: '500',
                  color: '#E1E8ED'
                }}>
                  Create New Report
                </div>
              </div>
            </Card>
          </div>
        </div>

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
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          marginTop: '16px'
        }}>
          <div className="palantir-subheading" style={{ marginBottom: '12px' }}>
            Chat
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '16px',
            border: '1px solid #1A252F',
            borderRadius: '4px',
            padding: '8px',
            background: 'linear-gradient(145deg, #0F161C 0%, #141B22 100%)'
          }}>
            {chatMessages.map((msg) => (
              <div key={msg.id} style={{
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Message bubble */}
                <div style={{
                  alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}>
                  {/* Sender and timestamp */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                    justifyContent: msg.isUser ? 'flex-end' : 'flex-start'
                  }}>
                    <div className="palantir-caption" style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: msg.isUser ? '#B8C5D1' : '#8A9BA8'
                    }}>
                      {msg.isUser ? 'You' : 'AI Assistant'}
                    </div>
                    <div className="palantir-caption" style={{ fontSize: '10px' }}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>

                  {/* Message content */}
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: msg.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.isUser
                      ? 'linear-gradient(145deg, #1A252F 0%, #2A3A47 100%)'
                      : 'linear-gradient(145deg, #141B22 0%, #0F161C 100%)',
                    border: '1px solid #1A252F',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                  }}>
                    <div className="palantir-body" style={{
                      fontSize: '12px',
                      lineHeight: '1.5',
                      color: '#E1E8ED',
                      margin: 0
                    }}>
                      {msg.message}
                    </div>
                  </div>
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
              style={{
                fontSize: '12px',
                height: '32px'
              }}
            />
            <Button
              icon={IconNames.SEND_MESSAGE}
              onClick={handleSendMessage}
              disabled={!currentMessage.trim()}
              intent={Intent.PRIMARY}
            />
          </div>
        </div>
      </div>
    </>
  );
};
