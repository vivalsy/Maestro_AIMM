import React, { useState, useEffect } from 'react';
import { Meeting } from '../types/Meeting';
import './EmailDistributionModal.css';

interface EmailDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  onSendEmail: (meeting: Meeting, emailData: EmailData) => void;
}

export interface EmailData {
  recipients: string[];
  subject: string;
  message: string;
  includeMinutes: boolean;
  includeAttachments: boolean;
}

const EmailDistributionModal: React.FC<EmailDistributionModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onSendEmail
}) => {
  const [emailData, setEmailData] = useState<EmailData>({
    recipients: [],
    subject: `[회의록] ${meeting?.name || ''}`,
    message: '',
    includeMinutes: true,
    includeAttachments: false
  });

  const [recipientInput, setRecipientInput] = useState('');

  // 모달이 열릴 때마다 이메일 제목을 자동으로 설정
  useEffect(() => {
    if (isOpen && meeting) {
      setEmailData(prev => ({
        ...prev,
        subject: `[회의록] ${meeting.name}`
      }));
    }
  }, [isOpen, meeting]);

  if (!isOpen || !meeting) return null;

  const handleAddRecipient = () => {
    if (recipientInput.trim() && !emailData.recipients.includes(recipientInput.trim())) {
      setEmailData(prev => ({
        ...prev,
        recipients: [...prev.recipients, recipientInput.trim()]
      }));
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setEmailData(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
  };

  const handleSendEmail = () => {
    if (emailData.recipients.length === 0) {
      window.alert('수신자를 추가해주세요.');
      return;
    }
    if (!emailData.subject.trim()) {
      window.alert('제목을 입력해주세요.');
      return;
    }

    onSendEmail(meeting, emailData);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddRecipient();
    }
  };

  return (
    <div className="email-modal-overlay">
      <div className="email-modal">
        <div className="email-modal-header">
          <h2>회의록 이메일 배포</h2>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="email-modal-content">
          <div className="meeting-info">
            <h3>회의 정보</h3>
            <div className="meeting-details">
              <p><strong>회의명:</strong> {meeting.name}</p>
              <p><strong>일시:</strong> {meeting.date} {meeting.time}</p>
              <p><strong>장소:</strong> {meeting.location}</p>
              <p><strong>주관자:</strong> {meeting.organizer.name}</p>
              {meeting.minutesFile && (
                <p><strong>회의록 파일:</strong> {meeting.minutesFile}</p>
              )}
            </div>
          </div>

          <div className="email-form">
            <div className="form-group">
              <label>수신자 이메일</label>
              <div className="recipient-input">
                <input
                  type="email"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="이메일 주소를 입력하고 Enter를 누르세요"
                />
                <button onClick={handleAddRecipient} className="add-recipient-btn">
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              {emailData.recipients.length > 0 && (
                <div className="recipients-list">
                  {emailData.recipients.map((email, index) => (
                    <span key={index} className="recipient-tag">
                      {email}
                      <button onClick={() => handleRemoveRecipient(email)}>
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

                         <div className="form-group">
               <label>이메일 제목</label>
               <input
                 type="text"
                 value={emailData.subject}
                 onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                 placeholder="이메일 제목을 입력하세요"
               />
             </div>

            <div className="form-group">
              <label>이메일 내용</label>
              <textarea
                value={emailData.message}
                onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="안녕하세요,

첨부된 회의록을 확인해주시기 바랍니다.

감사합니다."
                rows={6}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={emailData.includeMinutes}
                  onChange={(e) => setEmailData(prev => ({ ...prev, includeMinutes: e.target.checked }))}
                />
                회의록 파일 첨부
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={emailData.includeAttachments}
                  onChange={(e) => setEmailData(prev => ({ ...prev, includeAttachments: e.target.checked }))}
                />
                관련 자료 첨부 (있는 경우)
              </label>
            </div>
          </div>
        </div>

        <div className="email-modal-footer">
          <button className="cancel-button" onClick={onClose}>
            취소
          </button>
          <button className="send-button" onClick={handleSendEmail}>
            <i className="fas fa-paper-plane"></i>
            이메일 발송
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailDistributionModal; 