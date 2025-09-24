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
