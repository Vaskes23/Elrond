// Claude API integration utilities
// This file contains functions to integrate with Claude API for question generation and analysis

export interface ClaudeQuestionGenerationRequest {
    productType: string;
    materials: string | string[];
    function: string;
    targetAudience: string;
    origin: string;
}

export interface ClaudeQuestionGenerationResponse {
    questions: Array<{
        id: string;
        text: string;
        type: 'single' | 'multiple' | 'text' | 'number';
        options?: string[];
        required: boolean;
        category: string;
    }>;
}

export interface ClaudeAnalysisRequest {
    // Base questions (3)
    productType: string;
    function: string;
    origin: string;

    // Claude-generated questions (2)
    materials: string | string[];
    targetAudience: string;

    // Additional context
    timestamp: string;
    questionnaireVersion: string;
}

export interface ClaudeAnalysisResponse {
    code: string;
    description: string;
    confidence: number;
    reasoning: string;
    category: string;
    alternativeCodes?: Array<{
        code: string;
        description: string;
        confidence: number;
        reasoning: string;
    }>;
}

// Claude API configuration
const CLAUDE_API_BASE_URL = 'https://api.anthropic.com/v1';

// Question generation prompt template
const QUESTION_GENERATION_PROMPT = `
You are an expert in HS code classification. Based on the following product information, generate 2 highly specific and contextual questions that would help determine the most accurate HS code classification.

Product Information:
- Type: {productType}
- Function: {function}
- Origin: {origin}

Generate 2 personalized questions that are specifically relevant to this product type and function. The questions should help narrow down the exact HS code classification. Consider:

1. For the first question: Ask about specific technical details, materials, or features that are crucial for classifying this particular type of product
2. For the second question: Ask about usage context, target market, or regulatory aspects specific to this product

Make the questions very specific to the product type and function provided. For example:
- If it's an electronic device, ask about technical specifications
- If it's clothing, ask about fabric composition and style
- If it's food, ask about processing method and packaging
- If it's machinery, ask about power source and application

Return the questions in JSON format with this structure:
{
  "questions": [
    {
      "id": "claude_question_1",
      "text": "Specific question tailored to this product type",
      "type": "text|single|multiple",
      "options": ["Option 1", "Option 2", "Option 3"] (only if type is single or multiple),
      "required": true,
      "category": "claude_generated"
    },
    {
      "id": "claude_question_2", 
      "text": "Another specific question tailored to this product type",
      "type": "text|single|multiple",
      "options": ["Option 1", "Option 2", "Option 3"] (only if type is single or multiple),
      "required": true,
      "category": "claude_generated"
    }
  ]
}
`;

// Analysis prompt template
const ANALYSIS_PROMPT = `
You are an expert in HS code classification. Analyze the following product information and provide the most accurate HS code classification.

Product Information:
- Type: {productType}
- Function: {function}
- Origin: {origin}
- Contextual Details: {materials}
- Usage Context: {targetAudience}

Based on this specific product type and function, along with the contextual details provided, determine the most accurate HS code classification. Consider:

1. The specific product type and its typical classification patterns
2. The function/purpose and how it affects classification
3. The contextual details (materials, technical specs, etc.) and their impact on classification
4. The usage context and target audience and how they influence the HS code
5. The country of origin and any relevant trade considerations

Provide your analysis in JSON format with this structure:
{
  "code": "XXXX.XX.XX",
  "description": "Detailed description of the classification",
  "confidence": 0.95,
  "reasoning": "Detailed explanation of why this classification is correct, referencing the specific product type, function, and contextual details provided",
  "category": "Product Category",
  "alternativeCodes": [
    {
      "code": "XXXX.XX.XX",
      "description": "Alternative classification",
      "confidence": 0.85,
      "reasoning": "Why this is an alternative and when it might apply"
    }
  ]
}
`;

export const generateQuestionsWithClaude = async (
    request: ClaudeQuestionGenerationRequest
): Promise<ClaudeQuestionGenerationResponse> => {
    // Check if API key is available (this would be set via environment variable in production)
    const apiKey = undefined; // In production: process.env.REACT_APP_CLAUDE_API_KEY
    if (!apiKey) {
        throw new Error('Claude API key not configured');
    }

    const prompt = QUESTION_GENERATION_PROMPT
        .replace('{productType}', request.productType)
        .replace('{function}', request.function)
        .replace('{origin}', request.origin);

    try {
        const response = await fetch(`${CLAUDE_API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.content[0].text;

        // Parse the JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format from Claude');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Error calling Claude API:', error);
        throw error;
    }
};

export const analyzeWithClaude = async (
    request: ClaudeAnalysisRequest
): Promise<ClaudeAnalysisResponse> => {
    // Check if API key is available (this would be set via environment variable in production)
    const apiKey = undefined; // In production: process.env.REACT_APP_CLAUDE_API_KEY
    if (!apiKey) {
        throw new Error('Claude API key not configured');
    }

    const prompt = ANALYSIS_PROMPT
        .replace('{productType}', request.productType)
        .replace('{function}', request.function)
        .replace('{origin}', request.origin)
        .replace('{materials}', Array.isArray(request.materials) ? request.materials.join(', ') : request.materials)
        .replace('{targetAudience}', request.targetAudience);

    try {
        const response = await fetch(`${CLAUDE_API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.content[0].text;

        // Parse the JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format from Claude');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Error calling Claude API:', error);
        throw error;
    }
};

// Fallback functions for when Claude API is not available
export const generateQuestionsFallback = async (
    request: ClaudeQuestionGenerationRequest
): Promise<ClaudeQuestionGenerationResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate contextual questions based on product type
    const productType = request.productType.toLowerCase();
    const function_desc = request.function.toLowerCase();

    let question1, question2;

    if (productType.includes('electronics') || productType.includes('technology')) {
        question1 = {
            id: 'claude_question_1',
            text: `What are the key technical specifications of this ${function_desc} device? (e.g., power consumption, connectivity, display type)`,
            type: 'text' as const,
            required: true,
            category: 'claude_generated'
        };
        question2 = {
            id: 'claude_question_2',
            text: 'What is the primary power source for this device?',
            type: 'single' as const,
            options: ['Battery Powered', 'Electric (Plug-in)', 'Solar Powered', 'Mechanical/Manual', 'Other'],
            required: true,
            category: 'claude_generated'
        };
    } else if (productType.includes('textiles') || productType.includes('apparel')) {
        question1 = {
            id: 'claude_question_1',
            text: `What is the primary fabric composition of this ${function_desc} item?`,
            type: 'multiple' as const,
            options: ['Cotton', 'Polyester', 'Wool', 'Silk', 'Leather', 'Denim', 'Synthetic', 'Blend', 'Other'],
            required: true,
            category: 'claude_generated'
        };
        question2 = {
            id: 'claude_question_2',
            text: 'What is the intended gender and age group for this clothing item?',
            type: 'single' as const,
            options: ['Men\'s Adult', 'Women\'s Adult', 'Children\'s (0-12)', 'Teen\'s (13-17)', 'Unisex', 'Other'],
            required: true,
            category: 'claude_generated'
        };
    } else if (productType.includes('food') || productType.includes('beverages')) {
        question1 = {
            id: 'claude_question_1',
            text: `How is this ${function_desc} product processed or prepared?`,
            type: 'single' as const,
            options: ['Fresh/Raw', 'Frozen', 'Canned', 'Dried', 'Fermented', 'Cooked/Processed', 'Other'],
            required: true,
            category: 'claude_generated'
        };
        question2 = {
            id: 'claude_question_2',
            text: 'What is the primary packaging type for this food product?',
            type: 'single' as const,
            options: ['Glass Container', 'Metal Can', 'Plastic Container', 'Cardboard Box', 'Flexible Packaging', 'Bulk', 'Other'],
            required: true,
            category: 'claude_generated'
        };
    } else if (productType.includes('machinery') || productType.includes('equipment')) {
        question1 = {
            id: 'claude_question_1',
            text: `What is the primary application or industry for this ${function_desc} machinery?`,
            type: 'single' as const,
            options: ['Manufacturing', 'Construction', 'Agriculture', 'Medical', 'Automotive', 'Food Processing', 'Textile', 'Other'],
            required: true,
            category: 'claude_generated'
        };
        question2 = {
            id: 'claude_question_2',
            text: 'What is the power source and capacity of this machinery?',
            type: 'text' as const,
            required: true,
            category: 'claude_generated'
        };
    } else {
        // Generic questions for other product types
        question1 = {
            id: 'claude_question_1',
            text: `What are the key materials and construction details of this ${function_desc} product?`,
            type: 'text' as const,
            required: true,
            category: 'claude_generated'
        };
        question2 = {
            id: 'claude_question_2',
            text: 'What is the primary use case or application for this product?',
            type: 'text' as const,
            required: true,
            category: 'claude_generated'
        };
    }

    return {
        questions: [question1, question2]
    };
};

export const analyzeFallback = async (
    request: ClaudeAnalysisRequest
): Promise<ClaudeAnalysisResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
        code: '8517.12.00',
        description: 'Telephone sets, including telephones for cellular networks',
        confidence: 0.95,
        reasoning: `Based on the analysis: Product type "${request.productType}" with materials "${Array.isArray(request.materials) ? request.materials.join(', ') : request.materials}" and function "${request.function}". Target audience: "${request.targetAudience}". Origin: "${request.origin}". This classification is most appropriate because...`,
        category: request.productType,
        alternativeCodes: [
            {
                code: '8517.12.00',
                description: 'Alternative classification',
                confidence: 0.85,
                reasoning: 'Alternative reasoning'
            }
        ]
    };
};
