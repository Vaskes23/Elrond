import React, { useState, useEffect } from 'react';
import {
    Dialog,
    Button,
    Classes,
    ProgressBar,
    Callout,
    H3,
    Text,
    Divider,
    Tag,
    TextArea,
    Spinner,
    RadioGroup,
    Radio
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Product } from '../types';
import { backendApi, ClassificationSession, QuestionResponse, HSCandidate, convertToFrontendProduct, AgentVerificationStart, AgentVerificationSession } from '../services/backendApi';

interface BackendProductQuestionnaireProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (product: Product) => void;
}

type QuestionnaireState = 
    | 'starting'
    | 'questioning'
    | 'analyzing'
    | 'completed'
    | 'error';

export const BackendProductQuestionnaire: React.FC<BackendProductQuestionnaireProps> = ({
    isOpen,
    onClose,
    onComplete
}) => {
    const [state, setState] = useState<QuestionnaireState>('starting');
    const [productDescription, setProductDescription] = useState('');
    const [session, setSession] = useState<ClassificationSession | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<QuestionResponse | null>(null);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [qaHistory, setQaHistory] = useState<Array<{ question: string; answer: string }>>([]);
    const [currentCandidates, setCurrentCandidates] = useState<HSCandidate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [finalProduct, setFinalProduct] = useState<Product | null>(null);
    const [agentVerificationSession, setAgentVerificationSession] = useState<string | null>(null);
    const [agentStatus, setAgentStatus] = useState<'idle' | 'starting' | 'active' | 'completed' | 'failed'>('idle');
    const [transcriptData, setTranscriptData] = useState<any>(null);
    const [showTranscript, setShowTranscript] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState<any[]>([]);

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setState('starting');
            setProductDescription('');
            setSession(null);
            setCurrentQuestion(null);
            setCurrentAnswer('');
            setQaHistory([]);
            setCurrentCandidates([]);
            setError(null);
            setFinalProduct(null);
            setAgentVerificationSession(null);
            setAgentStatus('idle');
        }
    }, [isOpen]);

    const startClassification = async () => {
        if (!productDescription.trim()) {
            setError('Please enter a product description');
            return;
        }

        setState('questioning');
        setError(null);

        try {
            // Start classification session
            const newSession = await backendApi.startClassification(productDescription.trim());
            setSession(newSession);

            // Get first question
            const question = await backendApi.getNextQuestion(newSession.session_id);
            setCurrentQuestion(question);
        } catch (err) {
            console.error('Failed to start classification:', err);
            setError(`Failed to start classification: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setState('error');
        }
    };

    const submitAnswer = async () => {
        if (!session || !currentQuestion || !currentAnswer.trim()) {
            setError('Please provide an answer');
            return;
        }

        setState('analyzing');
        setError(null);

        try {
            // Submit answer
            const response = await backendApi.submitAnswer(
                session.session_id,
                currentQuestion.question,
                currentAnswer.trim()
            );

            // Update QA history
            const newQA = { question: currentQuestion.question, answer: currentAnswer.trim() };
            setQaHistory(prev => [...prev, newQA]);

            // Update current candidates
            setCurrentCandidates(response.candidates || []);

            // Clear current answer
            setCurrentAnswer('');

            // Check if converged (no more conclusions allowed)
            if (response.converged) {
                // Finalize classification
                await finalizeClassification();
            } else {
                // Get next question
                const nextQuestion = await backendApi.getNextQuestion(session.session_id);
                setCurrentQuestion(nextQuestion);
                setState('questioning');
            }
        } catch (err) {
            console.error('Failed to submit answer:', err);
            setError(`Failed to submit answer: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setState('error');
        }
    };

    const finalizeClassification = async () => {
        if (!session) return;

        setState('analyzing');

        try {
            const result = await backendApi.finalizeClassification(session.session_id);
            const product = convertToFrontendProduct(result.product);
            setFinalProduct(product);
            setState('completed');
        } catch (err) {
            console.error('Failed to finalize classification:', err);
            setError(`Failed to finalize classification: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setState('error');
        }
    };

    const handleComplete = () => {
        if (finalProduct) {
            onComplete(finalProduct);
            onClose();
        }
    };

    const startAgentVerification = async () => {
        if (!finalProduct) return;

        setAgentStatus('starting');
        setError(null);

        try {
            const response = await backendApi.startAgentVerification(finalProduct);
            setAgentVerificationSession(response.session_id);
            setAgentStatus('active');
            setLiveTranscript([]); // Reset live transcript
            
            // Poll for status updates AND real-time transcript
            const pollInterval = setInterval(async () => {
                try {
                    const status = await backendApi.getAgentStatus(response.session_id);
                    setAgentStatus(status.status as any);
                    
                    // Also fetch transcript updates in real-time
                    try {
                        const transcript = await backendApi.getAgentTranscript(response.session_id);
                        setLiveTranscript(transcript.entries || []);
                    } catch (transcriptErr) {
                        // Transcript might not be available yet, continue polling
                        console.log('Transcript not yet available:', transcriptErr);
                    }
                    
                    if (status.status === 'completed' || status.status === 'failed') {
                        clearInterval(pollInterval);
                        // Final transcript fetch
                        try {
                            const finalTranscript = await backendApi.getAgentTranscript(response.session_id);
                            setLiveTranscript(finalTranscript.entries || []);
                        } catch (finalErr) {
                            console.error('Failed to fetch final transcript:', finalErr);
                        }
                    }
                } catch (err) {
                    console.error('Failed to get agent status:', err);
                    clearInterval(pollInterval);
                    setAgentStatus('failed');
                }
            }, 2000); // Poll every 2 seconds for more responsive updates

        } catch (err) {
            console.error('Failed to start agent verification:', err);
            setError(`Failed to start agent verification: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setAgentStatus('failed');
        }
    };

    const fetchTranscript = async () => {
        if (!agentVerificationSession) return;

        try {
            const transcript = await backendApi.getAgentTranscript(agentVerificationSession);
            setTranscriptData(transcript);
            setShowTranscript(true);
        } catch (err) {
            console.error('Failed to fetch transcript:', err);
            setError(`Failed to fetch transcript: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const handleClose = () => {
        // Clean up session if needed
        if (session && state !== 'completed') {
            backendApi.deleteSession(session.session_id).catch(console.warn);
        }
        // Clean up agent session if needed
        if (agentVerificationSession && agentStatus !== 'completed') {
            backendApi.deleteAgentSession(agentVerificationSession).catch(console.warn);
        }
        onClose();
    };

    const renderStartScreen = () => (
        <>
            <H3 style={{ marginBottom: '20px' }}>Describe Your Product</H3>
            <Text style={{ marginBottom: '16px', color: '#8A9BA8' }}>
                Enter a detailed description of the product you want to classify. 
                Our AI will ask follow-up questions to determine the correct HS code.
            </Text>
            
            <TextArea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="e.g., Wireless Bluetooth headphones with active noise cancellation, made in China..."
                rows={4}
                fill
                style={{ marginBottom: '20px' }}
            />

            <Callout intent="primary" icon={IconNames.INFO_SIGN}>
                <Text style={{ fontSize: '13px' }}>
                    <strong>Tip:</strong> Include details like materials, function, origin, and intended use. 
                    The more specific you are, the more accurate the classification will be.
                </Text>
            </Callout>
        </>
    );

    const renderQuestionScreen = () => (
        <>
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Text>Question {qaHistory.length + 1}</Text>
                    <Text>Session: {session?.session_id.slice(0, 8)}...</Text>
                </div>
                <ProgressBar
                    value={(qaHistory.length + 1) / 10} // Assuming max 10 questions
                    intent="primary"
                />
            </div>

            {currentQuestion && (
                <>
                    <H3 style={{ marginBottom: '16px' }}>{currentQuestion.question}</H3>
                    
                    {/* Render radio buttons for multiple choice questions */}
                    {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options ? (
                        <RadioGroup
                            onChange={(e) => setCurrentAnswer((e.target as HTMLInputElement).value)}
                            selectedValue={currentAnswer}
                            style={{ marginBottom: '16px' }}
                        >
                            {currentQuestion.options.map((option, index) => (
                                <Radio
                                    key={index}
                                    label={option}
                                    value={option}
                                    style={{
                                        marginBottom: '8px',
                                        color: '#ffffff'
                                    }}
                                />
                            ))}
                        </RadioGroup>
                    ) : (
                        /* Default text area for regular questions */
                        <TextArea
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            placeholder="Enter your answer..."
                            rows={3}
                            fill
                            style={{ marginBottom: '16px' }}
                        />
                    )}

                    {/* Removed conclusion callout since we no longer allow conclusions */}

                    {currentQuestion.question_type === 'multiple_choice' && (
                        <Callout intent="primary" icon={IconNames.SELECTION} style={{ marginBottom: '16px' }}>
                            <Text style={{ fontSize: '13px' }}>
                                <strong>Multiple Choice:</strong> Please select the option that best describes your product.
                            </Text>
                        </Callout>
                    )}
                </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                {qaHistory.length > 0 && (
                    <div>
                        <Text style={{ fontWeight: 'bold', marginBottom: '12px' }}>Previous Q&A:</Text>
                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {qaHistory.map((qa, index) => (
                                <div key={index} style={{
                                    marginBottom: '8px',
                                    padding: '8px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}>
                                    <Text style={{ fontWeight: 'bold' }}>Q: {qa.question}</Text>
                                    <Text style={{ color: '#B8C5D1' }}>A: {qa.answer}</Text>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {currentCandidates.length > 0 && (
                    <div>
                        <Text style={{ fontWeight: 'bold', marginBottom: '12px' }}>
                            Top HS Code Matches ({currentCandidates.length}):
                        </Text>
                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {currentCandidates.slice(0, 5).map((candidate, index) => (
                                <div key={index} style={{
                                    marginBottom: '8px',
                                    padding: '8px',
                                    background: index === 0 ? 'rgba(61, 204, 145, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                    border: index === 0 ? '1px solid rgba(61, 204, 145, 0.3)' : 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <Text style={{ fontWeight: 'bold', color: index === 0 ? '#3DCC91' : '#ffffff' }}>
                                            #{index + 1}: {candidate.code}
                                        </Text>
                                        <Text style={{
                                            fontSize: '10px',
                                            color: index === 0 ? '#3DCC91' : '#FFB366',
                                            fontWeight: 'bold'
                                        }}>
                                            {Math.round(candidate.similarity_score * 100)}%
                                        </Text>
                                    </div>
                                    <Text style={{
                                        color: '#B8C5D1',
                                        fontSize: '11px',
                                        lineHeight: '1.3',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}>
                                        {candidate.description}
                                    </Text>
                                </div>
                            ))}
                        </div>
                        {currentCandidates.length > 5 && (
                            <Text style={{ fontSize: '10px', color: '#8A9BA8', textAlign: 'center', marginTop: '8px' }}>
                                ...and {currentCandidates.length - 5} more matches
                            </Text>
                        )}
                    </div>
                )}
            </div>
        </>
    );

    const renderAnalyzingScreen = () => (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Spinner size={40} />
            <H3 style={{ marginTop: '20px', marginBottom: '12px' }}>Processing...</H3>
            <Text style={{ color: '#8A9BA8' }}>
                {state === 'analyzing' ? 
                    'AI is analyzing your responses and finding the best HS code match...' :
                    'Starting classification session...'
                }
            </Text>
        </div>
    );

    const renderCompletedScreen = () => (
        finalProduct ? (
            <div>
                <Callout intent="success" icon={IconNames.TICK} style={{ marginBottom: '20px' }}>
                    <H3 style={{ margin: '0 0 12px 0' }}>Classification Complete!</H3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <Tag intent="primary" large style={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {finalProduct.hsCode}
                        </Tag>
                        <Text style={{ color: '#3DCC91', fontWeight: 'bold' }}>
                            {finalProduct.confidence}% Confidence
                        </Text>
                    </div>
                    <Text>
                        <strong>Reasoning:</strong> {finalProduct.reasoning}
                    </Text>
                </Callout>

                <Divider style={{ margin: '20px 0' }} />

                <H3 style={{ marginBottom: '16px' }}>Product Summary</H3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <Text style={{ fontWeight: 'bold', marginBottom: '4px' }}>Description:</Text>
                        <Text>{finalProduct.description}</Text>
                    </div>
                    <div>
                        <Text style={{ fontWeight: 'bold', marginBottom: '4px' }}>Category:</Text>
                        <Text>{finalProduct.category}</Text>
                    </div>
                    <div>
                        <Text style={{ fontWeight: 'bold', marginBottom: '4px' }}>Status:</Text>
                        <Tag intent={finalProduct.status === 'classified' ? 'success' : 'warning'}>
                            {finalProduct.status}
                        </Tag>
                    </div>
                    <div>
                        <Text style={{ fontWeight: 'bold', marginBottom: '4px' }}>Questions Asked:</Text>
                        <Text>{qaHistory.length}</Text>
                    </div>
                </div>

                {finalProduct.alternativeHSCodes && finalProduct.alternativeHSCodes.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <H3 style={{ marginBottom: '12px' }}>Alternative Classifications</H3>
                        {finalProduct.alternativeHSCodes.slice(0, 3).map((alt, index) => (
                            <div key={index} style={{
                                marginBottom: '8px',
                                padding: '8px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Tag minimal>{alt.code}</Tag>
                                    <Text style={{ fontSize: '12px' }}>{alt.confidence}%</Text>
                                </div>
                                <Text style={{ fontSize: '11px', color: '#B8C5D1', marginTop: '4px' }}>
                                    {alt.reasoning}
                                </Text>
                            </div>
                        ))}
                    </div>
                )}

                <Divider style={{ margin: '20px 0' }} />

                {/* Agent Verification Section */}
                <div style={{ marginTop: '20px' }}>
                    <H3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Customs Agent Verification</span>
                        {agentStatus !== 'idle' && (
                            <Tag
                                intent={
                                    agentStatus === 'completed' ? 'success' :
                                    agentStatus === 'failed' ? 'danger' :
                                    'warning'
                                }
                                minimal
                            >
                                {agentStatus}
                            </Tag>
                        )}
                    </H3>
                    
                    {agentStatus === 'idle' && (
                        <Callout intent="none" icon={IconNames.PHONE}>
                            <Text style={{ marginBottom: '12px' }}>
                                Get official verification from customs authorities. Our AI agent will call the customs office
                                to verify this classification with a real customs officer.
                            </Text>
                            <Button
                                text="Verify with Customs Agent"
                                intent="primary"
                                icon={IconNames.PHONE}
                                onClick={startAgentVerification}
                                style={{ marginTop: '8px' }}
                            />
                        </Callout>
                    )}
                    
                    {agentStatus === 'starting' && (
                        <Callout intent="primary" icon={IconNames.TIME}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Spinner size={16} />
                                <Text>Starting agent verification process...</Text>
                            </div>
                        </Callout>
                    )}
                    
                    {agentStatus === 'active' && (
                        <div>
                            <Callout intent="warning" icon={IconNames.PHONE} style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Spinner size={16} />
                                    <Text>🎙️ Agent is calling customs office. Live transcript below...</Text>
                                </div>
                            </Callout>
                            
                            {/* Live Transcript Display */}
                            <div style={{
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                padding: '16px',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                <H3 style={{
                                    margin: '0 0 12px 0',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    📞 Live Call Transcript
                                    <Spinner size={12} />
                                </H3>
                                
                                {liveTranscript.length === 0 ? (
                                    <Text style={{ color: '#8A9BA8', fontStyle: 'italic' }}>
                                        Connecting to customs office...
                                    </Text>
                                ) : (
                                    <div>
                                        {liveTranscript.map((entry: any, index: number) => (
                                            <div key={index} style={{
                                                marginBottom: '8px',
                                                padding: '8px',
                                                background: entry.text.startsWith('Agent:') ? 'rgba(61, 204, 145, 0.1)' : 'rgba(92, 112, 128, 0.1)',
                                                borderLeft: `3px solid ${entry.text.startsWith('Agent:') ? '#3DCC91' : '#5C7080'}`,
                                                borderRadius: '4px',
                                                animation: index === liveTranscript.length - 1 ? 'fadeIn 0.5s ease-in' : 'none'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <Text style={{
                                                        fontWeight: 'bold',
                                                        color: entry.text.startsWith('Agent:') ? '#3DCC91' : '#ffffff',
                                                        fontSize: '11px'
                                                    }}>
                                                        {entry.text.startsWith('Agent:') ? '🤖 AI Agent' : '👤 Customs Officer'}
                                                    </Text>
                                                    <Text style={{ fontSize: '9px', color: '#8A9BA8' }}>
                                                        {new Date(entry.timestamp).toLocaleTimeString()}
                                                    </Text>
                                                </div>
                                                <Text style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                                    {entry.text.replace(/^(Agent|User|Officer):\s*/, '')}
                                                </Text>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {agentStatus === 'completed' && (
                        <Callout intent="success" icon={IconNames.TICK_CIRCLE}>
                            <Text style={{ marginBottom: '12px' }}>
                                <strong>Verification Complete!</strong> The customs agent has successfully verified
                                this classification with the customs office.
                            </Text>
                            <Button
                                text="View Call Transcript"
                                intent="primary"
                                icon={IconNames.DOCUMENT}
                                onClick={fetchTranscript}
                                style={{ marginRight: '8px' }}
                            />
                        </Callout>
                    )}
                    
                    {agentStatus === 'failed' && (
                        <Callout intent="danger" icon={IconNames.ERROR}>
                            <Text>
                                Agent verification failed. This could be due to network issues or customs office
                                availability. You can try again or proceed with the AI classification.
                            </Text>
                            <Button
                                text="Retry Verification"
                                intent="warning"
                                icon={IconNames.REFRESH}
                                onClick={startAgentVerification}
                                style={{ marginTop: '8px' }}
                            />
                        </Callout>
                    )}
                </div>
            </div>
        ) : null
    );

    const renderErrorScreen = () => (
        <Callout intent="danger" icon={IconNames.ERROR} style={{ textAlign: 'center' }}>
            <H3 style={{ margin: '0 0 12px 0' }}>Error</H3>
            <Text>{error}</Text>
        </Callout>
    );

    if (!isOpen) return null;

    return (
        <>
            <Dialog
                isOpen={isOpen}
                onClose={handleClose}
                title="AI-Powered HS Code Classification"
                style={{
                    width: state === 'completed' ? '1500px' : '700px', // Increased to 1500px
                    maxWidth: '95vw', // Ensure it doesn't exceed viewport
                    maxHeight: state === 'completed' ? '95vh' : '80vh', // Increased max height
                    height: state === 'completed' ? 'auto' : undefined
                }}
                className={Classes.DARK}
                canEscapeKeyClose={state !== 'analyzing'}
                canOutsideClickClose={state !== 'analyzing'}
            >
                <div className={Classes.DIALOG_BODY} style={{
                    minHeight: '300px',
                    maxHeight: state === 'completed' ? 'calc(95vh - 120px)' : 'calc(80vh - 120px)', // Account for header/footer
                    overflowY: 'auto' // Enable scrolling within dialog body
                }}>
                    {state === 'starting' && renderStartScreen()}
                    {state === 'questioning' && renderQuestionScreen()}
                    {state === 'analyzing' && renderAnalyzingScreen()}
                    {state === 'completed' && renderCompletedScreen()}
                    {state === 'error' && renderErrorScreen()}
                </div>

                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        {state === 'starting' && (
                            <>
                                <Button
                                    text="Start Classification"
                                    intent="primary"
                                    onClick={startClassification}
                                    disabled={!productDescription.trim()}
                                />
                                <Button text="Cancel" onClick={handleClose} />
                            </>
                        )}
                        
                        {state === 'questioning' && (
                            <>
                                <Button
                                    text="Submit Answer"
                                    intent="primary"
                                    onClick={submitAnswer}
                                    disabled={!currentAnswer.trim()}
                                />
                                <Button text="Cancel" onClick={handleClose} />
                            </>
                        )}

                        {state === 'completed' && (
                            <>
                                <Button text="Add Product" intent="primary" onClick={handleComplete} />
                                <Button text="Start Over" onClick={() => setState('starting')} />
                            </>
                        )}

                        {state === 'error' && (
                            <>
                                <Button text="Try Again" intent="primary" onClick={() => setState('starting')} />
                                <Button text="Cancel" onClick={handleClose} />
                            </>
                        )}

                        {state === 'analyzing' && (
                            <Button text="Processing..." disabled loading />
                        )}
                    </div>
                </div>
            </Dialog>

            {/* Transcript Modal */}
            <Dialog
            isOpen={showTranscript}
            onClose={() => setShowTranscript(false)}
            title="Agent Call Transcript"
            style={{ width: '800px', maxHeight: '80vh' }}
            className={Classes.DARK}
        >
            <div className={Classes.DIALOG_BODY}>
                {transcriptData ? (
                    <div>
                        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>
                            <Text style={{ fontSize: '12px', color: '#8A9BA8' }}>
                                Session: {transcriptData.session_id}<br/>
                                File: {transcriptData.transcript_file}<br/>
                                Entries: {transcriptData.entry_count}<br/>
                                Created: {new Date(transcriptData.created_at).toLocaleString()}
                            </Text>
                        </div>
                        
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {transcriptData.entries.map((entry: any, index: number) => (
                                <div key={index} style={{
                                    marginBottom: '8px',
                                    padding: '12px',
                                    background: entry.text.startsWith('Agent:') ? 'rgba(61, 204, 145, 0.1)' : 'rgba(92, 112, 128, 0.1)',
                                    borderLeft: `4px solid ${entry.text.startsWith('Agent:') ? '#3DCC91' : '#5C7080'}`,
                                    borderRadius: '4px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <Text style={{
                                            fontWeight: 'bold',
                                            color: entry.text.startsWith('Agent:') ? '#3DCC91' : '#ffffff',
                                            fontSize: '12px'
                                        }}>
                                            {entry.text.startsWith('Agent:') ? '🤖 AI Agent' : '👤 Customs Officer'}
                                        </Text>
                                        <Text style={{ fontSize: '10px', color: '#8A9BA8' }}>
                                            {new Date(entry.timestamp).toLocaleTimeString()}
                                        </Text>
                                    </div>
                                    <Text style={{ fontSize: '14px', lineHeight: '1.4' }}>
                                        {entry.text.replace(/^(Agent|User|Officer):\s*/, '')}
                                    </Text>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spinner size={30} />
                        <Text style={{ marginTop: '16px', color: '#8A9BA8' }}>
                            Loading transcript...
                        </Text>
                    </div>
                )}
            </div>
            
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button text="Close" onClick={() => setShowTranscript(false)} />
                </div>
            </div>
        </Dialog>
        </>
    );
};