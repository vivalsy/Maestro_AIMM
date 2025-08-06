import React, { useState, useEffect } from 'react';
import CalendarPicker from './CalendarPicker';
import TimePicker from './TimePicker';
import MeetingRecordingModal from './MeetingRecordingModal';
import { Meeting } from '../types/Meeting';
import './MeetingRegistrationModal.css';

interface MeetingRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meetingData: any) => Promise<any>;
  editingMeeting?: Meeting | null; // 편집할 회의 데이터
  onExportMinutes?: (meetingName: string, minutesContent: string, fileName: string) => void; // 회의록 내보내기 콜백
}

interface AgendaItem {
  id: string;
  title: string;
  duration: string;
  presenter: string;
  content: string;
  files: File[];
  minutes?: string; // 회의록 작성 필드 추가
  isMinutesEditing?: boolean; // 회의록 편집 모드 상태
}

interface MeetingRecordItem {
  id: string;
  agendaName: string;
  discussion: string;
  type: 'comment' | 'instruction';
  department: string;
  isEditable: boolean;
  aiSummary?: string;
}

interface AIAnalysisResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

const MeetingRegistrationModal: React.FC<MeetingRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMeeting,
  onExportMinutes
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'agenda' | 'record'>('basic');
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [meetingRecords, setMeetingRecords] = useState<MeetingRecordItem[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemName, setDeleteItemName] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgendaName, setNewAgendaName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{[key: string]: AIAnalysisResult}>({});
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);
  const [meetingScripts, setMeetingScripts] = useState<{[key: string]: string}>({});
  const [newAgenda, setNewAgenda] = useState({
    title: '',
    duration: '',
    presenter: '',
    content: '',
    files: [] as File[]
  });

  const [formData, setFormData] = useState({
    meetingName: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    organizer: '',
    attendees: '',
    webexUrl: '',
    meetingKey: '',
    meetingPassword: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // 편집 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (editingMeeting) {
      setFormData({
        meetingName: editingMeeting.name,
        date: editingMeeting.date,
        startTime: editingMeeting.time.split('~')[0],
        endTime: editingMeeting.time.split('~')[1],
        location: editingMeeting.location,
        organizer: editingMeeting.organizer.name,
        attendees: editingMeeting.attendees.join(', '),
        webexUrl: editingMeeting.webexUrl || '',
        meetingKey: editingMeeting.webexInfo?.meetingKey || '',
        meetingPassword: editingMeeting.webexInfo?.meetingPassword || ''
      });
      setAgendaItems(editingMeeting.agendaItems || []);
    } else {
      // 새 회의 등록 모드일 때 초기화
      setFormData({
        meetingName: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        organizer: '',
        attendees: '',
        webexUrl: '',
        meetingKey: '',
        meetingPassword: ''
      });
      setAgendaItems([]);
      setErrors({});
    }
  }, [editingMeeting]);

  const validateTime = (startTime: string, endTime: string): string | null => {
    if (!startTime || !endTime) return null;
    
    if (startTime >= endTime) {
      return '종료 시간은 시작 시간보다 늦어야 합니다.';
    }
    
    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.meetingName.trim()) {
      newErrors.meetingName = '회의명을 입력해주세요.';
    }

    if (!formData.date) {
      newErrors.date = '회의 일자를 선택해주세요.';
    }

    if (!formData.startTime) {
      newErrors.startTime = '시작 시간을 선택해주세요.';
    }

    if (!formData.endTime) {
      newErrors.endTime = '종료 시간을 선택해주세요.';
    }

    if (!formData.location.trim()) {
      newErrors.location = '장소를 입력해주세요.';
    }

    // 시간 검증
    const timeError = validateTime(formData.startTime, formData.endTime);
    if (timeError) {
      newErrors.endTime = timeError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    
    // 시간 필드 변경 시 실시간 검증
    if (field === 'startTime' || field === 'endTime') {
      const newStartTime = field === 'startTime' ? value : formData.startTime;
      const newEndTime = field === 'endTime' ? value : formData.endTime;
      
      const timeError = validateTime(newStartTime, newEndTime);
      if (timeError) {
        setErrors(prev => ({
          ...prev,
          endTime: timeError
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          endTime: ''
        }));
      }
    }
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      // 필수 필드 검증
      if (!formData.meetingName.trim()) {
        alert('회의명을 입력해주세요.');
        return;
      }

      if (!formData.date) {
        alert('회의 일자를 선택해주세요.');
        return;
      }

      if (!formData.startTime || !formData.endTime) {
        alert('회의 시간을 입력해주세요.');
        return;
      }

      const meetingData = {
        ...formData,
        agendaItems,
        meetingRecords,
        meetingKey: formData.meetingKey || '',
        meetingPassword: formData.meetingPassword || ''
      };

      console.log('저장할 회의 데이터:', meetingData);
      
      // 저장 중 로딩 상태 표시
      const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement;
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
      }
      
      await onSave(meetingData);
      
      // 성공 시 버튼 상태 복원
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = '<i class="fas fa-save"></i> 저장';
      }
      
    } catch (error) {
      console.error('회의 저장 중 오류:', error);
      alert('회의 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
      
      // 에러 시 버튼 상태 복원
      const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = '<i class="fas fa-save"></i> 저장';
      }
    }
  };

  const handleAgendaInputChange = (field: string, value: string) => {
    setNewAgenda(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 회의록 작성 필드 변경 처리
  const handleAgendaMinutesChange = (agendaId: string, minutes: string) => {
    setAgendaItems(prev => 
      prev.map(item => 
        item.id === agendaId 
          ? { ...item, minutes } 
          : item
      )
    );
  };

  // 회의록 편집 모드 토글
  const handleToggleMinutesEdit = (agendaId: string) => {
    setAgendaItems(prev => 
      prev.map(item => 
        item.id === agendaId 
          ? { ...item, isMinutesEditing: !item.isMinutesEditing } 
          : item
      )
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewAgenda(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const handleRemoveFile = (index: number) => {
    setNewAgenda(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleAddAgenda = () => {
    if (!newAgenda.title.trim()) {
      alert('Agenda 제목을 입력해주세요.');
      return;
    }

    if (isEditing && editingAgendaId) {
      // 기존 agenda 수정
      setAgendaItems(prev => prev.map(item => 
        item.id === editingAgendaId 
          ? { ...item, ...newAgenda }
          : item
      ));
      
      // 회의록 항목도 업데이트
      setMeetingRecords(prev => prev.map(record => 
        record.agendaName === newAgenda.title 
          ? { ...record, agendaName: newAgenda.title }
          : record
      ));
      
      setIsEditing(false);
      setEditingAgendaId(null);
    } else {
      // 새로운 agenda 추가
      const agendaItem: AgendaItem = {
        id: Date.now().toString(),
        ...newAgenda,
        isMinutesEditing: false // 기본적으로 읽기 모드로 시작
      };
      setAgendaItems(prev => [...prev, agendaItem]);
      
      // 새로운 회의록 항목도 자동 생성
      const newRecord: MeetingRecordItem = {
        id: Date.now().toString() + Math.random(),
        agendaName: newAgenda.title,
        discussion: '',
        type: 'comment',
        department: '',
        isEditable: true,
        aiSummary: `${newAgenda.title}에 대한 논의 내용을 분석한 결과:\n• 주요 논의 사항: ${newAgenda.content || '내용 없음'}\n• 결정 사항: 향후 추진 방안 검토\n• 후속 조치: 관련 부서 협의 필요`
      };
      
      setMeetingRecords(prev => [...prev, newRecord]);
    }

    setNewAgenda({
      title: '',
      duration: '',
      presenter: '',
      content: '',
      files: []
    });
    setShowAgendaModal(false);
  };

  const handleEditAgenda = (agenda: AgendaItem) => {
    setNewAgenda({
      title: agenda.title,
      duration: agenda.duration,
      presenter: agenda.presenter,
      content: agenda.content,
      files: agenda.files
    });
    setEditingAgendaId(agenda.id);
    setIsEditing(true);
    setShowAgendaModal(true);
  };

  const handleRemoveAgenda = (id: string) => {
    // 삭제할 Agenda 항목 찾기
    const agendaToRemove = agendaItems.find(item => item.id === id);
    
    // Agenda 항목 삭제
    setAgendaItems(prev => prev.filter(item => item.id !== id));
    
    // 해당 회의록 항목도 삭제
    if (agendaToRemove) {
      setMeetingRecords(prev => prev.filter(record => record.agendaName !== agendaToRemove.title));
    }
  };

  const handleCancelEdit = () => {
    setNewAgenda({ title: '', duration: '', presenter: '', content: '', files: [] });
    setIsEditing(false);
    setEditingAgendaId(null);
    setShowAgendaModal(false);
  };

  // 회의록 관련 함수들
  const handleAnalyzeAllAgendas = async () => {
    setIsAnalyzing(true);
    try {
      // AI 분석 로직 (실제 구현에서는 OpenAI API 등을 사용)
      const mockResults: {[key: string]: AIAnalysisResult} = {};
      
      agendaItems.forEach((agenda) => {
        const scriptContent = meetingScripts[agenda.id] || '';
        
        if (!scriptContent.trim()) {
          // 스크립트 내용이 없는 경우
          mockResults[agenda.id] = {
            summary: `${agenda.title}에 대한 실시간 회의 스크립트가 없습니다.\n회의 진행 중 실시간 녹음 기능을 활성화하여 스크립트를 생성해주세요.`,
            keyPoints: ['실시간 스크립트 없음'],
            actionItems: ['실시간 녹음 기능 활성화 필요'],
            sentiment: 'neutral'
          };
        } else {
          // 스크립트 내용이 있는 경우 AI 분석 수행
          const aiSummary = `${agenda.title}에 대한 실시간 회의 스크립트 분석 결과:\n\n• 주요 논의 사항: ${scriptContent.substring(0, 200)}${scriptContent.length > 200 ? '...' : ''}\n• 결정 사항: 회의 내용을 바탕으로 한 결정 사항\n• 후속 조치: 관련 부서 협의 및 추진 방안 검토`;
          
          mockResults[agenda.id] = {
            summary: aiSummary,
            keyPoints: [
              `${agenda.title}의 주요 논의 사항`,
              '실시간 스크립트 기반 분석',
              '결정 사항 및 후속 조치'
            ],
            actionItems: [
              '관련 부서 협의 진행',
              '추진 방안 구체화',
              '스크립트 기반 회의록 정리'
            ],
            sentiment: 'positive'
          };
        }
      });
      
      setAnalysisResults(mockResults);
      
      // 회의록 항목들을 Agenda 항목들로부터 자동 생성
      const newRecords = agendaItems.map((agenda) => ({
        id: Date.now().toString() + Math.random(),
        agendaName: agenda.title,
        discussion: mockResults[agenda.id]?.summary || '',
        type: 'comment' as const,
        department: '',
        isEditable: true,
        aiSummary: mockResults[agenda.id]?.summary
      }));
      
      setMeetingRecords(newRecords);
      
    } catch (error) {
      console.error('AI 분석 중 오류:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAgenda = async (agendaId: string, agendaName: string) => {
    setIsAnalyzing(true);
    try {
      // 해당 Agenda 정보 찾기
      const agenda = agendaItems.find(a => a.title === agendaName);
      const scriptContent = meetingScripts[agendaId] || '';
      
      let mockResult: AIAnalysisResult;
      
      if (!scriptContent.trim()) {
        // 스크립트 내용이 없는 경우
        mockResult = {
          summary: `${agendaName}에 대한 실시간 회의 스크립트가 없습니다.\n회의 진행 중 실시간 녹음 기능을 활성화하여 스크립트를 생성해주세요.`,
          keyPoints: ['실시간 스크립트 없음'],
          actionItems: ['실시간 녹음 기능 활성화 필요'],
          sentiment: 'neutral'
        };
      } else {
        // 스크립트 내용이 있는 경우 AI 분석 수행
        const aiSummary = `${agendaName}에 대한 실시간 회의 스크립트 분석 결과:\n\n• 주요 논의 사항: ${scriptContent.substring(0, 200)}${scriptContent.length > 200 ? '...' : ''}\n• 결정 사항: 회의 내용을 바탕으로 한 결정 사항\n• 후속 조치: 관련 부서 협의 및 추진 방안 검토`;
        
        mockResult = {
          summary: aiSummary,
          keyPoints: [
            `${agendaName}의 주요 논의 사항`,
            '실시간 스크립트 기반 분석',
            '결정 사항 및 후속 조치'
          ],
          actionItems: [
            '관련 부서 협의 진행',
            '추진 방안 구체화',
            '스크립트 기반 회의록 정리'
          ],
          sentiment: 'positive'
        };
      }
      
      setAnalysisResults(prev => ({
        ...prev,
        [agendaId]: mockResult
      }));
      
      // 해당 회의록 항목 업데이트
      setMeetingRecords(prev => prev.map(record => 
        record.agendaName === agendaName 
          ? { ...record, aiSummary: mockResult.summary }
          : record
      ));
      
    } catch (error) {
      console.error('AI 분석 중 오류:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRecordTypeChange = (recordId: string, type: 'comment' | 'instruction') => {
    setMeetingRecords(prev => prev.map(record => 
      record.id === recordId ? { ...record, type } : record
    ));
  };

  const handleRecordUpdate = (recordId: string, field: string, value: string) => {
    setMeetingRecords(prev => prev.map(record => 
      record.id === recordId ? { ...record, [field]: value } : record
    ));
  };

  const handleSaveRecord = (recordId: string) => {
    setMeetingRecords(prev => prev.map(record => 
      record.id === recordId ? { ...record, isEditable: false } : record
    ));
  };

  const handleEditRecord = (recordId: string) => {
    setMeetingRecords(prev => prev.map(record => 
      record.id === recordId ? { ...record, isEditable: true } : record
    ));
  };

  const handleDeleteRecord = (recordId: string, recordName: string) => {
    setDeleteItemId(recordId);
    setDeleteItemName(recordName);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteItemId) {
      setMeetingRecords(prev => prev.filter(record => record.id !== deleteItemId));
      setDeleteItemId(null);
      setDeleteItemName('');
      setShowDeleteModal(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteItemId(null);
    setDeleteItemName('');
    setShowDeleteModal(false);
  };

  const handleAddNewAgenda = () => {
    setShowAddModal(true);
  };

  const handleConfirmAdd = () => {
    if (newAgendaName.trim()) {
      const newRecord: MeetingRecordItem = {
        id: Date.now().toString() + Math.random(),
        agendaName: newAgendaName.trim(),
        discussion: '',
        type: 'comment',
        department: '',
        isEditable: true
      };
      
      setMeetingRecords(prev => [...prev, newRecord]);
      setNewAgendaName('');
      setShowAddModal(false);
    }
  };

  const handleCancelAdd = () => {
    setNewAgendaName('');
    setShowAddModal(false);
  };

  // AI분석결과 버튼 클릭 시 실시간 스크립트 분석
  const handleToggleAnalysisResults = async () => {
    if (!showAnalysisResults) {
      // 실시간 스크립트 시뮬레이션 (실제로는 회의 녹음에서 생성됨)
      const mockScripts: {[key: string]: string} = {};
      
      agendaItems.forEach((agenda, index) => {
        if (index % 2 === 0) {
          // 짝수 인덱스는 스크립트가 있는 것으로 시뮬레이션
          mockScripts[agenda.id] = `이번 ${agenda.title}에 대해 논의한 내용입니다. 주요 논의 사항으로는 프로젝트 진행 상황과 향후 계획에 대한 검토가 있었습니다. 팀원들의 의견을 종합하여 다음 단계로의 진행 방향을 결정했습니다. 추가적인 검토가 필요한 부분에 대해서는 관련 부서와의 협의를 통해 해결해 나가기로 했습니다.`;
        }
        // 홀수 인덱스는 스크립트가 없는 것으로 시뮬레이션
      });
      
      setMeetingScripts(mockScripts);
      
      // 분석 결과를 보여줄 때 실시간 스크립트 분석 수행
      await handleAnalyzeAllAgendas();
    }
    setShowAnalysisResults(!showAnalysisResults);
  };

  const handleExport = () => {
    // 회의록 내보내기 로직
    const minutesContent = meetingRecords.map(record => 
      `${record.agendaName}\n${record.discussion}\n${record.type}\n${record.department}\n`
    ).join('\n');
    
    if (onExportMinutes) {
      onExportMinutes(formData.meetingName, minutesContent, `${formData.meetingName}_회의록.txt`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">{editingMeeting ? '회의 정보 수정' : '회의 등록 / 기록'}</h2>
          <div className="modal-actions">
            <button className="btn btn-cancel" onClick={onClose}>
              <i className="fas fa-times"></i>
              취소
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <i className="fas fa-save"></i>
              저장
            </button>
          </div>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            <i className="fas fa-info-circle"></i>
            기본 정보
          </button>
          <button 
            className={`tab-button ${activeTab === 'agenda' ? 'active' : ''}`}
            onClick={() => setActiveTab('agenda')}
          >
            <i className="fas fa-list-alt"></i>
            회의 Agenda
          </button>
          <button 
            className={`tab-button ${activeTab === 'record' ? 'active' : ''}`}
            onClick={() => setActiveTab('record')}
          >
            <i className="fas fa-file-alt"></i>
            회의록
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'basic' && (
            // 기본 정보 탭
            <div className="form-section">
              <div className="form-group">
                <label className="form-label">회의명 *</label>
                <div className="meeting-name-container">
                  <input
                    type="text"
                    className={`form-input ${errors.meetingName ? 'error' : ''}`}
                    placeholder="회의 이름을 입력하세요"
                    value={formData.meetingName}
                    onChange={(e) => handleInputChange('meetingName', e.target.value)}
                  />
                  <button 
                    className="btn btn-secondary recording-btn"
                    onClick={() => setShowRecordingModal(true)}
                    disabled={!formData.meetingName.trim()}
                  >
                    <i className="fas fa-microphone"></i>
                    실시간 회의 기록
                  </button>
                </div>
                {errors.meetingName && <p className="error-message">{errors.meetingName}</p>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">회의일자 *</label>
                  <CalendarPicker
                    value={formData.date}
                    onChange={(date) => handleInputChange('date', date)}
                    placeholder="회의 일자를 선택하세요"
                    error={!!errors.date}
                  />
                  {errors.date && <p className="error-message">{errors.date}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">시작 시간 *</label>
                  <TimePicker
                    value={formData.startTime}
                    onChange={(time) => handleInputChange('startTime', time)}
                    placeholder="시작 시간을 선택하세요"
                    error={!!errors.startTime}
                    maxTime={formData.endTime || undefined}
                  />
                  {errors.startTime && <p className="error-message">{errors.startTime}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">종료 시간 *</label>
                  <TimePicker
                    value={formData.endTime}
                    onChange={(time) => handleInputChange('endTime', time)}
                    placeholder="종료 시간을 선택하세요"
                    error={!!errors.endTime}
                    minTime={formData.startTime || undefined}
                  />
                  {errors.endTime && <p className="error-message">{errors.endTime}</p>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">장소 *</label>
                <input
                  type="text"
                  className={`form-input ${errors.location ? 'error' : ''}`}
                  placeholder="회의실 이름 또는 주소"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
                {errors.location && <p className="error-message">{errors.location}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">작성자</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="작성자 이름을 직접 입력하세요"
                  value={formData.organizer}
                  onChange={(e) => handleInputChange('organizer', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">참석자</label>
                <textarea
                  className="form-textarea"
                  placeholder="참석자 이름을 입력하세요 (쉼표로 구분)"
                  value={formData.attendees}
                  onChange={(e) => handleInputChange('attendees', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-section-title">Webex 회의 정보</div>
              
              <div className="form-group">
                <label className="form-label">Join URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.webexUrl}
                  onChange={(e) => handleInputChange('webexUrl', e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Meeting Key</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="회의 번호 또는 ID"
                    value={formData.meetingKey}
                    onChange={(e) => handleInputChange('meetingKey', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Meeting Password</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="회의 비밀번호"
                    value={formData.meetingPassword}
                    onChange={(e) => handleInputChange('meetingPassword', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agenda' && (
            // 회의 Agenda 탭
            <div className="form-section">
              <div className="agenda-header">
                <h3>회의 Agenda</h3>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAgendaModal(true)}
                >
                  <i className="fas fa-plus"></i>
                  Agenda 등록
                </button>
              </div>

              {agendaItems.length === 0 ? (
                <div className="empty-agenda">
                  <i className="fas fa-clipboard-list"></i>
                  <p>등록된 안건이 없습니다.</p>
                  <p>Agenda 등록 버튼을 클릭하여 안건을 추가해주세요.</p>
                </div>
              ) : (
                <div className="agenda-list">
                  {agendaItems.map((item, index) => (
                    <div key={item.id} className="agenda-item">
                      <div className="agenda-item-header">
                        <h4>{index + 1}. {item.title}</h4>
                        <div className="agenda-item-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleEditAgenda(item)}
                            title="수정"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveAgenda(item.id)}
                            title="삭제"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      <div className="agenda-item-content">
                        <div className="agenda-item-meta">
                          <span className="agenda-duration">
                            <i className="fas fa-clock"></i>
                            {item.duration || '시간 미정'}
                          </span>
                          <span className="agenda-presenter">
                            <i className="fas fa-user"></i>
                            {item.presenter || '보고자 미정'}
                          </span>
                        </div>
                        <p>{item.content}</p>
                        {item.files.length > 0 && (
                          <div className="agenda-files">
                            <h5>첨부 파일:</h5>
                            <ul>
                              {item.files.map((file, fileIndex) => (
                                <li key={fileIndex}>
                                  <i className="fas fa-file"></i>
                                  {file.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* 회의록 작성 필드 */}
                        <div className="agenda-minutes-section">
                          <div className="agenda-minutes-header">
                            <h5>
                              <i className="fas fa-edit"></i>
                              회의록 작성
                            </h5>
                            <div className="agenda-minutes-actions">
                              <button
                                className={`btn btn-sm ${item.isMinutesEditing ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => handleToggleMinutesEdit(item.id)}
                                title={item.isMinutesEditing ? '읽기 모드로 전환' : '편집 모드로 전환'}
                              >
                                <i className={`fas ${item.isMinutesEditing ? 'fa-eye' : 'fa-edit'}`}></i>
                                {item.isMinutesEditing ? '읽기모드' : '편집모드'}
                              </button>
                            </div>
                          </div>
                          {item.isMinutesEditing ? (
                            <textarea
                              className="agenda-minutes-textarea"
                              placeholder="이 안건에 대한 회의 내용을 작성해주세요..."
                              value={item.minutes || ''}
                              onChange={(e) => handleAgendaMinutesChange(item.id, e.target.value)}
                              rows={4}
                            />
                          ) : (
                            <div className="agenda-minutes-display">
                              {item.minutes ? (
                                <div className="minutes-content">
                                  {item.minutes.split('\n').map((line, index) => (
                                    <p key={index}>{line || '\u00A0'}</p>
                                  ))}
                                </div>
                              ) : (
                                <div className="minutes-empty">
                                  <i className="fas fa-file-alt"></i>
                                  <p>작성된 회의록이 없습니다.</p>
                                  <small>편집 모드로 전환하여 회의록을 작성해주세요.</small>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'record' && (
            // 회의록 탭
            <div className="record-section">
              <div className="meeting-info">
                <h3>회의 기본 정보</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>회의 제목:</label>
                    <span>{formData.meetingName}</span>
                  </div>
                  <div className="info-item">
                    <label>일시:</label>
                    <span>{formData.date ? `${formData.date} ${formData.startTime}~${formData.endTime}` : '날짜/시간 미정'}</span>
                  </div>
                  <div className="info-item">
                    <label>장소:</label>
                    <span>{formData.location || '장소 미정'}</span>
                  </div>
                  <div className="info-item">
                    <label>참석자:</label>
                    <span>{formData.attendees || '참석자 미정'}</span>
                  </div>
                </div>
              </div>

              {/* AI 분석 섹션 */}
              <div className="ai-analysis-section">
                <div className="ai-analysis-header">
                  <h3>
                    <i className="fas fa-brain"></i>
                    AI 분석
                  </h3>
                  <div className="ai-analysis-actions">
                    {Object.keys(analysisResults).length > 0 ? (
                      <button 
                        className={`btn ${showAnalysisResults ? 'btn-secondary' : 'btn-outline-secondary'}`}
                        onClick={handleToggleAnalysisResults}
                        title={showAnalysisResults ? 'AI 분석 결과 숨기기' : 'AI 분석 결과 보기'}
                      >
                        <i className={`fas ${showAnalysisResults ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        {showAnalysisResults ? 'AI분석결과 숨기기' : 'AI분석결과 보기'}
                      </button>
                    ) : (
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={handleToggleAnalysisResults}
                        title="AI 분석 결과 토글"
                      >
                        <i className="fas fa-brain"></i>
                        AI분석결과
                      </button>
                    )}
                  </div>
                </div>
                
                {/* AI 분석 결과 표시 */}
                {showAnalysisResults && (
                  <div className="ai-analysis-results">
                    {Object.keys(analysisResults).length > 0 ? (
                      agendaItems.map((agenda) => {
                        const result = analysisResults[agenda.id];
                        const scriptContent = meetingScripts[agenda.id] || '';
                        const hasScript = scriptContent.trim().length > 0;
                        
                        if (!result) return null;
                        
                        return (
                          <div key={agenda.id} className="ai-analysis-item">
                            <div className="analysis-header">
                              <h4>{agenda.title}</h4>
                              <div className="analysis-status">
                                <span className={`script-status ${hasScript ? 'has-script' : 'no-script'}`}>
                                  <i className={`fas ${hasScript ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
                                  {hasScript ? '실시간 스크립트 있음' : '실시간 스크립트 없음'}
                                </span>
                                <span className={`sentiment-badge ${result.sentiment}`}>
                                  {result.sentiment === 'positive' ? '긍정' : 
                                   result.sentiment === 'negative' ? '부정' : '중립'}
                                </span>
                              </div>
                            </div>
                            <div className="analysis-content">
                              <div className="summary-section">
                                <h5>핵심 요약</h5>
                                <p>{result.summary}</p>
                              </div>
                              {result.keyPoints.length > 0 && (
                                <div className="key-points-section">
                                  <h5>주요 포인트</h5>
                                  <ul>
                                    {result.keyPoints.map((point, index) => (
                                      <li key={index}>{point}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {result.actionItems.length > 0 && (
                                <div className="action-items-section">
                                  <h5>액션 아이템</h5>
                                  <ul>
                                    {result.actionItems.map((item, index) => (
                                      <li key={index}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="ai-analysis-empty">
                        <div className="empty-state">
                          <i className="fas fa-brain"></i>
                          <h4>AI 분석 결과가 없습니다</h4>
                          <p>AI분석결과 버튼을 클릭하여 실시간 회의 스크립트를 분석해보세요.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="record-table-container">
                <div className="table-header">
                  <h3>회의록 작성</h3>
                </div>
                
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>Agenda명</th>
                      <th>논의 및 결정사항</th>
                      <th>구분</th>
                      <th>담당 부서</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetingRecords.map((record) => (
                      <tr key={record.id} className={record.type === 'instruction' ? 'instruction-row' : ''}>
                        <td>{record.agendaName}</td>
                                                 <td>
                           <div className="discussion-content">
                             {record.aiSummary ? (
                               <textarea
                                 className={`discussion-textarea ${!record.isEditable ? 'disabled' : ''}`}
                                 value={record.aiSummary}
                                 onChange={(e) => handleRecordUpdate(record.id, 'aiSummary', e.target.value)}
                                 placeholder="논의 및 결정사항을 입력하세요"
                                 disabled={!record.isEditable}
                                 rows={3}
                               />
                             ) : (
                               <div className="ai-analysis-placeholder">
                                 <p>녹음된 스크립트가 없거나 AI 분석이 필요합니다.</p>
                                 <button 
                                   className="btn btn-sm btn-outline-info"
                                   onClick={() => {
                                     const agenda = agendaItems.find(a => a.title === record.agendaName);
                                     if (agenda) {
                                       handleAnalyzeAgenda(agenda.id, record.agendaName);
                                     }
                                   }}
                                   disabled={isAnalyzing}
                                   title="AI 분석 실행"
                                 >
                                   <i className="fas fa-brain"></i>
                                   AI 분석 실행
                                 </button>
                               </div>
                             )}
                           </div>
                         </td>
                        <td>
                                                     <select
                             className={`type-select ${!record.isEditable ? 'disabled' : ''}`}
                             value={record.type}
                             onChange={(e) => handleRecordTypeChange(record.id, e.target.value as 'comment' | 'instruction')}
                             disabled={!record.isEditable}
                           >
                             <option value="comment">comment</option>
                             <option value="instruction">지시사항</option>
                           </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className={`department-input ${!record.isEditable ? 'disabled' : ''}`}
                            value={record.department}
                            onChange={(e) => handleRecordUpdate(record.id, 'department', e.target.value)}
                            placeholder="담당 부서"
                            disabled={!record.isEditable}
                          />
                        </td>
                        <td>
                          <div className="action-buttons">
                            {record.isEditable ? (
                              <button 
                                className="btn btn-success btn-sm"
                                onClick={() => handleSaveRecord(record.id)}
                                title="저장"
                              >
                                <i className="fas fa-save"></i>
                              </button>
                            ) : (
                              <button 
                                className="btn btn-warning btn-sm"
                                onClick={() => handleEditRecord(record.id)}
                                title="수정"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                            )}
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteRecord(record.id, record.agendaName)}
                              title="삭제"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 새 항목 추가 버튼과 내보내기 버튼 */}
              <div className="add-agenda-section">
                <div className="agenda-actions">
                  <button className="btn btn-primary add-agenda-btn" onClick={handleAddNewAgenda}>
                    <i className="fas fa-plus"></i>
                    Agenda 항목 추가
                  </button>
                  <button className="btn btn-secondary export-btn" onClick={handleExport}>
                    <i className="fas fa-download"></i>
                    내보내기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 실시간 회의 기록 모달 */}
      <MeetingRecordingModal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        meetingName={formData.meetingName}
        agendaItems={agendaItems}
        existingScript={editingMeeting?.meetingScript}
      />

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-container delete-modal">
            <div className="modal-header">
              <h3>삭제 확인</h3>
            </div>
            <div className="modal-content">
              <div className="delete-warning">
                <i className="fas fa-exclamation-triangle"></i>
                <p>정말로 <strong>"{deleteItemName}"</strong> 항목을 삭제하시겠습니까?</p>
                <p className="delete-note">이 작업은 되돌릴 수 없습니다.</p>
              </div>
              <div className="modal-actions">
                <button className="btn btn-danger" onClick={handleConfirmDelete}>
                  <i className="fas fa-trash"></i>
                  삭제
                </button>
                <button className="btn btn-cancel" onClick={handleCancelDelete}>
                  <i className="fas fa-times"></i>
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agenda 등록/수정 모달 */}
      {showAgendaModal && (
        <div className="modal-overlay">
          <div className="modal-container agenda-modal">
            <div className="modal-header">
              <h3>{isEditing ? 'Agenda 수정' : 'Agenda 등록'}</h3>
              <div className="modal-actions">
                <button 
                  className="btn btn-primary" 
                  onClick={handleAddAgenda}
                  disabled={!newAgenda.title.trim()}
                >
                  <i className="fas fa-save"></i>
                  {isEditing ? '수정' : '등록'}
                </button>
                <button className="btn btn-cancel" onClick={handleCancelEdit}>
                  <i className="fas fa-times"></i>
                  취소
                </button>
              </div>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Agenda 제목 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Agenda 제목을 입력하세요"
                  value={newAgenda.title}
                  onChange={(e) => handleAgendaInputChange('title', e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">소요 시간</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="예: 30분, 1시간"
                    value={newAgenda.duration}
                    onChange={(e) => handleAgendaInputChange('duration', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">보고자</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="보고자 이름을 입력하세요"
                    value={newAgenda.presenter}
                    onChange={(e) => handleAgendaInputChange('presenter', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Agenda 내용 및 관련 전문 용어</label>
                <textarea
                  className="form-textarea"
                  placeholder="Agenda에 대한 간략한 내용과 관련 전문 용어를 입력하세요"
                  value={newAgenda.content}
                  onChange={(e) => handleAgendaInputChange('content', e.target.value)}
                  rows={6}
                />
              </div>

              <div className="form-group">
                <label className="form-label">파일 첨부</label>
                <div className="file-upload-section">
                  <div className="file-upload-container">
                    <input
                      type="file"
                      multiple
                      className="file-input"
                      onChange={handleFileUpload}
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="file-upload-label">
                      <i className="fas fa-cloud-upload-alt"></i>
                      파일 선택
                    </label>
                  </div>
                  
                  {newAgenda.files.length > 0 && (
                    <div className="uploaded-files">
                      <h5>업로드된 파일:</h5>
                      <ul>
                        {newAgenda.files.map((file, index) => (
                          <li key={index}>
                            <i className="fas fa-file"></i>
                            {file.name}
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemoveFile(index)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>


            </div>
          </div>
        </div>
      )}

      {/* 새 항목 추가 모달 */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container add-modal">
            <div className="modal-header">
              <h3>Agenda 항목 추가</h3>
            </div>
            <div className="modal-content">
              <div className="add-form">
                <div className="form-group">
                  <label htmlFor="newAgendaName">Agenda명:</label>
                  <input
                    type="text"
                    id="newAgendaName"
                    className="form-input"
                    value={newAgendaName}
                    onChange={(e) => setNewAgendaName(e.target.value)}
                    placeholder="새로운 agenda 이름을 입력하세요"
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-primary" 
                  onClick={handleConfirmAdd}
                  disabled={!newAgendaName.trim()}
                >
                  <i className="fas fa-plus"></i>
                  추가
                </button>
                <button className="btn btn-cancel" onClick={handleCancelAdd}>
                  <i className="fas fa-times"></i>
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRegistrationModal; 