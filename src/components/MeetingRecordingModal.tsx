import React, { useState, useEffect } from 'react';
import './MeetingRecordingModal.css';

interface MeetingRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingName: string;
  agendaItems: any[];
  existingScript?: string; // 기존 회의 스크립트
}

interface ScriptItem {
  id: string;
  speaker: string;
  content: string;
  timestamp: string;
  confidence?: number;
  isFinal?: boolean;
  voiceSignature?: string; // 음성 특징을 위한 시그니처
  speakerId?: string; // AI가 구분한 화자 ID
}

const MeetingRecordingModal: React.FC<MeetingRecordingModalProps> = ({
  isOpen,
  onClose,
  meetingName,
  agendaItems,
  existingScript
}) => {
  const [currentAgendaIndex, setCurrentAgendaIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // 일시 정지 상태 추가
  const [recordingTime, setRecordingTime] = useState(0); // 녹음 시간 (초)
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null); // 타이머
  const [audioLevel, setAudioLevel] = useState(0); // 오디오 레벨 (0-100)
  const [scripts, setScripts] = useState<{ [key: string]: ScriptItem[] }>({});
  const [showScriptModal, setShowScriptModal] = useState(false); // 스크립트 모달
  const [currentScriptAgenda, setCurrentScriptAgenda] = useState<any>(null); // 현재 스크립트 모달의 아젠다
  
  // 음성 인식 관련 상태
  const [recognition, setRecognition] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  
  // AI 화자 구분 관련 상태
  const [speakerProfiles, setSpeakerProfiles] = useState<{[key: string]: any}>({});
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
  const [voiceAnalysis, setVoiceAnalysis] = useState<any>(null);

  // 음성 인식 초기화
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'ko-KR';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
        console.log('음성 인식 시작');
      };
      
      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setCurrentTranscript(prev => prev + finalTranscript);
          
          // 현재 아젠다에 스크립트 추가
          const currentAgenda = agendaItems[currentAgendaIndex];
          if (currentAgenda) {
            const newScriptItem: ScriptItem = {
              id: Date.now().toString(),
              speaker: '화자',
              content: finalTranscript,
              timestamp: new Date().toLocaleTimeString(),
              isFinal: true
            };
            
            setScripts(prev => ({
              ...prev,
              [currentAgenda.id]: [...(prev[currentAgenda.id] || []), newScriptItem]
            }));
          }
        }
        
        setInterimTranscript(interimTranscript);
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('음성 인식 오류:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
        console.log('음성 인식 종료');
      };
      
      setRecognition(recognitionInstance);
    }
  }, [currentAgendaIndex, agendaItems]);

  // 기존 스크립트가 있으면 로드
  useEffect(() => {
    if (existingScript) {
      setScripts(prev => ({
        ...prev,
        [agendaItems[0]?.id]: [{
          id: Date.now().toString(),
          speaker: '시스템',
          content: existingScript,
          timestamp: new Date().toLocaleTimeString(),
          isFinal: true
        }]
      }));
    }
  }, [existingScript, agendaItems]);

  // 녹음 타이머
  useEffect(() => {
    if (isRecording && !isPaused) {
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);
      
      return () => clearInterval(timer);
    } else if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
  }, [isRecording, isPaused]);

  const handleStartRecording = (agendaIndex: number) => {
    setCurrentAgendaIndex(agendaIndex);
    setIsRecording(true);
    setRecordingTime(0);
    setIsPaused(false);
    
    // 음성 인식 시작
    if (recognition) {
      recognition.start();
    }
    
    // 오디오 레벨 시뮬레이션
    const audioLevelInterval = setInterval(() => {
      setAudioLevel(Math.floor(Math.random() * 100));
    }, 100);
    
    return () => clearInterval(audioLevelInterval);
  };

  const handlePauseRecording = () => {
    setIsPaused(true);
    if (recognition) {
      recognition.stop();
    }
  };

  const handleResumeRecording = () => {
    setIsPaused(false);
    if (recognition) {
      recognition.start();
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    if (recognition) {
      recognition.stop();
    }
    setAudioLevel(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextAgenda = () => {
    if (currentAgendaIndex < agendaItems.length - 1) {
      setCurrentAgendaIndex(prev => prev + 1);
    }
  };

  const handlePreviousAgenda = () => {
    if (currentAgendaIndex > 0) {
      setCurrentAgendaIndex(prev => prev - 1);
    }
  };

  const handleOpenScriptModal = (agenda: any, agendaIndex: number) => {
    setCurrentScriptAgenda(agenda);
    setShowScriptModal(true);
    handleStartRecording(agendaIndex);
  };

  const handleCloseScriptModal = () => {
    setShowScriptModal(false);
    setCurrentScriptAgenda(null);
    handleStopRecording();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>실시간 회의 기록 - {meetingName}</h3>
          <div className="modal-actions">
            <button className="btn btn-cancel" onClick={onClose}>
              <i className="fas fa-times"></i>
              닫기
            </button>
          </div>
        </div>

        <div className="modal-tabs">
          <button 
            className="tab-button active"
            disabled
          >
            <i className="fas fa-microphone"></i>
            회의 내용 스크립트
          </button>
        </div>

        <div className="modal-content">
          <div className="script-section">
            {/* AI 감지된 화자 목록 표시 */}
            {isRecording && detectedSpeakers.length > 0 && (
              <div className="detected-speakers">
                <span className="detected-label">실시간 화자 구분:</span>
                <div className="speaker-tags">
                  {detectedSpeakers.map((speaker, index) => (
                    <span key={index} className="speaker-tag">
                      {speaker}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {interimTranscript && (
              <div className="interim-transcript">
                <span className="interim-label">임시 인식:</span>
                <span className="interim-text">{interimTranscript}</span>
              </div>
            )}
            
            <div className="agenda-script-container">
              {agendaItems.length === 0 ? (
                <div className="empty-agenda">
                  <i className="fas fa-clipboard-list"></i>
                  <p>등록된 안건이 없습니다.</p>
                  <p>회의 등록에서 Agenda를 먼저 등록해주세요.</p>
                </div>
              ) : (
                <div className="agenda-script-list">
                  {agendaItems.map((agenda, index) => (
                    <div key={agenda.id} className="agenda-script-item">
                      <div className="agenda-script-header">
                        <div className="agenda-info">
                          <h4>{index + 1}. {agenda.title}</h4>
                          <div className="agenda-meta">
                            <span className="agenda-duration">
                              <i className="fas fa-clock"></i>
                              {agenda.duration || '시간 미정'}
                            </span>
                            <span className="agenda-presenter">
                              <i className="fas fa-user"></i>
                              {agenda.presenter || '보고자 미정'}
                            </span>
                          </div>
                        </div>
                        <div className="agenda-status">
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenScriptModal(agenda, index)}
                          >
                            <i className="fas fa-microphone"></i>
                            녹음
                          </button>
                        </div>
                      </div>
                      
                      <div className="script-content">
                        {scripts[agenda.id] && scripts[agenda.id].length > 0 ? (
                          <div className="script-list">
                            {scripts[agenda.id].map((script) => (
                              <div key={script.id} className="script-item">
                                <div className="speaker-info">
                                  <div className="speaker-avatar">
                                    <i className="fas fa-user"></i>
                                  </div>
                                  <span className="speaker-name">{script.speaker}</span>
                                  <span className="timestamp">{script.timestamp}</span>
                                </div>
                                <div className="script-text">
                                  {script.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-script">
                            <i className="fas fa-microphone-slash"></i>
                            <p>녹음을 시작하면 실시간 스크립트가 여기에 표시됩니다.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 스크립트 녹음 모달 */}
      {showScriptModal && currentScriptAgenda && (
        <div className="modal-overlay">
          <div className="modal-container script-modal">
            <div className="modal-header">
              <h3>스크립트 녹음 - {currentScriptAgenda.title}</h3>
              <div className="modal-actions">
                <button className="btn btn-cancel" onClick={handleCloseScriptModal}>
                  <i className="fas fa-times"></i>
                  닫기
                </button>
              </div>
            </div>
            
            <div className="modal-content">
              <div className="script-modal-content">
                {/* AI 감지된 화자 목록 표시 */}
                {isRecording && detectedSpeakers.length > 0 && (
                  <div className="detected-speakers">
                    <span className="detected-label">실시간 화자 구분:</span>
                    <div className="speaker-tags">
                      {detectedSpeakers.map((speaker, index) => (
                        <span key={index} className="speaker-tag">
                          {speaker}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {interimTranscript && (
                  <div className="interim-transcript">
                    <span className="interim-label">임시 인식:</span>
                    <span className="interim-text">{interimTranscript}</span>
                  </div>
                )}
                
                {/* 녹음 컨트롤 */}
                <div className="recording-controls">
                  <div className="recording-status">
                    <div className="recording-indicator">
                      <div className={`recording-dot ${isRecording ? 'active' : ''}`}></div>
                      <span className="recording-text">
                        {isRecording ? (isPaused ? '일시정지' : '녹음 중') : '대기 중'}
                      </span>
                    </div>
                    <div className="recording-time">
                      {formatTime(recordingTime)}
                    </div>
                  </div>
                  
                  <div className="recording-buttons">
                    {!isRecording ? (
                      <button 
                        className="btn btn-primary recording-btn"
                        onClick={() => handleStartRecording(currentAgendaIndex)}
                      >
                        <i className="fas fa-microphone"></i>
                        녹음 시작
                      </button>
                    ) : (
                      <>
                        {isPaused ? (
                          <button 
                            className="btn btn-success recording-btn"
                            onClick={handleResumeRecording}
                          >
                            <i className="fas fa-play"></i>
                            재개
                          </button>
                        ) : (
                          <button 
                            className="btn btn-warning recording-btn"
                            onClick={handlePauseRecording}
                          >
                            <i className="fas fa-pause"></i>
                            일시정지
                          </button>
                        )}
                        <button 
                          className="btn btn-danger recording-btn"
                          onClick={handleStopRecording}
                        >
                          <i className="fas fa-stop"></i>
                          녹음 종료
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* 오디오 레벨 표시 */}
                  {isRecording && (
                    <div className="audio-level">
                      <div className="audio-level-bar">
                        <div 
                          className="audio-level-fill" 
                          style={{ width: `${audioLevel}%` }}
                        ></div>
                      </div>
                      <span className="audio-level-text">{audioLevel}%</span>
                    </div>
                  )}
                </div>
                
                {/* 실시간 스크립트 표시 */}
                <div className="live-script">
                  <h4>실시간 스크립트</h4>
                  <div className="script-content">
                    {scripts[currentScriptAgenda.id] && scripts[currentScriptAgenda.id].length > 0 ? (
                      <div className="script-list">
                        {scripts[currentScriptAgenda.id].map((script) => (
                          <div key={script.id} className="script-item">
                            <div className="speaker-info">
                              <div className="speaker-avatar">
                                <i className="fas fa-user"></i>
                              </div>
                              <span className="speaker-name">{script.speaker}</span>
                              <span className="timestamp">{script.timestamp}</span>
                            </div>
                            <div className="script-text">
                              {script.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-script">
                        <i className="fas fa-microphone-slash"></i>
                        <p>녹음을 시작하면 실시간 스크립트가 여기에 표시됩니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRecordingModal; 