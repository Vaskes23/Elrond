import React, { useState } from 'react';
import { Classes, Button } from '@blueprintjs/core';
import { useNavigate } from 'react-router-dom';
import { LeftSidebar } from './LeftSidebar';
import { MainPanel } from './MainPanel';
import { RightSidebar } from './RightSidebar';
import { ProductQuestionnaire } from './ProductQuestionnaire';
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
      {/* Header with Elrond Logo */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'rgba(16, 22, 26, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px'
      }}>
        <Button
          minimal
          onClick={handleLogoClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            background: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <img
            src="/ElrondLogoWhite.png"
            alt="Elrond Logo"
            style={{
              width: '32px',
              height: '32px',
              filter: 'brightness(1.1)'
            }}
          />
          <span style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#ffffff',
            fontFamily: '"Elrond", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            letterSpacing: '0.5px'
          }}>

          </span>
        </Button>
      </div>

      {/* Main Panel */}
      <div className="main-panel" style={{ paddingTop: '60px' }}>
        <MainPanel
          selectedProduct={selectedProduct}
          onLeftToggle={toggleLeftSidebar}
          onRightToggle={toggleRightSidebar}
          leftSidebarVisible={leftSidebarVisible}
          rightSidebarVisible={rightSidebarVisible}
          onAddProduct={handleAddProductClick}
          onClearSelectedProduct={handleClearSelectedProduct}
          products={products}
        />
      </div>

      {/* Right Sidebar */}
      <div className={`sidebar right animate-slide-in-right ${rightSidebarVisible ? '' : 'hidden'}`} style={{ paddingTop: '60px' }}>
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