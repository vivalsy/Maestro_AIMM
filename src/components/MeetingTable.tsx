import React, { useState, useEffect } from 'react';
import { Meeting } from '../types/Meeting';
import './MeetingTable.css';

interface MeetingTableProps {
  meetings: Meeting[];
  selectedMeetings: string[];
  onMeetingSelect: (meetingId: string, isSelected: boolean) => void;
  onWebexJoin: (meeting: Meeting) => void;
  onMinutesAction: (meeting: Meeting) => void;
  onMeetingEdit: (meeting: Meeting) => void; // 회의 편집 함수 추가
  onMinutesFileClick?: (meeting: Meeting) => void; // 회의록 파일 클릭 함수 추가
  onEmailDistribute?: (meeting: Meeting) => void; // 이메일 배포 함수 추가
  webexConnecting?: string | null; // WebEx 연결 중인 회의 ID
}

const MeetingTable: React.FC<MeetingTableProps> = ({
  meetings,
  selectedMeetings,
  onMeetingSelect,
  onWebexJoin,
  onMinutesAction,
  onMeetingEdit,
  onMinutesFileClick,
  onEmailDistribute,
  webexConnecting
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // 실시간으로 현재 시간 업데이트 (1분마다)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(timer);
  }, []);

  // 회의 상태를 동적으로 계산하는 함수
  const calculateMeetingStatus = (meeting: Meeting): 'scheduled' | 'in-progress' | 'completed' => {
    // startDateTime과 endDateTime이 있으면 그것을 사용
    if (meeting.startDateTime && meeting.endDateTime) {
      if (currentTime < meeting.startDateTime) {
        return 'scheduled';
      } else if (currentTime >= meeting.startDateTime && currentTime <= meeting.endDateTime) {
        return 'in-progress';
      } else {
        return 'completed';
      }
    }
    
    // 기존 status를 사용 (fallback)
    return meeting.status;
  };

  // 회의록 상태를 동적으로 계산하는 함수
  const calculateMinutesStatus = (meeting: Meeting): 'write' | 'view' => {
    // 회의록 파일이 있으면 'view', 없으면 'write'
    return meeting.minutesFile ? 'view' : 'write';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'status-scheduled';
      case 'in-progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      default:
        return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '예정';
      case 'in-progress':
        return '진행중';
      case 'completed':
        return '완료';
      default:
        return status;
    }
  };

  const formatAttendees = (attendees: string[], total: number) => {
    if (attendees.length === 0) return '';
    const displayAttendees = attendees.slice(0, 3);
    const remaining = total - attendees.length;
    if (remaining > 0) {
      return `${displayAttendees.join(', ')} 외 ${remaining}명`;
    }
    return displayAttendees.join(', ');
  };

  return (
    <div className="table-container">
      <table className="meeting-table">
        <thead>
          <tr>
            <th className="checkbox-header"></th>
            <th>회의명</th>
            <th>일시</th>
            <th>장소</th>
            <th>작성자</th>
            <th>참석자</th>
            <th>WebEx</th>
            <th>상태</th>
            <th>회의록</th>
            <th>배포</th>
          </tr>
        </thead>
        <tbody>
          {meetings.length === 0 ? (
            <tr>
              <td colSpan={10} className="empty-table">
                <div className="empty-state">
                  <i className="fas fa-calendar-times"></i>
                  <h3>등록된 회의가 없습니다</h3>
                  <p>회의 등록 / 기록 버튼을 클릭하여 첫 번째 회의를 등록해보세요.</p>
                </div>
              </td>
            </tr>
          ) : (
            meetings.map((meeting) => {
              const currentStatus = calculateMeetingStatus(meeting);
              const currentMinutesStatus = calculateMinutesStatus(meeting);
              
              return (
                <tr key={meeting.id}>
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedMeetings.includes(meeting.id)}
                      onChange={(e) => onMeetingSelect(meeting.id, e.target.checked)}
                    />
                  </td>
                  <td className="meeting-name">
                    <div className="meeting-name-container">
                      <span 
                        className="meeting-name-clickable"
                        onClick={() => onMeetingEdit(meeting)}
                        title="회의 정보 편집"
                      >
                        {meeting.name}
                      </span>
                    </div>
                  </td>
                  <td className="meeting-datetime">
                    <div className="datetime-info">
                      <span>{meeting.date}</span>
                    </div>
                    <div className="datetime-info">
                      <span>{meeting.time}</span>
                    </div>
                  </td>
                  <td className="meeting-location">{meeting.location}</td>
                  <td className="meeting-organizer">
                    {meeting.organizer.name}
                  </td>
                  <td className="meeting-attendees">
                    {formatAttendees(meeting.attendees, meeting.totalAttendees)}
                  </td>
                  <td className="meeting-webex">
                    {meeting.webexUrl ? (
                      <div 
                        className={`webex-icon ${webexConnecting === meeting.id ? 'connecting' : ''}`}
                        onClick={() => onWebexJoin(meeting)}
                        title={webexConnecting === meeting.id ? "WebEx 연결 중..." : "WebEx 회의 참가"}
                      >
                        <i className={`fas ${webexConnecting === meeting.id ? 'fa-spinner fa-spin' : 'fa-video'}`}></i>
                        <span className="webex-tooltip">
                          {webexConnecting === meeting.id ? "연결 중..." : "참가"}
                        </span>
                      </div>
                    ) : (
                      <div 
                        className="no-webex"
                        onClick={() => onWebexJoin(meeting)}
                        title="WebEx 링크 추가"
                      >
                        <i className="fas fa-plus"></i>
                        <span className="webex-tooltip">추가</span>
                      </div>
                    )}
                  </td>
                  <td className="meeting-status">
                    <span className={`status-badge ${getStatusColor(currentStatus)}`}>
                      {getStatusText(currentStatus)}
                    </span>
                  </td>
                  <td className="meeting-minutes">
                    {currentMinutesStatus === 'write' ? (
                      <div className="minutes-writing">
                        <i className="fas fa-pencil-alt"></i>
                        <span>작성중</span>
                      </div>
                    ) : (
                      <div 
                        className="minutes-file"
                        onClick={() => onMinutesFileClick && onMinutesFileClick(meeting)}
                        title="회의록 파일 다운로드"
                      >
                        <i className="fas fa-file-pdf"></i>
                        <span>{meeting.minutesFile}</span>
                      </div>
                    )}
                  </td>
                  <td className="meeting-distribute">
                    {currentMinutesStatus === 'view' && meeting.minutesFile ? (
                      <button
                        className={`distribute-btn ${meeting.emailDistributed ? 'distributed' : ''}`}
                        onClick={() => onEmailDistribute && onEmailDistribute(meeting)}
                        title={meeting.emailDistributed ? "이미 배포됨" : "회의록 이메일 배포"}
                        disabled={meeting.emailDistributed}
                      >
                        <i className={`fas ${meeting.emailDistributed ? 'fa-check' : 'fa-envelope'}`}></i>
                        <span>{meeting.emailDistributed ? '배포완료' : '배포'}</span>
                      </button>
                    ) : (
                      <div className="no-distribute">
                        <span>-</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MeetingTable; 