import React, { useState, useEffect } from 'react';
import './MeetingRegistrationModal.css';
import MeetingRecordingModal from './MeetingRecordingModal';
import { Meeting } from '../types/Meeting';

interface MeetingRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meetingData: any) => void;
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
}

const MeetingRegistrationModal: React.FC<MeetingRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMeeting,
  onExportMinutes
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'agenda'>('basic');
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [newAgenda, setNewAgenda] = useState({
    title: '',
    duration: '',
    presenter: '',
    content: '',
    files: [] as File[]
  });
  
  const [formData, setFormData] = useState({
    // 기본 정보
    meetingName: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    organizer: '',
    attendees: '',
    
    // Webex 정보
    webexUrl: 'https://company.webex.com/meet/...',
    meetingKey: '',
    meetingPassword: '',
    
    // 안건 정보
    agendaItems: [] as AgendaItem[]
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // 모달이 열릴 때 폼 초기화 또는 편집 데이터 로드
  useEffect(() => {
    if (isOpen) {
      if (editingMeeting) {
        // 편집 모드: 기존 데이터로 폼 채우기
        const [startTime, endTime] = editingMeeting.time.split('~');
        setFormData({
          meetingName: editingMeeting.name,
          date: editingMeeting.date,
          startTime: startTime,
          endTime: endTime,
          location: editingMeeting.location,
          organizer: editingMeeting.organizer.name,
          attendees: editingMeeting.attendees.join(', '),
          webexUrl: editingMeeting.webexUrl || 'https://company.webex.com/meet/...',
          meetingKey: '',
          meetingPassword: '',
          agendaItems: editingMeeting.agendaItems || []
        });
        
        // 기존 안건 목록 로드
        setAgendaItems(editingMeeting.agendaItems || []);
      } else {
        // 새 회의 등록 모드: 폼 초기화
        setFormData({
          meetingName: '',
          date: '',
          startTime: '',
          endTime: '',
          location: '',
          organizer: '',
          attendees: '',
          webexUrl: 'https://company.webex.com/meet/...',
          meetingKey: '',
          meetingPassword: '',
          agendaItems: []
        });
        
        // 안건 목록 초기화
        setAgendaItems([]);
      }
      
      // 에러 초기화
      setErrors({});
      
      // 새 안건 폼 초기화
      setNewAgenda({
        title: '',
        duration: '',
        presenter: '',
        content: '',
        files: []
      });
      
      // 탭을 기본 정보로 설정
      setActiveTab('basic');
      
      // 편집 상태 초기화
      setIsEditing(false);
      setEditingAgendaId(null);
      setShowAgendaModal(false);
      setShowRecordingModal(false);
    }
  }, [isOpen, editingMeeting]);

  // 필수 항목 검증
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
    
    // 시작 시간과 종료 시간 비교
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = '종료 시간은 시작 시간보다 늦어야 합니다.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 에러가 있으면 해당 필드의 에러를 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }
    
    // WebEx URL이 기본값인지 확인
    const webexUrl = formData.webexUrl === 'https://company.webex.com/meet/...' ? '' : formData.webexUrl;
    
    const finalFormData = {
      ...formData,
      webexUrl: webexUrl,
      agendaItems: agendaItems
    };
    onSave(finalFormData);
    onClose();
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange('date', e.target.value);
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    handleInputChange(field, value);
  };

  const handleAgendaInputChange = (field: string, value: string) => {
    setNewAgenda(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewAgenda(prev => ({
        ...prev,
        files: [...prev.files, ...filesArray]
      }));
    }
  };

  const handleRemoveFile = (index: number) => {
    setNewAgenda(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleAddAgenda = () => {
    if (newAgenda.title.trim()) {
      if (isEditing && editingAgendaId) {
        // 기존 agenda 수정
        setAgendaItems(prev => prev.map(item => 
          item.id === editingAgendaId 
            ? { ...item, ...newAgenda }
            : item
        ));
        setIsEditing(false);
        setEditingAgendaId(null);
      } else {
        // 새로운 agenda 추가
        const newAgendaItem: AgendaItem = {
          id: Date.now().toString(),
          title: newAgenda.title,
          duration: newAgenda.duration,
          presenter: newAgenda.presenter,
          content: newAgenda.content,
          files: [...newAgenda.files]
        };
        setAgendaItems(prev => [...prev, newAgendaItem]);
      }
      setNewAgenda({ title: '', duration: '', presenter: '', content: '', files: [] });
      setShowAgendaModal(false);
    }
  };

  const handleEditAgenda = (agenda: AgendaItem) => {
    setNewAgenda({
      title: agenda.title,
      duration: agenda.duration,
      presenter: agenda.presenter,
      content: agenda.content,
      files: [...agenda.files]
    });
    setIsEditing(true);
    setEditingAgendaId(agenda.id);
    setShowAgendaModal(true);
  };

  const handleRemoveAgenda = (id: string) => {
    setAgendaItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCancelEdit = () => {
    setNewAgenda({ title: '', duration: '', presenter: '', content: '', files: [] });
    setIsEditing(false);
    setEditingAgendaId(null);
    setShowAgendaModal(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">
            {editingMeeting ? '회의 정보 수정' : '회의 등록 / 기록'}
          </h2>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={handleSave}>
              <i className="fas fa-save"></i>
              {editingMeeting ? '수정' : '저장'}
            </button>
            <button className="btn btn-cancel" onClick={onClose}>
              <i className="fas fa-times"></i>
              취소
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
        </div>

        <div className="modal-content">
          {activeTab === 'basic' ? (
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
                  <div className="input-with-icon">
                    <input
                      type="date"
                      className={`form-input ${errors.date ? 'error' : ''}`}
                      value={formData.date}
                      onChange={handleDateChange}
                    />
                    <i className="fas fa-calendar input-icon"></i>
                  </div>
                  {errors.date && <p className="error-message">{errors.date}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">시작 시간 *</label>
                  <input
                    type="time"
                    className={`form-input ${errors.startTime ? 'error' : ''}`}
                    value={formData.startTime}
                    onChange={(e) => handleTimeChange('startTime', e.target.value)}
                    step="900"
                  />
                  {errors.startTime && <p className="error-message">{errors.startTime}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">종료 시간 *</label>
                  <input
                    type="time"
                    className={`form-input ${errors.endTime ? 'error' : ''}`}
                    value={formData.endTime}
                    onChange={(e) => handleTimeChange('endTime', e.target.value)}
                    step="900"
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
                <label className="form-label">주관자</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="주관자 이름을 직접 입력하세요"
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
          ) : (
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
                {errors.title && <p className="error-message">{errors.title}</p>}
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

      {/* 실시간 회의 기록 모달 */}
      <MeetingRecordingModal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        meetingName={formData.meetingName}
        agendaItems={agendaItems}
        existingScript={editingMeeting?.meetingScript}
        existingMinutes={editingMeeting?.minutesContent}
        meetingInfo={{
          date: formData.date,
          time: `${formData.startTime}~${formData.endTime}`,
          location: formData.location,
          organizer: formData.organizer,
          attendees: formData.attendees ? formData.attendees.split(',').map((name: string) => name.trim()) : []
        }}
        onExportMinutes={onExportMinutes}
      />
    </div>
  );
};

export default MeetingRegistrationModal; 