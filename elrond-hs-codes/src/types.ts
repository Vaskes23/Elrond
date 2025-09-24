export interface Product {
  id: string;
  identification: string;
  dateAdded: Date;
  hsCode: string;
  description: string;
  reasoning: string;
  category?: string;
  origin?: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
}

export interface FileUpload {
  id: string;
  name: string;
  size: number;
  uploadDate: Date;
  status: 'uploading' | 'completed' | 'failed';
}

export interface Question {
  id: string;
  text: string;
  type: 'single' | 'multiple' | 'text' | 'number';
  options?: string[];
  required: boolean;
  category: string;
}

export interface QuestionnaireAnswer {
  questionId: string;
  answer: string | string[];
}

export interface HSCodeSuggestion {
  code: string;
  description: string;
  confidence: number;
  reasoning: string;
  category: string;
}

export interface ProductQuestionnaire {
  id: string;
  answers: QuestionnaireAnswer[];
  suggestedHSCode?: HSCodeSuggestion;
  completedAt?: Date;
}
