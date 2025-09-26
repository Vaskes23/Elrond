import { Product } from "../types";

export const filterProducts = (products: Product[], searchQuery: string): Product[] => {
  return products.filter(product =>
    product.identification.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.hsCode.includes(searchQuery) ||
    (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'classified': return { color: '#3DCC91', bg: 'rgba(0, 153, 96, 0.1)', border: 'rgba(0, 153, 96, 0.3)' };
    case 'pending': return { color: '#FFB366', bg: 'rgba(217, 130, 43, 0.1)', border: 'rgba(217, 130, 43, 0.3)' };
    case 'needs_review': return { color: '#FF7373', bg: 'rgba(219, 55, 55, 0.1)', border: 'rgba(219, 55, 55, 0.3)' };
    default: return { color: '#D3D8DE', bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)' };
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'classified': return 'Classified';
    case 'pending': return 'Pending';
    case 'needs_review': return 'Need Review';
    default: return 'Unknown';
  }
};

export const formatDate = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getCategoryColor = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'electronics': return 'primary';
    case 'apparel': return 'success';
    case 'cosmetics': return 'warning';
    case 'furniture': return 'warning';
    case 'food & beverages': return 'danger';
    default: return undefined;
  }
};
