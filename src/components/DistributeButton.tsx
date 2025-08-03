import React from 'react';
import './DistributeButton.css';

interface DistributeButtonProps {
  selectedCount: number;
  onDelete: () => void;
}

const DistributeButton: React.FC<DistributeButtonProps> = ({
  selectedCount,
  onDelete
}) => {
  const deleteButtonClassName = `delete-button ${selectedCount > 0 ? 'selected' : ''}`;
  
  return (
    <div className="distribute-container">
      <div className="distribute-info">
        <span className="selected-count">
          선택된 회의: {selectedCount}개
        </span>
      </div>
      <div className="button-group">
        <button 
          onClick={onDelete}
          className={deleteButtonClassName}
          disabled={selectedCount === 0}
        >
          <i className="fas fa-trash"></i>
          <span>삭제</span>
        </button>
      </div>
    </div>
  );
};

export default DistributeButton; 