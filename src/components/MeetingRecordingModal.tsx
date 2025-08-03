import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import './MeetingRecordingModal.css';

interface MeetingRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingName: string;
  agendaItems: any[];
  existingScript?: string; // 기존 회의 스크립트
  existingMinutes?: string; // 기존 회의록 내용
  meetingInfo?: {
    date: string;
    time: string;
    location: string;
    organizer: string;
    attendees: string[];
  }; // 회의 기본 정보 추가
  onExportMinutes?: (meetingName: string, minutesContent: string, fileName: string) => void; // 회의록 내보내기 콜백 추가
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

interface MeetingRecordItem {
  id: string;
  agendaName: string;
  discussion: string;
  type: 'comment' | 'instruction';
  department: string;
  isEditable: boolean; // 편집 가능 여부 추가
  aiSummary?: string; // AI 분석 요약 추가
}

// AI 분석 결과 인터페이스
interface AIAnalysisResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

const MeetingRecordingModal: React.FC<MeetingRecordingModalProps> = ({
  isOpen,
  onClose,
  meetingName,
  agendaItems,
  existingScript,
  existingMinutes,
  meetingInfo,
  onExportMinutes
}) => {
  const [activeTab, setActiveTab] = useState<'script' | 'record'>('script');
  const [currentAgendaIndex, setCurrentAgendaIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // 일시 정지 상태 추가
  const [recordingTime, setRecordingTime] = useState(0); // 녹음 시간 (초)
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null); // 타이머
  const [audioLevel, setAudioLevel] = useState(0); // 오디오 레벨 (0-100)
  const [scripts, setScripts] = useState<{ [key: string]: ScriptItem[] }>({});
  const [meetingRecords, setMeetingRecords] = useState<MeetingRecordItem[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemName, setDeleteItemName] = useState<string>(''); // 삭제할 항목의 이름
  const [showAddModal, setShowAddModal] = useState(false); // 새 항목 추가 모달
  const [newAgendaName, setNewAgendaName] = useState(''); // 새 agenda 이름
  const [showScriptModal, setShowScriptModal] = useState(false); // 스크립트 모달
  const [currentScriptAgenda, setCurrentScriptAgenda] = useState<any>(null); // 현재 스크립트 모달의 아젠다
  
  // AI 분석 관련 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{[key: string]: AIAnalysisResult}>({});
  
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
        let interimTranscript = '';
        let finalTranscript = '';
        let finalConfidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            finalConfidence = confidence;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // 일시정지 상태가 아닐 때만 임시 인식 텍스트 업데이트
        if (!isPaused) {
          setInterimTranscript(interimTranscript);
        }
        
        if (finalTranscript && !isPaused) {
          setCurrentTranscript(prev => prev + finalTranscript);
          
          // AI 화자 구분 적용 - 자동으로 처리
          const voiceFeatures = analyzeVoiceSignature(null);
          const detectedSpeaker = matchSpeaker(voiceFeatures);
          
          // 현재 화자의 스크립트에 추가
          const currentAgenda = agendaItems[currentAgendaIndex];
          if (currentAgenda) {
            const newScriptItem: ScriptItem = {
              id: Date.now().toString(),
              speaker: detectedSpeaker,
              content: finalTranscript,
              timestamp: formatTime(recordingTime),
              confidence: finalConfidence,
              isFinal: true,
              voiceSignature: JSON.stringify(voiceFeatures),
              speakerId: `speaker_${Date.now()}`
            };
            
            setScripts(prev => ({
              ...prev,
              [currentAgenda.id]: [...(prev[currentAgenda.id] || []), newScriptItem]
            }));
          }
        }
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
  }, [currentAgendaIndex, recordingTime, agendaItems]);

  // 기존 데이터 로드
  useEffect(() => {
    if (isOpen) {
      // 기존 회의 스크립트가 있으면 로드
      if (existingScript) {
        // 스크립트를 파싱하여 각 agenda별로 분리
        const scriptItems: ScriptItem[] = [
          {
            id: '1',
            speaker: '회의 진행자',
            content: existingScript,
            timestamp: '00:00'
          }
        ];
        setScripts({ 'default': scriptItems });
      }

      // 기존 회의록 내용이 있으면 로드
      if (existingMinutes) {
        // 기존 회의록 내용을 첫 번째 agenda에 설정
        const initialRecords = agendaItems.length > 0 ? agendaItems.map((agenda, index) => ({
          id: `record-${index}`,
          agendaName: agenda.title,
          discussion: index === 0 ? existingMinutes : '',
          type: 'comment' as const,
          department: '',
          isEditable: true
        })) : [];
        setMeetingRecords(initialRecords);
      } else {
        // 기존 회의록이 없으면 기본 초기화
        const initialRecords = agendaItems.map((agenda, index) => ({
          id: `record-${index}`,
          agendaName: agenda.title,
          discussion: '',
          type: 'comment' as const,
          department: '',
          isEditable: true
        }));
        setMeetingRecords(initialRecords);
      }
    }
  }, [isOpen, agendaItems, existingScript, existingMinutes]);

  const handleStartRecording = (agendaIndex: number) => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordingTime(0);
    setCurrentAgendaIndex(agendaIndex);
    
    // 현재 Agenda의 스크립트 초기화 (없는 경우)
    const currentAgenda = agendaItems[agendaIndex];
    if (currentAgenda && !scripts[currentAgenda.id]) {
      setScripts(prev => ({
        ...prev,
        [currentAgenda.id]: []
      }));
    }
    
    // 타이머 시작
    const timer = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    setRecordingTimer(timer);
    
    // 오디오 레벨 시뮬레이션 시작
    const audioInterval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 100);
    
    // 음성 인식 시작
    if (recognition) {
      try {
        recognition.start();
        console.log(`Agenda ${agendaIndex + 1} 음성 인식 시작`);
      } catch (error) {
        console.error('음성 인식 시작 실패:', error);
      }
    }
  };

  const handlePauseRecording = () => {
    setIsPaused(true);
    
    // 타이머 일시정지
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
    
    // 오디오 레벨 시뮬레이션 일시정지
    setAudioLevel(0);
    
    // 음성 인식 중지
    if (recognition) {
      try {
        recognition.stop();
        console.log('음성 인식 중지');
      } catch (error) {
        console.error('음성 인식 중지 실패:', error);
      }
    }
    
    // 임시 인식 텍스트 초기화
    setInterimTranscript('');
    
    console.log('녹음 일시정지');
  };

  const handleResumeRecording = () => {
    setIsPaused(false);
    
    // 타이머 재시작
    const timer = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    setRecordingTimer(timer);
    
    // 오디오 레벨 시뮬레이션 재시작
    const audioInterval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 100);
    
    // 음성 인식 재시작
    if (recognition) {
      try {
        recognition.start();
        console.log('음성 인식 재시작');
      } catch (error) {
        console.error('음성 인식 재시작 실패:', error);
      }
    }
    
    console.log('녹음 재개');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioLevel(0);
    
    // 타이머 정지
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
    
    // 음성 인식 중지
    if (recognition) {
      try {
        recognition.stop();
        console.log('음성 인식 중지');
      } catch (error) {
        console.error('음성 인식 중지 실패:', error);
      }
    }
  };

  // 시간 포맷팅 함수
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextAgenda = () => {
    if (currentAgendaIndex < agendaItems.length - 1) {
      setCurrentAgendaIndex(currentAgendaIndex + 1);
    }
  };

  const handlePreviousAgenda = () => {
    if (currentAgendaIndex > 0) {
      setCurrentAgendaIndex(currentAgendaIndex - 1);
    }
  };

  // AI 화자 구분 함수
  const analyzeVoiceSignature = (audioData: any) => {
    // 실제 구현에서는 음성 분석 API를 사용
    // 여기서는 시뮬레이션으로 구현
    const voiceFeatures = {
      pitch: Math.random() * 100 + 100, // 음높이
      tempo: Math.random() * 50 + 80,   // 말하기 속도
      volume: Math.random() * 30 + 70,  // 볼륨
      accent: Math.random() > 0.5 ? 'standard' : 'regional' // 억양
    };
    
    return voiceFeatures;
  };

  // 화자 매칭 함수
  const matchSpeaker = (voiceFeatures: any) => {
    const existingProfiles = Object.keys(speakerProfiles);
    
    if (existingProfiles.length === 0) {
      // 첫 번째 화자로 등록
      const newSpeakerId = `speaker_${Date.now()}`;
      const newSpeakerName = `화자 ${detectedSpeakers.length + 1}`;
      
      setSpeakerProfiles(prev => ({
        ...prev,
        [newSpeakerId]: {
          name: newSpeakerName,
          features: voiceFeatures,
          count: 1
        }
      }));
      
      setDetectedSpeakers(prev => [...prev, newSpeakerName]);
      return newSpeakerName;
    }
    
    // 기존 화자와 유사도 계산
    let bestMatch: string | null = null;
    let highestSimilarity = 0;
    
    existingProfiles.forEach(speakerId => {
      const profile = speakerProfiles[speakerId];
      const similarity = calculateSimilarity(voiceFeatures, profile.features);
      
      if (similarity > highestSimilarity && similarity > 0.7) {
        highestSimilarity = similarity;
        bestMatch = profile.name;
      }
    });
    
    if (bestMatch) {
      // 기존 화자와 매칭
      setSpeakerProfiles(prev => ({
        ...prev,
        [Object.keys(prev).find(key => prev[key].name === bestMatch)!]: {
          ...prev[Object.keys(prev).find(key => prev[key].name === bestMatch)!],
          count: prev[Object.keys(prev).find(key => prev[key].name === bestMatch)!].count + 1
        }
      }));
      return bestMatch;
    } else {
      // 새로운 화자로 등록
      const newSpeakerId = `speaker_${Date.now()}`;
      const newSpeakerName = `화자 ${detectedSpeakers.length + 1}`;
      
      setSpeakerProfiles(prev => ({
        ...prev,
        [newSpeakerId]: {
          name: newSpeakerName,
          features: voiceFeatures,
          count: 1
        }
      }));
      
      setDetectedSpeakers(prev => [...prev, newSpeakerName]);
      return newSpeakerName;
    }
  };

  // 유사도 계산 함수
  const calculateSimilarity = (features1: any, features2: any) => {
    const pitchDiff = Math.abs(features1.pitch - features2.pitch) / 200;
    const tempoDiff = Math.abs(features1.tempo - features2.tempo) / 100;
    const volumeDiff = Math.abs(features1.volume - features2.volume) / 100;
    const accentMatch = features1.accent === features2.accent ? 1 : 0;
    
    const similarity = (1 - pitchDiff) * 0.4 + 
                      (1 - tempoDiff) * 0.3 + 
                      (1 - volumeDiff) * 0.2 + 
                      accentMatch * 0.1;
    
    return Math.max(0, similarity);
  };

  // AI 분석 함수 - 스크립트를 분석하여 핵심 내용 요약
  const analyzeScript = async (scriptItems: ScriptItem[]): Promise<AIAnalysisResult> => {
    if (scriptItems.length === 0) {
      return {
        summary: '녹음된 내용이 없습니다.',
        keyPoints: [],
        actionItems: [],
        sentiment: 'neutral'
      };
    }

    // 스크립트 텍스트를 하나로 합치기
    const fullText = scriptItems.map(item => `${item.speaker}: ${item.content}`).join('\n');
    
    // 실제 AI 분석 API 호출 대신 시뮬레이션
    // 실제 구현에서는 OpenAI API나 다른 AI 서비스를 사용
    return new Promise((resolve) => {
      setTimeout(() => {
        // 향상된 키워드 기반 분석
        const keywords = extractKeywords(fullText);
        const summary = generateSummary(fullText, keywords);
        const keyPoints = extractKeyPoints(fullText, keywords);
        const actionItems = extractActionItems(fullText);
        const sentiment = analyzeSentiment(fullText);
        
        resolve({
          summary,
          keyPoints,
          actionItems,
          sentiment
        });
      }, 1000); // 1초 지연으로 분석 중임을 시뮬레이션
    });
  };

  // OpenAI API를 사용한 실제 AI 분석 함수 (선택적)
  const analyzeWithOpenAI = async (text: string): Promise<AIAnalysisResult> => {
    // 실제 OpenAI API 호출 예시
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-3.5-turbo',
    //     messages: [
    //       {
    //         role: 'system',
    //         content: '회의 내용을 분석하여 핵심 요약, 주요 포인트, 액션 아이템, 감정을 추출해주세요.'
    //       },
    //       {
    //         role: 'user',
    //         content: text
    //       }
    //     ]
    //   })
    // });
    // const data = await response.json();
    // return parseOpenAIResponse(data);
    
    // 현재는 시뮬레이션 반환
    return analyzeScript([]);
  };

  // 키워드 추출 함수
  const extractKeywords = (text: string): string[] => {
    const commonKeywords = [
      '프로젝트', '개발', '설계', '구현', '테스트', '배포', '관리', '운영',
      '예산', '일정', '품질', '성능', '보안', '데이터', '시스템', '서비스',
      '고객', '사용자', '요구사항', '기능', '개선', '문제', '해결', '검토',
      '회의', '논의', '결정', '진행', '완료', '지연', '우선순위', '책임',
      '리소스', '팀', '협업', '커뮮니케이션', '리더십', '전략', '목표',
      '성과', '결과', '효율성', '생산성', '혁신', '변경', '적응', '학습'
    ];
    
    // 키워드 빈도 계산
    const keywordFrequency: {[key: string]: number} = {};
    
    commonKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      if (matches) {
        keywordFrequency[keyword] = matches.length;
      }
    });
    
    // 빈도순으로 정렬하여 상위 키워드 반환
    const sortedKeywords = Object.entries(keywordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([keyword]) => keyword);
    
    return sortedKeywords.length > 0 ? sortedKeywords : ['회의', '논의', '진행'];
  };

  // 요약 생성 함수
  const generateSummary = (text: string, keywords: string[]): string => {
    if (text.length < 100) {
      return text;
    }
    
    // 문장 분리 및 정리
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) {
      return '녹음 내용이 부족합니다.';
    }
    
    // 키워드가 포함된 문장들을 우선적으로 선택
    const keywordSentences = sentences.filter(sentence => 
      keywords.some(keyword => sentence.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    // 문장 중요도 점수 계산
    const sentenceScores = sentences.map(sentence => {
      let score = 0;
      
      // 키워드 포함 점수
      keywords.forEach(keyword => {
        if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
          score += 2;
        }
      });
      
      // 길이 점수 (적당한 길이 선호)
      const length = sentence.length;
      if (length > 20 && length < 100) {
        score += 1;
      }
      
      // 특정 패턴 점수
      if (sentence.includes('결정') || sentence.includes('완료') || sentence.includes('진행')) {
        score += 1;
      }
      
      return { sentence, score };
    });
    
    // 점수순으로 정렬하여 상위 문장 선택
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(item => item.sentence);
    
    const selectedSentences = topSentences.length > 0 
      ? topSentences 
      : sentences.slice(0, 2);
    
    // 요약 텍스트 생성
    let summary = selectedSentences.join('. ') + '.';
    
    // 요약이 너무 길면 자르기
    if (summary.length > 200) {
      summary = summary.substring(0, 200) + '...';
    }
    
    return summary;
  };

  // 핵심 포인트 추출 함수
  const extractKeyPoints = (text: string, keywords: string[]): string[] => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyPoints: string[] = [];
    
    // 키워드가 포함된 문장들을 핵심 포인트로 선정
    sentences.forEach(sentence => {
      if (keywords.some(keyword => sentence.toLowerCase().includes(keyword.toLowerCase()))) {
        const trimmed = sentence.trim();
        if (trimmed.length > 10 && trimmed.length < 100) {
          keyPoints.push(trimmed);
        }
      }
    });
    
    return keyPoints.slice(0, 3); // 최대 3개 핵심 포인트
  };

  // 액션 아이템 추출 함수
  const extractActionItems = (text: string): string[] => {
    const actionKeywords = [
      '해야', '필요', '진행', '완료', '검토', '확인', '제출', '보고',
      '준비', '작성', '수정', '개선', '업데이트', '검증', '테스트',
      '회의', '논의', '결정', '승인', '반려', '수정', '보완'
    ];
    
    const actionPatterns = [
      /(.+?)(해야|필요|진행|완료|검토|확인|제출|보고)(.+)/,
      /(.+?)(준비|작성|수정|개선|업데이트|검증|테스트)(.+)/,
      /(.+?)(회의|논의|결정|승인|반려|수정|보완)(.+)/,
      /(.+?)(다음|이후|앞으로|향후)(.+)/,
      /(.+?)(책임|담당|담당자)(.+)/,
      /(.+?)(일정|스케줄|마감|데드라인)(.+)/,
      /(.+?)(예산|비용|투자|자원)(.+)/,
      /(.+?)(품질|성능|효율|개선)(.+)/,
      /(.+?)(고객|사용자|요구사항)(.+)/,
      /(.+?)(시스템|기술|도구|플랫폼)(.+)/
    ];
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const actionItems: string[] = [];
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      
      // 액션 키워드 포함 여부 확인
      const hasActionKeyword = actionKeywords.some(keyword => 
        trimmed.includes(keyword)
      );
      
      // 액션 패턴 매칭
      const hasActionPattern = actionPatterns.some(pattern => 
        pattern.test(trimmed)
      );
      
      if ((hasActionKeyword || hasActionPattern) && trimmed.length > 10 && trimmed.length < 150) {
        // 중복 제거를 위해 유사한 액션 아이템 필터링
        const isDuplicate = actionItems.some(existing => {
          const similarity = calculateTextSimilarity(trimmed, existing);
          return similarity > 0.7; // 70% 이상 유사하면 중복으로 간주
        });
        
        if (!isDuplicate) {
          actionItems.push(trimmed);
        }
      }
    });
    
    return actionItems.slice(0, 3); // 최대 3개 액션 아이템
  };

  // 텍스트 유사도 계산 함수
  const calculateTextSimilarity = (text1: string, text2: string): number => {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  };

  // 감정 분석 함수
  const analyzeSentiment = (text: string): 'positive' | 'neutral' | 'negative' => {
    const positiveWords = [
      '좋다', '성공', '완료', '진행', '개선', '향상', '만족', '우수', '훌륭',
      '긍정', '희망', '기대', '성취', '달성', '해결', '승인', '통과', '합격',
      '효과적', '효율적', '생산적', '창의적', '혁신적', '전략적', '체계적'
    ];
    
    const negativeWords = [
      '문제', '실패', '지연', '어려움', '불만', '우려', '위험', '실패', '오류',
      '부정', '실망', '걱정', '불안', '스트레스', '갈등', '반대', '거부', '실패',
      '비효율', '비생산적', '혼란', '지연', '마감', '압박', '부담', '어려움'
    ];
    
    const neutralWords = [
      '검토', '논의', '결정', '보고', '확인', '진행', '계획', '일정', '예산',
      '분석', '평가', '모니터링', '관리', '운영', '유지', '보수', '개발', '설계'
    ];
    
    // 단어 빈도 계산
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;
    
    positiveWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      const matches = text.match(regex);
      if (matches) {
        positiveScore += matches.length;
      }
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      const matches = text.match(regex);
      if (matches) {
        negativeScore += matches.length;
      }
    });
    
    neutralWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      const matches = text.match(regex);
      if (matches) {
        neutralScore += matches.length;
      }
    });
    
    // 감정 점수 계산 (가중치 적용)
    const weightedPositive = positiveScore * 1.2; // 긍정적 단어에 더 높은 가중치
    const weightedNegative = negativeScore * 1.5; // 부정적 단어에 더 높은 가중치
    const weightedNeutral = neutralScore * 0.8;   // 중립적 단어에 낮은 가중치
    
    // 감정 판단
    if (weightedPositive > weightedNegative && weightedPositive > weightedNeutral) {
      return 'positive';
    } else if (weightedNegative > weightedPositive && weightedNegative > weightedNeutral) {
      return 'negative';
    } else {
      return 'neutral';
    }
  };

  // AI 분석 실행 함수
  const handleAnalyzeAgenda = async (agendaId: string, agendaName: string) => {
    setIsAnalyzing(true);
    
    try {
      const scriptItems = scripts[agendaId] || [];
      const analysisResult = await analyzeScript(scriptItems);
      
      setAnalysisResults(prev => ({
        ...prev,
        [agendaId]: analysisResult
      }));
      
      // 회의록 항목에 AI 요약 추가
      setMeetingRecords(prev => prev.map(record => 
        record.agendaName === agendaName 
          ? { ...record, aiSummary: analysisResult.summary }
          : record
      ));
      
      console.log(`AI 분석 완료: ${agendaName}`, analysisResult);
    } catch (error) {
      console.error('AI 분석 오류:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 전체 아젠다 AI 분석 함수
  const handleAnalyzeAllAgendas = async () => {
    setIsAnalyzing(true);
    
    try {
      const analysisPromises = agendaItems.map(async (agenda) => {
        const scriptItems = scripts[agenda.id] || [];
        const analysisResult = await analyzeScript(scriptItems);
        
        return {
          agendaId: agenda.id,
          agendaName: agenda.title,
          analysisResult
        };
      });
      
      const results = await Promise.all(analysisPromises);
      
      // 분석 결과 저장
      const newAnalysisResults: {[key: string]: AIAnalysisResult} = {};
      results.forEach(result => {
        newAnalysisResults[result.agendaId] = result.analysisResult;
      });
      
      setAnalysisResults(newAnalysisResults);
      
      // 회의록 항목에 AI 요약 추가
      setMeetingRecords(prev => prev.map(record => {
        const result = results.find(r => r.agendaName === record.agendaName);
        return result ? { ...record, aiSummary: result.analysisResult.summary } : record;
      }));
      
      console.log('전체 AI 분석 완료', results);
    } catch (error) {
      console.error('전체 AI 분석 오류:', error);
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

  // 저장 기능 - 편집 불가능하게 설정
  const handleSaveRecord = (recordId: string) => {
    setMeetingRecords(prev => prev.map(record => 
      record.id === recordId ? { ...record, isEditable: false } : record
    ));
    console.log('저장 완료:', recordId);
  };

  // 수정 기능 - 편집 가능하게 설정
  const handleEditRecord = (recordId: string) => {
    setMeetingRecords(prev => prev.map(record => 
      record.id === recordId ? { ...record, isEditable: true } : record
    ));
    console.log('수정 모드:', recordId);
  };

  // 삭제 모달 열기
  const handleDeleteRecord = (recordId: string, recordName: string) => {
    setDeleteItemId(recordId);
    setDeleteItemName(recordName);
    setShowDeleteModal(true);
  };

  // 삭제 확인
  const handleConfirmDelete = () => {
    if (deleteItemId) {
      setMeetingRecords(prev => prev.filter(record => record.id !== deleteItemId));
      setDeleteItemId(null);
      setDeleteItemName('');
      console.log('삭제 완료:', deleteItemId);
    }
    setShowDeleteModal(false);
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteItemId(null);
    setDeleteItemName('');
  };

  // 새 항목 추가 모달 열기
  const handleAddNewAgenda = () => {
    setShowAddModal(true);
    setNewAgendaName('');
  };

  // 새 항목 추가 확인
  const handleConfirmAdd = () => {
    if (newAgendaName.trim()) {
      const newRecord: MeetingRecordItem = {
        id: `record-${Date.now()}`, // 고유 ID 생성
        agendaName: newAgendaName.trim(),
        discussion: '',
        type: 'comment',
        department: '',
        isEditable: true
      };
      setMeetingRecords(prev => [...prev, newRecord]);
      setNewAgendaName('');
      setShowAddModal(false);
      console.log('새 항목 추가:', newAgendaName);
    }
  };

  // 새 항목 추가 취소
  const handleCancelAdd = () => {
    setShowAddModal(false);
    setNewAgendaName('');
  };

  // 스크립트 모달 열기
  const handleOpenScriptModal = (agenda: any, agendaIndex: number) => {
    setCurrentScriptAgenda(agenda);
    setCurrentAgendaIndex(agendaIndex);
    setShowScriptModal(true);
  };

  // 스크립트 모달 닫기
  const handleCloseScriptModal = () => {
    // 녹음 중이면 중지
    if (isRecording) {
      handleStopRecording();
    }
    setShowScriptModal(false);
    setCurrentScriptAgenda(null);
  };

  const handleSave = () => {
    // 회의록 저장 로직
    console.log('회의록 저장:', meetingRecords);
    
    // 회의 스크립트와 회의록 내용을 부모 컴포넌트로 전달
    const scriptContent = Object.values(scripts).flat().map(script => script.content).join('\n');
    const minutesContent = meetingRecords.map(record => record.discussion).join('\n');
    
    // 여기서 부모 컴포넌트로 데이터를 전달하는 로직을 추가할 수 있습니다
    console.log('저장된 스크립트:', scriptContent);
    console.log('저장된 회의록:', minutesContent);
    
    onClose();
  };

  const handleExport = () => {
    // 회의록 내용을 수집
    const minutesContent = meetingRecords.map(record => {
      const typeText = record.type === 'instruction' ? '지시사항' : 'Comment';
      const departmentText = record.department ? ` (담당: ${record.department})` : '';
      return `[${record.agendaName}] ${typeText}${departmentText}\n${record.discussion}`;
    }).join('\n\n');

    // 회의 기본 정보를 포함한 전체 회의록 생성
    const fullMinutesContent = `회의록

회의 제목: ${meetingName}
일시: ${meetingInfo?.date ? `${meetingInfo.date} ${meetingInfo.time}` : '날짜/시간 미정'}
장소: ${meetingInfo?.location || '장소 미정'}
참석자: ${meetingInfo?.attendees?.length ? meetingInfo.attendees.join(', ') : '참석자 미정'}

${minutesContent}`;

    // PDF 생성
    const doc = new jsPDF();
    
    // 한글 폰트 설정 - 기본 폰트 사용
    doc.setFont('helvetica');
    doc.setFontSize(16);
    
    // 제목 (한글은 이미지로 처리하거나 영어로 표시)
    doc.text('Meeting Minutes', 105, 20, { align: 'center' });
    
    // 회의 기본 정보
    doc.setFontSize(12);
    const meetingTitle = `Meeting Title: ${meetingName}`;
    const meetingDate = `Date: ${meetingInfo?.date ? `${meetingInfo.date} ${meetingInfo.time}` : 'TBD'}`;
    const meetingLocation = `Location: ${meetingInfo?.location || 'TBD'}`;
    const meetingAttendees = `Attendees: ${meetingInfo?.attendees?.length ? meetingInfo.attendees.join(', ') : 'TBD'}`;
    
    doc.text(meetingTitle, 20, 40);
    doc.text(meetingDate, 20, 50);
    doc.text(meetingLocation, 20, 60);
    doc.text(meetingAttendees, 20, 70);
    
    // 회의록 테이블 헤더
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('회의록 상세 내용', 20, 90);
    
    // 테이블 헤더
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Agenda명', 20, 110);
    doc.text('논의 및 결정사항', 60, 110);
    doc.text('구분', 140, 110);
    doc.text('담당부서', 170, 110);
    
    // 테이블 내용
    doc.setFont('helvetica', 'normal');
    let yPosition = 120;
    
    meetingRecords.forEach((record, index) => {
      const typeText = record.type === 'instruction' ? '지시사항' : 'Comment';
      const departmentText = record.department || '-';
      const discussionText = record.discussion || record.aiSummary || '내용 없음';
      
      // Agenda명
      doc.text(record.agendaName, 20, yPosition);
      
      // 논의 및 결정사항 (긴 텍스트는 줄바꿈 처리)
      const discussionLines = doc.splitTextToSize(discussionText, 60);
      doc.text(discussionLines, 60, yPosition);
      
      // 구분
      doc.text(typeText, 140, yPosition);
      
      // 담당부서
      doc.text(departmentText, 170, yPosition);
      
      // 다음 행으로 이동 (텍스트 높이에 따라 조정)
      const maxLines = Math.max(discussionLines.length, 1);
      yPosition += maxLines * 5 + 10;
      
      // 페이지 분할 처리
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
        
        // 새 페이지에 테이블 헤더 다시 추가
        doc.setFont('helvetica', 'bold');
        doc.text('Agenda명', 20, yPosition);
        doc.text('논의 및 결정사항', 60, yPosition);
        doc.text('구분', 140, yPosition);
        doc.text('담당부서', 170, yPosition);
        yPosition += 10;
      }
    });
    
    // PDF 파일명 - [회의록](회의명).pdf 형식으로 생성
    const fileName = `[회의록]${meetingName}.pdf`;
    
    // PDF를 Blob으로 생성
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // 새 창에서 PDF 열기
    const newWindow = window.open(pdfUrl, '_blank');
    if (newWindow) {
      newWindow.document.title = fileName;
    }
    
    // 메모리 정리
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 1000);

    // 콜백 호출하여 회의록 항목에 추가
    if (onExportMinutes) {
      onExportMinutes(meetingName, fullMinutesContent, fileName);
    }

    console.log('회의록 PDF 내보내기 완료:', fileName);
    window.alert(`회의록이 성공적으로 생성되었습니다.\n\n파일명: ${fileName}\n\n새 창에서 PDF를 확인하시고, 미팅 테이블의 회의록 항목에서 파일을 다운로드할 수 있습니다.`);
  };

  if (!isOpen) return null;

  const currentAgenda = agendaItems[currentAgendaIndex];
  const currentScripts = scripts[currentAgenda?.id] || [];

  return (
    <div className="modal-overlay">
      <div className="modal-container recording-modal">
        <div className="modal-header">
          <h2 className="modal-title">{meetingName}</h2>
          <div className="modal-actions">
            <button className="btn btn-cancel" onClick={onClose}>
              <i className="fas fa-times"></i>
              닫기
            </button>
          </div>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'script' ? 'active' : ''}`}
            onClick={() => setActiveTab('script')}
          >
            <i className="fas fa-microphone"></i>
            회의 내용 스크립트
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
          {activeTab === 'script' ? (
            // 회의 내용 스크립트 탭
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
          ) : (
            // 회의록 탭
            <div className="record-section">
              <div className="meeting-info">
                <h3>회의 기본 정보</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>회의 제목:</label>
                    <span>{meetingName}</span>
                  </div>
                  <div className="info-item">
                    <label>일시:</label>
                    <span>{meetingInfo?.date ? `${meetingInfo.date} ${meetingInfo.time}` : '날짜/시간 미정'}</span>
                  </div>
                  <div className="info-item">
                    <label>장소:</label>
                    <span>{meetingInfo?.location || '장소 미정'}</span>
                  </div>
                  <div className="info-item">
                    <label>참석자:</label>
                    <span>{meetingInfo?.attendees?.length ? meetingInfo.attendees.join(', ') : '참석자 미정'}</span>
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
                    <button 
                      className="btn btn-primary"
                      onClick={handleAnalyzeAllAgendas}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          분석 중...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-magic"></i>
                          전체 AI 분석
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* AI 분석 결과 표시 */}
                {Object.keys(analysisResults).length > 0 && (
                  <div className="ai-analysis-results">
                    {agendaItems.map((agenda) => {
                      const result = analysisResults[agenda.id];
                      if (!result) return null;
                      
                      return (
                        <div key={agenda.id} className="ai-analysis-item">
                          <div className="analysis-header">
                            <h4>{agenda.title}</h4>
                            <span className={`sentiment-badge ${result.sentiment}`}>
                              {result.sentiment === 'positive' ? '긍정' : 
                               result.sentiment === 'negative' ? '부정' : '중립'}
                            </span>
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
                    })}
                  </div>
                )}
              </div>

              <div className="record-table-container">
                <div className="table-header">
                  <h3>회의록 작성</h3>
                  <div className="table-actions">
                    <button 
                      className="btn btn-info btn-sm"
                      onClick={handleAnalyzeAllAgendas}
                      disabled={isAnalyzing}
                      title="AI로 모든 아젠다 분석"
                    >
                      {isAnalyzing ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-brain"></i>
                      )}
                    </button>
                  </div>
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
                            <option value="comment">Comment</option>
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

      {/* 새 항목 추가 모달 */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container add-modal">
            <div className="modal-header">
              <h3>새 Agenda 항목 추가</h3>
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
                <div className="recording-control-section">
                  {!isRecording ? (
                    <button 
                      className="btn btn-primary btn-lg"
                      onClick={() => handleStartRecording(currentAgendaIndex)}
                    >
                      <i className="fas fa-microphone"></i>
                      녹음 시작
                    </button>
                  ) : (
                    <div className="recording-controls">
                      {!isPaused ? (
                        <button 
                          className="btn btn-warning btn-lg"
                          onClick={handlePauseRecording}
                        >
                          <i className="fas fa-pause"></i>
                          일시정지
                        </button>
                      ) : (
                        <button 
                          className="btn btn-success btn-lg"
                          onClick={handleResumeRecording}
                        >
                          <i className="fas fa-play"></i>
                          재개
                        </button>
                      )}
                      <button 
                        className="btn btn-danger btn-lg"
                        onClick={handleStopRecording}
                      >
                        <i className="fas fa-stop"></i>
                        정지
                      </button>
                    </div>
                  )}
                  
                  {/* 녹음 중일 때 시간과 파형 표시 */}
                  {isRecording && (
                    <div className="recording-info">
                      <div className="recording-time">
                        <i className="fas fa-clock"></i>
                        <span>{formatTime(recordingTime)}</span>
                      </div>
                      <div className="audio-waveform">
                        {Array.from({ length: 8 }, (_, i) => (
                          <div
                            key={i}
                            className={`waveform-circle ${isPaused ? 'paused' : ''}`}
                            style={{
                              transform: `scale(${isPaused ? 0.3 : (audioLevel / 100) * 0.8 + 0.3})`,
                              animationDelay: `${i * 0.15}s`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 스크립트 내용 */}
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
      )}
    </div>
  );
};

export default MeetingRecordingModal; 