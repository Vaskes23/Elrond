// Backend API integration for HS Code Classification
// This replaces the mock Claude API with real backend calls

export interface ClassificationSession {
    session_id: string;
    product_description: string;
    smart_query: string;
    candidates: HSCandidate[];
    candidate_count: number;
    status: string;
}

export interface HSCandidate {
    code: string;
    description: string;
    similarity_score: number;
}

export interface QuestionResponse {
    session_id: string;
    question_type: 'question' | 'conclusion' | 'multiple_choice';
    question: string;
    options?: string[];
    iteration: number;
    qa_history_count: number;
    candidate_count: number;
}

export interface AnswerResponse {
    session_id: string;
    smart_query: string;
    candidates: HSCandidate[];
    candidate_count: number;
    iteration: number;
    qa_history_count: number;
    converged: boolean;
    status: string;
}

export interface FinalClassification {
    session_id: string;
    product: {
        id: string;
        identification: string;
        dateAdded: string;
        hsCode: string;
        description: string;
        reasoning: string;
        category: string;
        origin: string;
        status: 'classified' | 'pending' | 'needs_review';
        confidence: number;
        qa_history: Array<{ question: string; answer: string }>;
        alternativeHSCodes: Array<{
            code: string;
            confidence: number;
            reasoning: string;
            category: string;
        }>;
    };
    final_candidate: HSCandidate;
    status: string;
}

export interface SearchResponse {
    query: string;
    results: HSCandidate[];
    result_count: number;
    total_found: number;
}

export interface AgentVerificationSession {
    session_id: string;
    status: 'starting' | 'active' | 'completed' | 'failed';
    product: any;
    created_at: string;
    last_updated: string;
    transcript?: {
        file: string;
        created: string;
    };
}

export interface AgentVerificationStart {
    session_id: string;
    status: string;
    product: any;
    message: string;
}

class BackendApiService {
    private baseUrl: string;

    constructor() {
        // Use window environment variables for React apps
        this.baseUrl = (window as any).REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000';
    }

    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'DELETE' = 'GET',
        data?: any
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: data ? JSON.stringify(data) : undefined,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error (${method} ${url}):`, error);
            throw error;
        }
    }

    // Health check
    async healthCheck(): Promise<{
        status: string;
        classifier_ready: boolean;
        timestamp: string;
        active_sessions: number;
    }> {
        return this.makeRequest('/health');
    }

    // Start a new classification session
    async startClassification(description: string): Promise<ClassificationSession> {
        return this.makeRequest('/api/classify/start', 'POST', { description });
    }

    // Get next question for a session
    async getNextQuestion(sessionId: string): Promise<QuestionResponse> {
        return this.makeRequest(`/api/classify/question/${sessionId}`);
    }

    // Submit answer and get updated results
    async submitAnswer(sessionId: string, question: string, answer: string): Promise<AnswerResponse> {
        return this.makeRequest(`/api/classify/answer/${sessionId}`, 'POST', { question, answer });
    }

    // Finalize classification
    async finalizeClassification(sessionId: string, selectedCode?: string): Promise<FinalClassification> {
        return this.makeRequest(`/api/classify/finalize/${sessionId}`, 'POST', { 
            selected_code: selectedCode 
        });
    }

    // Direct semantic search
    async semanticSearch(query: string, topK: number = 20, threshold: number = 0.6): Promise<SearchResponse> {
        return this.makeRequest('/api/search', 'POST', { 
            query, 
            top_k: topK, 
            threshold 
        });
    }

    // List active sessions
    async listSessions(): Promise<{
        active_sessions: Array<{
            session_id: string;
            product_description: string;
            iteration: number;
            qa_count: number;
            candidate_count: number;
            created_at: string;
            last_updated: string;
        }>;
        total_count: number;
    }> {
        return this.makeRequest('/api/classify/sessions');
    }

    // Delete a session
    async deleteSession(sessionId: string): Promise<{ session_id: string; status: string }> {
        return this.makeRequest(`/api/classify/session/${sessionId}`, 'DELETE');
    }

    // Agent verification methods
    async startAgentVerification(product: any): Promise<AgentVerificationStart> {
        return this.makeRequest('/api/agent/verify', 'POST', { product });
    }

    async getAgentStatus(sessionId: string): Promise<AgentVerificationSession> {
        return this.makeRequest(`/api/agent/status/${sessionId}`);
    }

    async listAgentSessions(): Promise<{
        active_sessions: Array<{
            session_id: string;
            product_code: string;
            product_description: string;
            status: string;
            created_at: string;
            last_updated: string;
        }>;
        total_count: number;
    }> {
        return this.makeRequest('/api/agent/sessions');
    }

    async deleteAgentSession(sessionId: string): Promise<{ session_id: string; status: string }> {
        return this.makeRequest(`/api/agent/session/${sessionId}`, 'DELETE');
    }

    async getAgentTranscript(sessionId: string): Promise<{
        session_id: string;
        transcript_file: string;
        entries: Array<{
            call_id: string;
            timestamp: string;
            text: string;
        }>;
        entry_count: number;
        created_at: string;
    }> {
        return this.makeRequest(`/api/agent/transcript/${sessionId}`);
    }
}

// Export singleton instance
export const backendApi = new BackendApiService();

// Wrapper functions to maintain compatibility with existing frontend code
export const generateQuestionsWithClaude = async (request: any) => {
    // This function is no longer needed as the backend handles question generation
    // But we'll keep it for backward compatibility during transition
    throw new Error('Use startClassification instead');
};

export const analyzeWithClaude = async (request: any) => {
    // This function is no longer needed as the backend handles analysis
    // But we'll keep it for backward compatibility during transition
    throw new Error('Use finalizeClassification instead');
};

// Fallback functions - now just throw errors since we have real backend
export const generateQuestionsFallback = async (request: any) => {
    throw new Error('Backend API should be available - check your connection');
};

export const analyzeFallback = async (request: any) => {
    throw new Error('Backend API should be available - check your connection');
};

// Helper function to check if backend is available
export const isBackendAvailable = async (): Promise<boolean> => {
    try {
        const health = await backendApi.healthCheck();
        return health.classifier_ready;
    } catch (error) {
        console.error('Backend not available:', error);
        return false;
    }
};

// Convert backend product to frontend Product type
export const convertToFrontendProduct = (backendProduct: any): any => {
    return {
        id: backendProduct.id,
        identification: backendProduct.identification,
        dateAdded: new Date(backendProduct.dateAdded),
        hsCode: backendProduct.hsCode,
        description: backendProduct.description,
        reasoning: backendProduct.reasoning,
        category: backendProduct.category,
        origin: backendProduct.origin,
        status: backendProduct.status,
        confidence: backendProduct.confidence,
        alternativeHSCodes: backendProduct.alternativeHSCodes?.map((alt: any) => ({
            code: alt.code,
            confidence: alt.confidence,
            reasoning: alt.reasoning,
            category: alt.category
        }))
    };
};

export default backendApi;