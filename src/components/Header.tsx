import React from 'react';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="header-title-container">
            <div className="header-logo">
              <i className="fas fa-robot"></i>
              <i className="fas fa-users"></i>
            </div>
            <h1 className="header-title">Maestro (AI Meeting Master)</h1>
          </div>
          <p className="header-description">
            AI 기반 회의 관리 시스템으로 회의 등록, 실시간 회의 기록 및 정리, 회의록 배포 등을 수행할 수 있습니다
          </p>
        </div>
        
      </div>
    </header>
  );
};

export default Header; 