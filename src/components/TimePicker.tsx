import React, { useState, useEffect } from 'react';
import './TimePicker.css';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  minTime?: string;
  maxTime?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = "시간을 선택하세요",
  className = "",
  error = false,
  minTime,
  maxTime
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>(value || '');

  useEffect(() => {
    setSelectedTime(value || '');
  }, [value]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('.time-picker')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 10분 단위 시간 옵션 생성 (00:00 ~ 23:50)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // minTime, maxTime 제약 조건 적용
        if (minTime && timeString <= minTime) continue;
        if (maxTime && timeString >= maxTime) continue;
        
        options.push(timeString);
      }
    }
    return options;
  };

  const formatDisplayTime = (time: string) => {
    if (!time) return '';
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? '오후' : '오전';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${ampm} ${displayHour}:${minute}`;
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    onChange(time);
    setIsOpen(false);
  };

  const selectQuickTime = (hour: number, minute: number) => {
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // 제약 조건 확인
    if (minTime && timeString <= minTime) return;
    if (maxTime && timeString >= maxTime) return;
    
    setSelectedTime(timeString);
    onChange(timeString);
    setIsOpen(false);
  };

  const timeOptions = generateTimeOptions();

  return (
    <div className={`time-picker ${className}`}>
      <div 
        className={`time-input ${error ? 'error' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="시간 선택"
      >
        <input
          type="text"
          value={selectedTime ? formatDisplayTime(selectedTime) : ''}
          placeholder={placeholder}
          readOnly
          className="time-input-field"
          aria-label="선택된 시간"
        />
        <i className="fas fa-clock time-icon"></i>
      </div>

      {isOpen && (
        <div className="time-dropdown">
          <div className="time-header">
            <h3 className="time-title">시간 선택</h3>
          </div>
          
          <div className="quick-time-buttons">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => selectQuickTime(9, 0)}
              title="오전 9:00"
            >
              오전 9:00
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => selectQuickTime(10, 0)}
              title="오전 10:00"
            >
              오전 10:00
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => selectQuickTime(14, 0)}
              title="오후 2:00"
            >
              오후 2:00
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => selectQuickTime(15, 0)}
              title="오후 3:00"
            >
              오후 3:00
            </button>
          </div>
          
          <div className="time-options">
            {timeOptions.map((time) => (
              <button
                key={time}
                className={`time-option ${selectedTime === time ? 'selected' : ''}`}
                onClick={() => handleTimeSelect(time)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTimeSelect(time);
                  }
                }}
                aria-label={`${formatDisplayTime(time)} 선택`}
              >
                {formatDisplayTime(time)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker; 