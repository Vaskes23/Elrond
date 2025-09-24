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
    // Base questions
    productType: string;
    materials: string | string[];
    function: string;
    targetAudience: string;
    origin: string;

    // Claude-generated questions
    technicalSpecs: string;
    regulatoryRequirements: string;

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
const CLAUDE_API_BASE_URL = process.env.REACT_APP_CLAUDE_API_URL || 'https://api.anthropic.com/v1';
const CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;

// Question generation prompt template
const QUESTION_GENERATION_PROMPT = `
You are an expert in HS code classification. Based on the following product information, generate 2 additional questions that would help determine the most accurate HS code classification.

Product Information:
- Type: {productType}
- Materials: {materials}
- Function: {function}
- Target Audience: {targetAudience}
- Origin: {origin}

Generate 2 specific questions that would help clarify:
1. Technical specifications or features important for classification
2. Regulatory requirements or certifications that apply

Return the questions in JSON format with this structure:
{
  "questions": [
    {
      "id": "claude_question_1",
      "text": "Question text here",
      "type": "text",
      "required": true,
      "category": "claude_generated"
    },
    {
      "id": "claude_question_2", 
      "text": "Question text here",
      "type": "single",
      "options": ["Option 1", "Option 2", "Option 3"],
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
- Materials: {materials}
- Function: {function}
- Target Audience: {targetAudience}
- Origin: {origin}
- Technical Specifications: {technicalSpecs}
- Regulatory Requirements: {regulatoryRequirements}

Provide your analysis in JSON format with this structure:
{
  "code": "XXXX.XX.XX",
  "description": "Detailed description of the classification",
  "confidence": 0.95,
  "reasoning": "Detailed explanation of why this classification is correct",
  "category": "Product Category",
  "alternativeCodes": [
    {
      "code": "XXXX.XX.XX",
      "description": "Alternative classification",
      "confidence": 0.85,
      "reasoning": "Why this is an alternative"
    }
  ]
}
`;

export const generateQuestionsWithClaude = async (
    request: ClaudeQuestionGenerationRequest
): Promise<ClaudeQuestionGenerationResponse> => {
    if (!CLAUDE_API_KEY) {
        throw new Error('Claude API key not configured');
    }

    const prompt = QUESTION_GENERATION_PROMPT
        .replace('{productType}', request.productType)
        .replace('{materials}', Array.isArray(request.materials) ? request.materials.join(', ') : request.materials)
        .replace('{function}', request.function)
        .replace('{targetAudience}', request.targetAudience)
        .replace('{origin}', request.origin);

    try {
        const response = await fetch(`${CLAUDE_API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
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
    if (!CLAUDE_API_KEY) {
        throw new Error('Claude API key not configured');
    }

    const prompt = ANALYSIS_PROMPT
        .replace('{productType}', request.productType)
        .replace('{materials}', Array.isArray(request.materials) ? request.materials.join(', ') : request.materials)
        .replace('{function}', request.function)
        .replace('{targetAudience}', request.targetAudience)
        .replace('{origin}', request.origin)
        .replace('{technicalSpecs}', request.technicalSpecs)
        .replace('{regulatoryRequirements}', request.regulatoryRequirements);

    try {
        const response = await fetch(`${CLAUDE_API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
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

    return {
        questions: [
            {
                id: 'claude_question_1',
                text: `Based on your ${request.productType} product, what specific technical specifications or features are most important for classification?`,
                type: 'text',
                required: true,
                category: 'claude_generated'
            },
            {
                id: 'claude_question_2',
                text: `For this ${request.function} product, are there any special regulatory requirements or certifications that apply?`,
                type: 'single',
                options: [
                    'FDA Approval Required',
                    'CE Marking Required',
                    'FCC Certification',
                    'ISO Standards',
                    'Customs Bond Required',
                    'No Special Requirements',
                    'Other'
                ],
                required: true,
                category: 'claude_generated'
            }
        ]
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
        reasoning: `Based on the analysis: Product type "${request.productType}" with materials "${Array.isArray(request.materials) ? request.materials.join(', ') : request.materials}" and function "${request.function}". Technical specs: "${request.technicalSpecs}". Regulatory requirements: "${request.regulatoryRequirements}". This classification is most appropriate because...`,
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
