import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import Header from './components/Header';
import ActionButtons from './components/ActionButtons';
import MeetingTable from './components/MeetingTable';
import DistributeButton from './components/DistributeButton';
import MeetingRegistrationModal from './components/MeetingRegistrationModal';
import MeetingRecordingModal from './components/MeetingRecordingModal';
import EmailDistributionModal, { EmailData } from './components/EmailDistributionModal';
import { Meeting } from './types/Meeting';
import { meetings as initialMeetings } from './data/meetings';
import { meetingsApi } from './services/api';
import './App.css';

const App: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]); // 빈 배열로 시작
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailMeeting, setEmailMeeting] = useState<Meeting | null>(null);
  const [webexConnecting, setWebexConnecting] = useState<string | null>(null); // WebEx 연결 중인 회의 ID

  // 백엔드에서 회의 데이터 로드
  const loadMeetingsFromBackend = async () => {
    try {
      const backendMeetings = await meetingsApi.getAll();
      console.log('백엔드에서 로드된 회의:', backendMeetings);
      
      if (backendMeetings && backendMeetings.meetings && backendMeetings.meetings.length > 0) {
        // 백엔드 데이터를 프론트엔드 형식으로 변환
        const convertedMeetings = backendMeetings.meetings.map((meeting: any) => ({
          id: meeting._id || meeting.id,
          name: meeting.title,
          date: meeting.date,
          time: `${meeting.startTime}~${meeting.endTime}`,
          startDateTime: new Date(`${meeting.date}T${meeting.startTime}:00`),
          endDateTime: new Date(`${meeting.date}T${meeting.endTime}:00`),
          location: meeting.location,
          organizer: {
            name: meeting.organizer,
            title: '주관자'
          },
          attendees: meeting.attendees || [],
          totalAttendees: meeting.attendees ? meeting.attendees.length + 1 : 1,
          webexUrl: meeting.webexInfo?.url,
          status: meeting.status || 'scheduled',
          agendaItems: meeting.agendas || [],
          meetingScript: meeting.recordings?.[0]?.scripts || [],
          minutesContent: meeting.record?.summary || '',
          minutesFile: meeting.record?.pdfPath
        }));
        
        setMeetings(convertedMeetings);
      } else {
        // 백엔드에 데이터가 없으면 로컬 데이터 사용
        setMeetings(initialMeetings);
      }
    } catch (error) {
      console.error('백엔드에서 회의 데이터 로드 실패:', error);
      // 백엔드 연결 실패 시 로컬 데이터 사용
      setMeetings(initialMeetings);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    loadMeetingsFromBackend();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMeetings(meetings);
    } else {
      const filtered = meetings.filter(meeting => 
        meeting.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.organizer.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMeetings(filtered);
    }
  }, [searchQuery, meetings]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleNewMeeting = () => {
    setEditingMeeting(null); // 새 회의 등록 모드
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingMeeting(null); // 편집 상태 초기화
  };

  const handleMeetingEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting); // 편집할 회의 설정
    setIsModalOpen(true);
  };

  const handleModalSave = async (meetingData: any) => {
    try {
      // 백엔드로 전송할 데이터 형식
      const backendMeetingData = {
        title: meetingData.meetingName,
        date: meetingData.date,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        location: meetingData.location || '장소 미정',
        organizer: meetingData.organizer || '주관자 미정',
        attendees: meetingData.attendees ? meetingData.attendees.split(',').map((name: string) => name.trim()) : [],
        webexInfo: meetingData.webexUrl && meetingData.webexUrl.trim() !== '' ? {
          url: meetingData.webexUrl,
          meetingKey: '',
          meetingPassword: ''
        } : undefined,
        status: 'scheduled'
      };

      if (editingMeeting) {
        // 편집 모드: 백엔드에서 회의 업데이트
        await meetingsApi.update(editingMeeting.id, backendMeetingData);
        console.log('회의 수정 완료');
        window.alert('회의가 성공적으로 수정되었습니다.');
      } else {
        // 새 회의 등록 모드: 백엔드에서 회의 생성
        await meetingsApi.create(backendMeetingData);
        console.log('회의 생성 완료');
        window.alert('회의가 성공적으로 등록되었습니다.');
      }

      // 백엔드에서 최신 데이터 다시 로드
      await loadMeetingsFromBackend();
      
    } catch (error) {
      console.error('회의 저장 실패:', error);
      window.alert('회의 저장 중 오류가 발생했습니다.');
    }
  };

  const handleWebexJoin = (meeting: Meeting) => {
    if (meeting.webexUrl) {
      try {
        // 연결 상태 설정
        setWebexConnecting(meeting.id);
        
        // WebEx URL 유효성 검사 및 정규화
        let webexUrl = meeting.webexUrl.trim();
        
        // URL이 http:// 또는 https://로 시작하지 않으면 https:// 추가
        if (!webexUrl.startsWith('http://') && !webexUrl.startsWith('https://')) {
          webexUrl = 'https://' + webexUrl;
        }
        
        // WebEx URL 패턴 검증
        const webexPatterns = [
          /webex\.com/i,
          /meet\.webex\.com/i,
          /teams\.webex\.com/i,
          /webex\.teams\.com/i
        ];
        
        const isValidWebexUrl = webexPatterns.some(pattern => pattern.test(webexUrl));
        
        if (!isValidWebexUrl) {
          console.warn('WebEx URL 형식이 아닙니다:', webexUrl);
          // 경고하지만 연결 시도
        }
        
        // 새 창에서 WebEx 연결
        const newWindow = window.open(webexUrl, '_blank', 'noopener,noreferrer');
        
        if (newWindow) {
          // 연결 성공 로그
          console.log('WebEx 연결 시도:', {
            meeting: meeting.name,
            url: webexUrl,
            timestamp: new Date().toISOString()
          });
          
          // 연결 상태 확인 (선택적)
          setTimeout(() => {
            if (newWindow.closed) {
              console.log('WebEx 창이 닫혔습니다.');
            }
            // 연결 상태 초기화
            setWebexConnecting(null);
          }, 5000);
          
        } else {
          // 팝업 차단된 경우
          window.alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
          
          // 대안: 현재 창에서 열기
          const useCurrentWindow = window.confirm('팝업이 차단되었습니다. 현재 창에서 WebEx를 열시겠습니까?');
          if (useCurrentWindow) {
            window.location.href = webexUrl;
          }
          
          // 연결 상태 초기화
          setWebexConnecting(null);
        }
        
      } catch (error) {
        console.error('WebEx 연결 오류:', error);
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        window.alert(`WebEx 연결 중 오류가 발생했습니다: ${errorMessage}`);
        
        // 연결 상태 초기화
        setWebexConnecting(null);
      }
    } else {
      // WebEx URL이 없는 경우
      const addWebexUrl = window.confirm(
        `${meeting.name} 회의에 WebEx 링크가 없습니다.\n\n회의 정보를 편집하여 WebEx 링크를 추가하시겠습니까?`
      );
      
      if (addWebexUrl) {
        // 회의 편집 모달 열기
        handleMeetingEdit(meeting);
      }
    }
  };

  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);

  const handleMinutesAction = (meeting: Meeting) => {
    if (meeting.minutesStatus === 'write') {
      setCurrentMeeting(meeting);
      setShowRecordingModal(true);
    } else {
      window.alert(`${meeting.name} 회의록 보기 기능이 구현됩니다.`);
    }
  };

  const handleMinutesFileClick = (meeting: Meeting) => {
    if (meeting.minutesFile) {
      // 회의록 내용을 다시 PDF로 생성하여 다운로드
      const doc = new jsPDF();
      
      // 한글 폰트 설정
      doc.setFont('helvetica');
      doc.setFontSize(16);
      
      // 제목
      doc.text('Meeting Minutes', 105, 20, { align: 'center' });
      
      // 회의 기본 정보
      doc.setFontSize(12);
      const meetingTitle = `Meeting Title: ${meeting.name}`;
      const meetingDate = `Date: ${meeting.date} ${meeting.time}`;
      const meetingLocation = `Location: ${meeting.location}`;
      const meetingAttendees = `Attendees: ${meeting.attendees.join(', ')}`;
      
      doc.text(meetingTitle, 20, 40);
      doc.text(meetingDate, 20, 50);
      doc.text(meetingLocation, 20, 60);
      doc.text(meetingAttendees, 20, 70);
      
      // 회의록 내용이 있으면 추가
      if (meeting.minutesContent) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('회의록 상세 내용', 20, 90);
        
        // 회의록 내용을 파싱하여 테이블 형식으로 표시
        const minutesLines = meeting.minutesContent.split('\n');
        let yPosition = 110;
        
        minutesLines.forEach((line, index) => {
          if (line.trim()) {
            const lines = doc.splitTextToSize(line, 170);
            
            if (yPosition + lines.length * 5 > 280) {
              doc.addPage();
              yPosition = 20;
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(lines, 20, yPosition);
            yPosition += lines.length * 5 + 5;
          }
        });
      }
      
      // PDF 다운로드
      doc.save(meeting.minutesFile);
      
      console.log('회의록 파일 다운로드:', meeting.minutesFile);
    }
  };

  // 이메일 배포 핸들러
  const handleEmailDistribute = (meeting: Meeting) => {
    setEmailMeeting(meeting);
    setIsEmailModalOpen(true);
  };

  const handleEmailModalClose = () => {
    setIsEmailModalOpen(false);
    setEmailMeeting(null);
  };

  const handleSendEmail = (meeting: Meeting, emailData: EmailData) => {
    // 실제 이메일 발송 로직은 서버 API를 통해 구현해야 합니다
    console.log('이메일 발송:', {
      meeting: meeting.name,
      recipients: emailData.recipients,
      subject: emailData.subject,
      message: emailData.message,
      includeMinutes: emailData.includeMinutes,
      includeAttachments: emailData.includeAttachments
    });

    // 이메일 배포 완료 상태로 업데이트
    setMeetings(prev => prev.map(m => 
      m.id === meeting.id 
        ? { ...m, emailDistributed: true }
        : m
    ));

    // 성공 메시지 표시
    window.alert(`${meeting.name} 회의록이 성공적으로 이메일로 발송되었습니다.\n\n수신자: ${emailData.recipients.join(', ')}\n제목: ${emailData.subject}`);
  };

  // 회의록 내보내기 처리
  const handleExportMinutes = (meetingName: string, minutesContent: string, fileName: string) => {
    // 해당 회의를 찾아서 회의록 파일명을 추가하고 상태를 'view'로 변경
    setMeetings(prev => prev.map(meeting => 
      meeting.name === meetingName 
        ? { ...meeting, minutesStatus: 'view' as const, minutesContent, minutesFile: fileName }
        : meeting
    ));
    
    console.log('회의록 파일 추가:', fileName);
  };

  const handleMeetingSelect = (meetingId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedMeetings(prev => [...prev, meetingId]);
    } else {
      setSelectedMeetings(prev => prev.filter(id => id !== meetingId));
    }
  };



  // 회의 삭제 기능
  const handleDelete = () => {
    const selectedMeetingNames = filteredMeetings
      .filter(meeting => selectedMeetings.includes(meeting.id))
      .map(meeting => meeting.name);
    
    const confirmDelete = window.confirm(
      `선택된 회의를 삭제하시겠습니까?\n\n${selectedMeetingNames.join('\n')}\n\n이 작업은 되돌릴 수 없습니다.`
    );
    
    if (confirmDelete) {
      // 선택된 회의들을 제거
      setMeetings(prev => prev.filter(meeting => !selectedMeetings.includes(meeting.id)));
      
      window.alert(`선택된 회의가 삭제되었습니다:\n${selectedMeetingNames.join('\n')}`);
      
      // 선택 해제
      setSelectedMeetings([]);
    }
  };

  return (
    <div className="app">
      <Header />
      <ActionButtons 
        totalMeetings={meetings.length}
        onNewMeeting={handleNewMeeting}
        onSearch={handleSearch}
      />
      <MeetingTable 
        meetings={filteredMeetings}
        selectedMeetings={selectedMeetings}
        onMeetingSelect={handleMeetingSelect}
        onWebexJoin={handleWebexJoin}
        onMinutesAction={handleMinutesAction}
        onMeetingEdit={handleMeetingEdit}
        onMinutesFileClick={handleMinutesFileClick}
        onEmailDistribute={handleEmailDistribute}
        webexConnecting={webexConnecting}
      />
      <DistributeButton 
        selectedCount={selectedMeetings.length}
        onDelete={handleDelete}
      />
      <MeetingRegistrationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        editingMeeting={editingMeeting}
        onExportMinutes={handleExportMinutes}
      />
      {currentMeeting && (
        <MeetingRecordingModal
          isOpen={showRecordingModal}
          onClose={() => {
            setShowRecordingModal(false);
            setCurrentMeeting(null);
          }}
          meetingName={currentMeeting.name}
          agendaItems={currentMeeting.agendaItems || []}
          existingScript={currentMeeting.meetingScript}
          existingMinutes={currentMeeting.minutesContent}
          meetingInfo={{
            date: currentMeeting.date,
            time: currentMeeting.time,
            location: currentMeeting.location,
            organizer: currentMeeting.organizer.name,
            attendees: currentMeeting.attendees
          }}
          onExportMinutes={handleExportMinutes}
        />
      )}
      <EmailDistributionModal
        isOpen={isEmailModalOpen}
        onClose={handleEmailModalClose}
        meeting={emailMeeting}
        onSendEmail={handleSendEmail}
      />
    </div>
  );
};

export default App; 