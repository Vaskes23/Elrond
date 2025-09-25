import React, { useState } from 'react';
import { Classes } from '@blueprintjs/core';
import { LeftSidebar } from './LeftSidebar';
import { MainPanel } from './MainPanel';
import { RightSidebar } from './RightSidebar';
import { ProductQuestionnaire } from './ProductQuestionnaire';
import { Product } from '../types';
import { mockProducts } from '../mockData';

export const Dashboard: React.FC = () => {
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(mockProducts[0]);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchQuery] = useState('');
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);

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
          onLeftToggle={toggleLeftSidebar}
          onRightToggle={toggleRightSidebar}
          leftSidebarVisible={leftSidebarVisible}
          rightSidebarVisible={rightSidebarVisible}
          onAddProduct={handleAddProductClick}
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



      <ProductQuestionnaire
        isOpen={isQuestionnaireOpen}
        onClose={() => setIsQuestionnaireOpen(false)}
        onComplete={handleProductAdd}
      />
    </div>
  );
};