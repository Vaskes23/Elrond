import React, { useState } from 'react';
import { Button, Classes } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
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
  const [searchQuery, setSearchQuery] = useState('');
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
      {/* Left Sidebar Toggle Button */}
      {!leftSidebarVisible && (
        <Button
          className="sidebar-toggle left"
          icon={IconNames.MENU_OPEN}
          onClick={toggleLeftSidebar}
          minimal
          small
        />
      )}

      {/* Left Sidebar */}
      <div className={`sidebar left ${leftSidebarVisible ? '' : 'hidden'}`}>
        <LeftSidebar
          onToggle={toggleLeftSidebar}
          visible={leftSidebarVisible}
          onAddProduct={handleAddProductClick}
        />
      </div>

      {/* Main Panel */}
      <div className="main-panel">
        <MainPanel
          selectedProduct={selectedProduct}
          onLeftToggle={toggleLeftSidebar}
          onRightToggle={toggleRightSidebar}
          leftSidebarVisible={leftSidebarVisible}
          rightSidebarVisible={rightSidebarVisible}
        />
      </div>

      {/* Right Sidebar */}
      <div className={`sidebar right ${rightSidebarVisible ? '' : 'hidden'}`}>
        <RightSidebar
          products={filteredProducts}
          selectedProduct={selectedProduct}
          onProductSelect={handleProductSelect}
          onToggle={toggleRightSidebar}
          visible={rightSidebarVisible}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Right Sidebar Toggle Button */}
      {!rightSidebarVisible && (
        <Button
          className="sidebar-toggle right"
          icon={IconNames.MENU_OPEN}
          onClick={toggleRightSidebar}
          minimal
          small
        />
      )}

      <ProductQuestionnaire
        isOpen={isQuestionnaireOpen}
        onClose={() => setIsQuestionnaireOpen(false)}
        onComplete={handleProductAdd}
      />
    </div>
  );
};
