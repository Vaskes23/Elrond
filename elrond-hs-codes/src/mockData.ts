import { Product, ChatMessage } from './types';

export const mockProducts: Product[] = [
  {
    id: '1',
    identification: 'PROD-2024-001',
    dateAdded: new Date('2024-09-20T14:30:00'),
    hsCode: '8517.12.00',
    description: 'Wireless Bluetooth Headphones with Active Noise Cancellation',
    reasoning: 'Classified under HS code 8517.12.00 as it is a wireless telephone handset equipment with built-in receiver functionality. The active noise cancellation feature does not change the primary function as an audio receiving device.',
    category: 'Electronics',
    origin: 'China',
    status: 'classified',
    confidence: 95
  },
  {
    id: '2',
    identification: 'PROD-2024-002',
    dateAdded: new Date('2024-09-19T09:15:00'),
    hsCode: '6203.42.10',
    description: 'Men\'s Cotton Denim Jeans, Size 32x34',
    reasoning: 'Classified under HS code 6203.42.10 for men\'s trousers and breeches of cotton. The item is made of 100% cotton denim fabric, fits the definition of men\'s outer garments, and meets the weight requirements for this classification.',
    category: 'Apparel',
    origin: 'Bangladesh',
    status: 'classified',
    confidence: 88
  },
  {
    id: '3',
    identification: 'PROD-2024-003',
    dateAdded: new Date('2024-09-18T16:45:00'),
    hsCode: '8471.30.01',
    description: 'Portable Laptop Computer, 15.6" Screen, 16GB RAM, 512GB SSD',
    reasoning: 'Classified under HS code 8471.30.01 as a portable digital automatic data processing machine. The laptop meets the criteria for weight under 10kg, has integrated display, keyboard, and processing unit in a single housing.',
    category: 'Electronics',
    origin: 'Taiwan',
    status: 'classified',
    confidence: 97
  },
  {
    id: '4',
    identification: 'PROD-2024-004',
    dateAdded: new Date('2024-09-17T11:20:00'),
    hsCode: '3304.99.00',
    description: 'Organic Face Moisturizer Cream, 50ml, Anti-Aging Formula',
    reasoning: 'Classified under HS code 3304.99.00 for beauty or make-up preparations. This face cream is specifically formulated for cosmetic purposes with anti-aging properties, falling under other beauty preparations not elsewhere specified.',
    category: 'Cosmetics',
    origin: 'France',
    status: 'needs_review',
    confidence: 72,
    customsCall: {
      id: 'call_002',
      callDate: new Date('2024-09-14T16:45:00'),
      agentName: 'AI Agent Beta',
      customsOfficer: 'Officer Jean Dubois',
      summary: 'Contacted French customs to verify HS code classification for cosmetic face cream. Officer confirmed that the product qualifies under 3304.99.00 for beauty preparations. Discussed anti-aging claims and confirmed these do not affect HS classification as the product remains a cosmetic preparation.',
      transcription: 'Agent: Hello, this is AI Agent Beta calling regarding HS code verification for a cosmetic face moisturizer.\n\nOfficer Dubois: Bonjour, I can assist with that. What type of cosmetic product?\n\nAgent: It\'s an anti-aging face moisturizer cream, 50ml, manufactured in France. Currently classified as 3304.99.00.\n\nOfficer Dubois: That is correct. Anti-aging creams fall under 3304.99.00 for other beauty preparations. The anti-aging claims do not change the classification.\n\nAgent: Are there any special considerations for anti-aging formulations?\n\nOfficer Dubois: No, as long as it remains a cosmetic product and not a medicinal preparation, 3304.99.00 is appropriate.\n\nAgent: Perfect, thank you for the confirmation.',
      confirmedHSCode: '3304.99.00',
      outcome: 'confirmed'
    }
  },
  {
    id: '5',
    identification: 'PROD-2024-005',
    dateAdded: new Date('2024-09-16T13:55:00'),
    hsCode: '9403.60.80',
    description: 'Wooden Office Chair with Ergonomic Design and Leather Upholstery',
    reasoning: 'Classified under HS code 9403.60.80 for other wooden furniture. The chair has a wooden frame structure as the primary material, with leather upholstery as a secondary component. Designed primarily for office/commercial use.',
    category: 'Furniture',
    origin: 'Italy',
    status: 'classified',
    confidence: 91
  },
  {
    id: '6',
    identification: 'PROD-2024-006',
    dateAdded: new Date('2024-09-15T08:30:00'),
    hsCode: '2009.50.00',
    description: 'Organic Tomato Juice, 1L Glass Bottle, No Added Sugar',
    reasoning: 'Classified under HS code 2009.50.00 for tomato juice, unfermented and not containing added spirit. The product is 100% tomato juice without fermentation, preservatives, or alcohol content, packaged in consumer-ready glass containers.',
    category: 'Food & Beverages',
    origin: 'Spain',
    status: 'needs_review',
    confidence: 65,
    customsCall: {
      id: 'call_001',
      callDate: new Date('2024-09-15T14:30:00'),
      agentName: 'AI Agent Alpha',
      customsOfficer: 'Officer Maria Rodriguez',
      summary: 'Contacted Spanish customs to verify HS code classification for organic tomato juice. Officer confirmed that the product qualifies under 2009.50.00 but noted that organic certification may affect tariff rates. Recommended adding organic qualifier to classification documentation.',
      transcription: 'Agent: Hello, this is AI Agent Alpha calling regarding HS code verification for organic tomato juice import.\n\nOfficer Rodriguez: Yes, I can help with that. What are the product specifications?\n\nAgent: It\'s a 1L glass bottle of 100% organic tomato juice, no additives, preservatives, or alcohol. Currently classified as 2009.50.00.\n\nOfficer Rodriguez: That classification is correct for tomato juice. However, since it\'s organic certified, you\'ll want to ensure proper documentation for potential preferential rates under organic trade agreements.\n\nAgent: Understood. Should the HS code remain 2009.50.00?\n\nOfficer Rodriguez: Yes, 2009.50.00 is appropriate. Just ensure organic certification is properly documented.\n\nAgent: Thank you for the confirmation.',
      confirmedHSCode: '2009.50.00',
      outcome: 'confirmed'
    }
  },
  {
    id: '7',
    identification: 'PROD-2024-007',
    dateAdded: new Date('2024-09-16T10:15:00'),
    hsCode: '6403.99.00',
    description: 'Leather Hiking Boots, Waterproof, Size 42, Brown',
    reasoning: 'Tentatively classified under HS code 6403.99.00 for other footwear with outer soles of rubber/plastic and uppers of leather. However, the waterproof treatment and specialized hiking features may affect classification under sporting goods categories.',
    category: 'Footwear',
    origin: 'Germany',
    status: 'pending',
    confidence: 72
  }
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    message: 'Hi! I can help you classify products and determine the correct HS codes. Upload a product description or tell me about the item you need to classify.',
    isUser: false,
    timestamp: new Date('2024-09-20T10:00:00')
  },
  {
    id: '2',
    message: 'I need help classifying a smart watch with health monitoring features.',
    isUser: true,
    timestamp: new Date('2024-09-20T10:05:00')
  },
  {
    id: '3',
    message: 'A smart watch with health monitoring would typically be classified under HS code 9102.12.80 for wrist-watches, electrically operated, with mechanical display only, or 9102.11.80 if it has both mechanical and digital displays. The health monitoring features don\'t change its primary function as a timepiece.',
    isUser: false,
    timestamp: new Date('2024-09-20T10:05:30')
  }
];
