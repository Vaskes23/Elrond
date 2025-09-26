import React, { useState } from 'react';
import { Classes, Button } from '@blueprintjs/core';
import { useNavigate } from 'react-router-dom';
import { MainPanel } from './MainPanel';
import { RightSidebar } from './RightSidebar';
import { ProductQuestionnaire } from './ProductQuestionnaire';
import { BackendProductQuestionnaire } from './BackendProductQuestionnaire';
import { Product } from '../types';
import { mockProducts } from '../mockData';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchQuery] = useState('');
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [useBackendClassification, setUseBackendClassification] = useState(true);

  const toggleLeftSidebar = () => {
    setLeftSidebarVisible(!leftSidebarVisible);
  };

  const toggleRightSidebar = () => {
    setRightSidebarVisible(!rightSidebarVisible);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleProductAdd = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
    setSelectedProduct(newProduct);
  };

  const handleAddProductClick = () => {
    setIsQuestionnaireOpen(true);
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleClearSelectedProduct = () => {
    setSelectedProduct(null);
  };

  const filteredProducts = products.filter(product =>
    product.identification.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.hsCode.includes(searchQuery)
  );

  return (
    <div className={`dashboard ${Classes.DARK}`}>
      {/* Main Panel */}
      <div className="main-panel">
        <MainPanel
          selectedProduct={selectedProduct}
          onClearSelectedProduct={handleClearSelectedProduct}
          products={products}
        />
      </div>

      {/* Right Sidebar */}
      <div className={`sidebar right animate-slide-in-right ${rightSidebarVisible ? '' : 'hidden'}`}>
        <RightSidebar
          products={filteredProducts}
          selectedProduct={selectedProduct}
          onProductSelect={handleProductSelect}
          onToggle={toggleRightSidebar}
          visible={rightSidebarVisible}
          onAddProduct={handleAddProductClick}
        />
      </div>




      {useBackendClassification ? (
        <BackendProductQuestionnaire
          isOpen={isQuestionnaireOpen}
          onClose={() => setIsQuestionnaireOpen(false)}
          onComplete={handleProductAdd}
        />
      ) : (
        <ProductQuestionnaire
          isOpen={isQuestionnaireOpen}
          onClose={() => setIsQuestionnaireOpen(false)}
          onComplete={handleProductAdd}
        />
      )}
    </div>
  );
};