import React from 'react';
import SearchBar from './SearchBar';
import './ActionButtons.css';

interface ActionButtonsProps {
  totalMeetings: number;
  onNewMeeting: () => void;
  onSearch: (query: string) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  totalMeetings,
  onNewMeeting,
  onSearch
}) => {
  return (
    <div className="action-container">
      <div className="action-header">
        <div className="action-title">
          <i className="fas fa-list"></i>
          <span>회의 목록</span>
        </div> 
          
      </div>
      <div className="action-buttons">
        <button onClick={onNewMeeting} className="action-button new-meeting">
          <i className="fas fa-plus"></i>
          <span>회의 등록 / 기록</span>
        </button>
        <SearchBar onSearch={onSearch} />
      </div>
    </div>
  );
};

export default ActionButtons; 