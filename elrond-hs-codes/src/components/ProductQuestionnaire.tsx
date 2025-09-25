import React, { useState, useEffect } from 'react';
import {
    Dialog,
    Button,
    Classes,
    FormGroup,
    RadioGroup,
    Radio,
    Checkbox,
    TextArea,
    ProgressBar,
    Callout,
    H3,
    Text,
    Divider,
    Tag
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Question, HSCodeSuggestion, Product } from '../types';
import {
    generateQuestionsWithClaude,
    analyzeWithClaude,
    generateQuestionsFallback,
    analyzeFallback,
    ClaudeQuestionGenerationRequest,
    ClaudeAnalysisRequest
} from '../utils/claudeApi';

interface ProductQuestionnaireProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (product: Product) => void;
}

const BASE_QUESTIONS: Question[] = [
    {
        id: 'product_type',
        text: 'What type of product is this?',
        type: 'single',
        options: [
            'Electronics & Technology',
            'Textiles & Apparel',
            'Food & Beverages',
            'Chemicals & Pharmaceuticals',
            'Machinery & Equipment',
            'Furniture & Home Goods',
            'Automotive Parts',
            'Cosmetics & Personal Care',
            'Sports & Recreation',
            'Other'
        ],
        required: true,
        category: 'classification'
    },
    {
        id: 'function_purpose',
        text: 'What is the primary function or purpose of this product?',
        type: 'text',
        required: true,
        category: 'classification'
    },
    {
        id: 'origin_country',
        text: 'What is the country of origin?',
        type: 'text',
        required: true,
        category: 'origin'
    }
];

const HS_CODE_DATABASE: Record<string, HSCodeSuggestion[]> = {
    'Electronics & Technology': [
        { code: '8517.12.00', description: 'Telephone sets, including telephones for cellular networks', confidence: 0.9, reasoning: 'Based on electronic communication device classification', category: 'Electronics' },
        { code: '8471.30.01', description: 'Portable automatic data processing machines', confidence: 0.95, reasoning: 'Laptop/tablet classification for portable computing devices', category: 'Electronics' },
        { code: '8528.72.00', description: 'Color television receivers', confidence: 0.85, reasoning: 'TV display device classification', category: 'Electronics' }
    ],
    'Textiles & Apparel': [
        { code: '6203.42.40', description: 'Men\'s or boys\' trousers, bib and brace overalls', confidence: 0.9, reasoning: 'Men\'s clothing classification', category: 'Apparel' },
        { code: '6109.10.00', description: 'T-shirts, singlets and other vests, of cotton', confidence: 0.95, reasoning: 'Basic cotton clothing classification', category: 'Apparel' },
        { code: '6402.99.18', description: 'Footwear with outer soles of rubber or plastics', confidence: 0.85, reasoning: 'Shoe classification based on sole material', category: 'Apparel' }
    ],
    'Food & Beverages': [
        { code: '2203.00.00', description: 'Beer made from malt', confidence: 0.95, reasoning: 'Alcoholic beverage classification', category: 'Food & Beverages' },
        { code: '0401.10.00', description: 'Milk and cream, not concentrated nor containing added sugar', confidence: 0.9, reasoning: 'Dairy product classification', category: 'Food & Beverages' },
        { code: '0901.21.00', description: 'Coffee, not roasted, not decaffeinated', confidence: 0.85, reasoning: 'Raw coffee bean classification', category: 'Food & Beverages' }
    ],
    'Chemicals & Pharmaceuticals': [
        { code: '3004.90.00', description: 'Medicaments consisting of mixed or unmixed products', confidence: 0.9, reasoning: 'Pharmaceutical product classification', category: 'Chemicals' },
        { code: '3401.11.00', description: 'Soap in bars, cakes or pieces', confidence: 0.85, reasoning: 'Personal care soap classification', category: 'Chemicals' },
        { code: '3304.99.00', description: 'Other beauty or make-up preparations', confidence: 0.8, reasoning: 'Cosmetic product classification', category: 'Chemicals' }
    ],
    'Machinery & Equipment': [
        { code: '8421.12.00', description: 'Centrifuges, including centrifugal dryers', confidence: 0.9, reasoning: 'Industrial machinery classification', category: 'Machinery' },
        { code: '8479.89.00', description: 'Machines and mechanical appliances', confidence: 0.8, reasoning: 'General machinery classification', category: 'Machinery' }
    ],
    'Furniture & Home Goods': [
        { code: '9401.30.00', description: 'Seats of cane, osier, bamboo or similar materials', confidence: 0.85, reasoning: 'Furniture classification based on material', category: 'Furniture' },
        { code: '9403.20.00', description: 'Other wooden furniture', confidence: 0.9, reasoning: 'Wooden furniture classification', category: 'Furniture' }
    ]
};

export const ProductQuestionnaire: React.FC<ProductQuestionnaireProps> = ({
    isOpen,
    onClose,
    onComplete
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [suggestedHSCode, setSuggestedHSCode] = useState<HSCodeSuggestion | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [questions, setQuestions] = useState<Question[]>(BASE_QUESTIONS);
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

    const currentQuestion = questions[currentStep];
    const progress = ((currentStep + 1) / questions.length) * 100;

    // Reset when dialog opens
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            setAnswers({});
            setSuggestedHSCode(null);
            setIsAnalyzing(false);
        }
    }, [isOpen]);

    const handleAnswerChange = (questionId: string, answer: any) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const generateClaudeQuestions = async (currentAnswers: Record<string, any>) => {
        setIsGeneratingQuestions(true);

        try {
            // Prepare context for Claude
            const context: ClaudeQuestionGenerationRequest = {
                productType: currentAnswers.product_type,
                materials: 'Not specified', // Will be asked in Claude questions
                function: currentAnswers.function_purpose,
                targetAudience: 'Not specified', // Will be asked in Claude questions
                origin: currentAnswers.origin_country
            };

            // Try Claude API first, fallback to simulation if not available
            let claudeResponse;
            try {
                claudeResponse = await generateQuestionsWithClaude(context);
            } catch (apiError) {
                console.warn('Claude API not available, using fallback:', apiError);
                claudeResponse = await generateQuestionsFallback(context);
            }

            // Add the generated questions to the existing questions
            const newQuestions = [...BASE_QUESTIONS, ...claudeResponse.questions];
            setQuestions(newQuestions);

        } catch (error) {
            console.error('Error generating questions with Claude:', error);
            // Fallback to base questions if everything fails
            setQuestions(BASE_QUESTIONS);
        } finally {
            setIsGeneratingQuestions(false);
        }
    };


    const handleNext = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else if (currentStep === BASE_QUESTIONS.length - 1) {
            // After base questions, generate Claude questions
            generateClaudeQuestions(answers);
            setCurrentStep(prev => prev + 1);
        } else {
            analyzeAnswers();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const analyzeAnswers = async () => {
        setIsAnalyzing(true);

        try {
            // Prepare comprehensive context for Claude
            const context: ClaudeAnalysisRequest = prepareContextForClaude(answers);

            // Try Claude API first, fallback to simulation if not available
            let claudeAnalysis;
            try {
                claudeAnalysis = await analyzeWithClaude(context);
            } catch (apiError) {
                console.warn('Claude API not available, using fallback:', apiError);
                claudeAnalysis = await analyzeFallback(context);
            }

            setSuggestedHSCode(claudeAnalysis);

        } catch (error) {
            console.error('Error analyzing with Claude:', error);
            // Fallback to basic analysis
            const productType = answers.product_type;
            const suggestions = HS_CODE_DATABASE[productType] || [];

            if (suggestions.length > 0) {
                const bestMatch = suggestions[0];
                setSuggestedHSCode(bestMatch);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const prepareContextForClaude = (answers: Record<string, any>) => {
        return {
            // Base questions (3)
            productType: answers.product_type,
            function: answers.function_purpose,
            origin: answers.origin_country,

            // Claude-generated questions (2)
            materials: answers.claude_question_1 || 'Not specified',
            targetAudience: answers.claude_question_2 || 'Not specified',

            // Additional context
            timestamp: new Date().toISOString(),
            questionnaireVersion: '1.0'
        };
    };


    const handleComplete = () => {
        const product: Product = {
            id: `prod_${Date.now()}`,
            identification: answers.brand_name || answers.model_number || 'New Product',
            dateAdded: new Date(),
            hsCode: suggestedHSCode?.code || 'TBD',
            description: answers.function_purpose || 'Product description',
            reasoning: suggestedHSCode?.reasoning || 'Classification pending',
            category: suggestedHSCode?.category,
            origin: answers.origin_country,
            status: suggestedHSCode?.confidence && suggestedHSCode.confidence > 85 ? 'classified' : 
                   suggestedHSCode?.confidence && suggestedHSCode.confidence > 60 ? 'pending' : 'needs_review',
            confidence: suggestedHSCode?.confidence || 50
        };

        onComplete(product);
        onClose();
    };

    const handleClose = () => {
        onClose();
    };

    const renderQuestion = () => {
        if (!currentQuestion) return null;

        const currentAnswer = answers[currentQuestion.id];

        switch (currentQuestion.type) {
            case 'single':
                return (
                    <RadioGroup
                        selectedValue={currentAnswer}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.currentTarget.value)}
                    >
                        {currentQuestion.options?.map(option => (
                            <Radio key={option} label={option} value={option} />
                        ))}
                    </RadioGroup>
                );

            case 'multiple':
                return (
                    <div>
                        {currentQuestion.options?.map(option => (
                            <Checkbox
                                key={option}
                                label={option}
                                checked={currentAnswer?.includes(option) || false}
                                onChange={(e) => {
                                    const currentValues = currentAnswer || [];
                                    const newValues = e.currentTarget.checked
                                        ? [...currentValues, option]
                                        : currentValues.filter((v: string) => v !== option);
                                    handleAnswerChange(currentQuestion.id, newValues);
                                }}
                            />
                        ))}
                    </div>
                );

            case 'text':
                return (
                    <TextArea
                        value={currentAnswer || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder="Enter your answer..."
                        rows={3}
                        fill
                    />
                );

            default:
                return null;
        }
    };

    const canProceed = () => {
        if (!currentQuestion) return false;
        if (!currentQuestion.required) return true;
        const currentAnswer = answers[currentQuestion.id];
        return currentAnswer && currentAnswer !== '';
    };

    const isGeneratingQuestionsStep = () => {
        return currentStep === BASE_QUESTIONS.length && isGeneratingQuestions;
    };

    if (!isOpen) return null;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Add New Product"
            style={{ width: '600px', maxHeight: '80vh' }}
            className={Classes.DARK}
            canEscapeKeyClose={true}
            canOutsideClickClose={true}
        >
            <div className={Classes.DIALOG_BODY}>
                {!suggestedHSCode ? (
                    <>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <Text>Step {currentStep + 1} of {questions.length}</Text>
                                <Text>{Math.round(progress)}% Complete</Text>
                            </div>
                            <ProgressBar value={progress / 100} intent="primary" />
                        </div>

                        {isGeneratingQuestionsStep() ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <span className="bp5-icon bp5-icon-refresh" style={{
                                        fontSize: '32px',
                                        color: '#48AFF0',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                </div>
                                <H3 style={{ marginBottom: '12px' }}>Generating Custom Questions</H3>
                                <Text style={{ color: '#8A9BA8', marginBottom: '16px' }}>
                                    Claude is analyzing your product details to generate personalized questions...
                                </Text>
                                <div style={{
                                    background: 'rgba(95, 107, 124, 0.1)',
                                    padding: '12px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid #1A252F'
                                }}>
                                    <Text style={{ fontSize: '12px', color: '#B8C5D1', marginBottom: '4px' }}>
                                        Product: {answers.product_type}
                                    </Text>
                                    <Text style={{ fontSize: '12px', color: '#B8C5D1', marginBottom: '4px' }}>
                                        Function: {answers.function_purpose}
                                    </Text>
                                    <Text style={{ fontSize: '12px', color: '#B8C5D1' }}>
                                        Origin: {answers.origin_country}
                                    </Text>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                                    <H3 style={{ margin: 0, flex: 1 }}>
                                        {currentQuestion?.text}
                                    </H3>
                                    {currentQuestion?.category === 'claude_generated' && (
                                        <Tag
                                            intent="primary"
                                            minimal
                                            style={{ marginLeft: '12px', fontSize: '10px' }}
                                        >
                                            AI Generated
                                        </Tag>
                                    )}
                                </div>

                                {currentQuestion?.required && (
                                    <Text style={{ color: '#D9822B', marginBottom: '16px', fontSize: '12px' }}>
                                        * This field is required
                                    </Text>
                                )}

                                <FormGroup>
                                    {renderQuestion()}
                                </FormGroup>
                            </>
                        )}
                    </>
                ) : (
                    <div>
                        <Callout intent="success" icon={IconNames.TICK} style={{ marginBottom: '20px' }}>
                            <H3 style={{ margin: '0 0 12px 0' }}>HS Code Suggestion</H3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <Tag intent="primary" large style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                    {suggestedHSCode.code}
                                </Tag>
                                <Text style={{ color: '#D9822B', fontWeight: 'bold' }}>
                                    {Math.round(suggestedHSCode.confidence * 100)}% Confidence
                                </Text>
                            </div>
                            <Text style={{ marginBottom: '8px' }}>
                                <strong>Description:</strong> {suggestedHSCode.description}
                            </Text>
                            <Text>
                                <strong>Reasoning:</strong> {suggestedHSCode.reasoning}
                            </Text>
                        </Callout>

                        <Divider style={{ margin: '20px 0' }} />

                        <H3 style={{ marginBottom: '16px' }}>Product Summary</H3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <Text style={{ fontWeight: 'bold', marginBottom: '4px' }}>Product Type:</Text>
                                <Text>{answers.product_type}</Text>
                            </div>
                            <div>
                                <Text style={{ fontWeight: 'bold', marginBottom: '4px' }}>Materials:</Text>
                                <Text>{Array.isArray(answers.material_composition) ? answers.material_composition.join(', ') : answers.material_composition}</Text>
                            </div>
                            <div>
                                <Text style={{ fontWeight: 'bold', marginBottom: '4px' }}>Function:</Text>
                                <Text>{answers.function_purpose}</Text>
                            </div>
                            <div>
                                <Text style={{ fontWeight: 'bold', marginBottom: '4px' }}>Origin:</Text>
                                <Text>{answers.origin_country}</Text>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    {suggestedHSCode ? (
                        <>
                            <Button text="Back to Edit" onClick={() => setSuggestedHSCode(null)} />
                            <Button text="Add Product" intent="primary" onClick={handleComplete} />
                        </>
                    ) : (
                        <>
                            <Button text="Previous" onClick={handlePrevious} disabled={currentStep === 0} />
                            <Button
                                text={currentStep === questions.length - 1 ? "Analyze" : "Next"}
                                intent="primary"
                                onClick={handleNext}
                                disabled={!canProceed() || isGeneratingQuestions}
                                loading={isAnalyzing || isGeneratingQuestions}
                            />
                        </>
                    )}
                    <Button text="Cancel" onClick={handleClose} />
                </div>
            </div>
        </Dialog>
    );
};