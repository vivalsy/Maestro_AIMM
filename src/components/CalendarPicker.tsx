import React, { useState, useEffect } from 'react';
import './CalendarPicker.css';

interface CalendarPickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({
  value,
  onChange,
  placeholder = "날짜를 선택하세요",
  className = "",
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    }
  }, [value]);

  // 외부 클릭 시 캘린더 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('.calendar-picker')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // 이전 달의 마지막 날들
    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // 현재 달의 날들
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      days.push({ date: currentDate, isCurrentMonth: true });
    }
    
    // 다음 달의 첫 날들
    const remainingDays = 42 - days.length; // 6주 표시를 위해
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ date: nextDate, isCurrentMonth: false });
    }
    
    return days;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onChange(formatDate(date));
    setIsOpen(false);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    onChange(formatDate(today));
    setIsOpen(false);
  };

  const selectQuickDate = (daysOffset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    setCurrentDate(date);
    setSelectedDate(date);
    onChange(formatDate(date));
    setIsOpen(false);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  return (
    <div className={`calendar-picker ${className}`}>
      <div 
        className={`calendar-input ${error ? 'error' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="날짜 선택"
      >
        <input
          type="text"
          value={selectedDate ? formatDisplayDate(selectedDate) : ''}
          placeholder={placeholder}
          readOnly
          className="calendar-input-field"
          aria-label="선택된 날짜"
        />
        <i className="fas fa-calendar calendar-icon"></i>
      </div>

      {isOpen && (
        <div className="calendar-dropdown">
          <div className="calendar-header">
            <button 
              className="calendar-nav-btn"
              onClick={goToPreviousMonth}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <h3 className="calendar-title">
              {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
            </h3>
            <button 
              className="calendar-nav-btn"
              onClick={goToNextMonth}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div className="calendar-weekdays">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
          </div>

          <div className="calendar-days">
            {days.map((day, index) => (
              <button
                key={index}
                className={`calendar-day ${
                  !day.isCurrentMonth ? 'other-month' : ''
                } ${
                  isToday(day.date) ? 'today' : ''
                } ${
                  isSelected(day.date) ? 'selected' : ''
                }`}
                onClick={() => handleDateSelect(day.date)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDateSelect(day.date);
                  }
                }}
                disabled={!day.isCurrentMonth}
                aria-label={`${day.date.getFullYear()}년 ${day.date.getMonth() + 1}월 ${day.date.getDate()}일`}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>

          <div className="calendar-footer">
            <div className="quick-select-buttons">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => selectQuickDate(0)}
                title="오늘"
              >
                오늘
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => selectQuickDate(1)}
                title="내일"
              >
                내일
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => selectQuickDate(7)}
                title="다음 주"
              >
                다음 주
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPicker; 