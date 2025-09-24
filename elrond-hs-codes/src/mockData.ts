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
    origin: 'China'
  },
  {
    id: '2',
    identification: 'PROD-2024-002',
    dateAdded: new Date('2024-09-19T09:15:00'),
    hsCode: '6203.42.10',
    description: 'Men\'s Cotton Denim Jeans, Size 32x34',
    reasoning: 'Classified under HS code 6203.42.10 for men\'s trousers and breeches of cotton. The item is made of 100% cotton denim fabric, fits the definition of men\'s outer garments, and meets the weight requirements for this classification.',
    category: 'Apparel',
    origin: 'Bangladesh'
  },
  {
    id: '3',
    identification: 'PROD-2024-003',
    dateAdded: new Date('2024-09-18T16:45:00'),
    hsCode: '8471.30.01',
    description: 'Portable Laptop Computer, 15.6" Screen, 16GB RAM, 512GB SSD',
    reasoning: 'Classified under HS code 8471.30.01 as a portable digital automatic data processing machine. The laptop meets the criteria for weight under 10kg, has integrated display, keyboard, and processing unit in a single housing.',
    category: 'Electronics',
    origin: 'Taiwan'
  },
  {
    id: '4',
    identification: 'PROD-2024-004',
    dateAdded: new Date('2024-09-17T11:20:00'),
    hsCode: '3304.99.00',
    description: 'Organic Face Moisturizer Cream, 50ml, Anti-Aging Formula',
    reasoning: 'Classified under HS code 3304.99.00 for beauty or make-up preparations. This face cream is specifically formulated for cosmetic purposes with anti-aging properties, falling under other beauty preparations not elsewhere specified.',
    category: 'Cosmetics',
    origin: 'France'
  },
  {
    id: '5',
    identification: 'PROD-2024-005',
    dateAdded: new Date('2024-09-16T13:55:00'),
    hsCode: '9403.60.80',
    description: 'Wooden Office Chair with Ergonomic Design and Leather Upholstery',
    reasoning: 'Classified under HS code 9403.60.80 for other wooden furniture. The chair has a wooden frame structure as the primary material, with leather upholstery as a secondary component. Designed primarily for office/commercial use.',
    category: 'Furniture',
    origin: 'Italy'
  },
  {
    id: '6',
    identification: 'PROD-2024-006',
    dateAdded: new Date('2024-09-15T08:30:00'),
    hsCode: '2009.50.00',
    description: 'Organic Tomato Juice, 1L Glass Bottle, No Added Sugar',
    reasoning: 'Classified under HS code 2009.50.00 for tomato juice, unfermented and not containing added spirit. The product is 100% tomato juice without fermentation, preservatives, or alcohol content, packaged in consumer-ready glass containers.',
    category: 'Food & Beverages',
    origin: 'Spain'
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
