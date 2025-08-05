const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // 기본 HTTP 요청 메서드
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET 요청
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST 요청
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT 요청
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH 요청
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE 요청
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // 파일 업로드
  async uploadFile(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }
}

// 회의 관련 API
export const meetingsApi = {
  // 모든 회의 조회
  getAll: (params = {}) => apiService.get('/meetings', params),
  
  // 회의 상세 조회
  getById: (id) => apiService.get(`/meetings/${id}`),
  
  // 새 회의 생성
  create: (meetingData) => apiService.post('/meetings', meetingData),
  
  // 회의 수정
  update: (id, meetingData) => apiService.put(`/meetings/${id}`, meetingData),
  
  // 회의 삭제
  delete: (id) => apiService.delete(`/meetings/${id}`),
  
  // 회의 상태 변경
  updateStatus: (id, status) => apiService.patch(`/meetings/${id}/status`, { status }),
  
  // 회의록 생성 및 이메일 발송
  generateRecord: (id, recipients = []) => 
    apiService.post(`/meetings/${id}/generate-record`, { recipients }),
  
  // 회의 초대 이메일 발송
  sendInvitation: (id, recipients) => 
    apiService.post(`/meetings/${id}/send-invitation`, { recipients }),
  
  // 통계 정보 조회
  getStats: (id) => apiService.get(`/meetings/${id}/stats`),
};

// Agenda 관련 API
export const agendasApi = {
  // 회의의 모든 Agenda 조회
  getByMeetingId: (meetingId) => apiService.get(`/agendas/meeting/${meetingId}`),
  
  // Agenda 상세 조회
  getById: (id) => apiService.get(`/agendas/${id}`),
  
  // 새 Agenda 생성
  create: (agendaData, files = []) => {
    const formData = new FormData();
    
    // 기본 데이터 추가
    Object.keys(agendaData).forEach(key => {
      if (typeof agendaData[key] === 'object') {
        formData.append(key, JSON.stringify(agendaData[key]));
      } else {
        formData.append(key, agendaData[key]);
      }
    });
    
    // 파일 추가
    files.forEach(file => {
      formData.append('attachments', file);
    });
    
    return apiService.uploadFile('/agendas', formData);
  },
  
  // Agenda 수정
  update: (id, agendaData, files = []) => {
    const formData = new FormData();
    
    // 기본 데이터 추가
    Object.keys(agendaData).forEach(key => {
      if (typeof agendaData[key] === 'object') {
        formData.append(key, JSON.stringify(agendaData[key]));
      } else {
        formData.append(key, agendaData[key]);
      }
    });
    
    // 파일 추가
    files.forEach(file => {
      formData.append('attachments', file);
    });
    
    return apiService.uploadFile(`/agendas/${id}`, formData);
  },
  
  // Agenda 삭제
  delete: (id) => apiService.delete(`/agendas/${id}`),
  
  // Agenda 순서 변경
  reorder: (id, newOrder) => apiService.patch(`/agendas/${id}/reorder`, { newOrder }),
  
  // Agenda 상태 변경
  updateStatus: (id, status) => apiService.patch(`/agendas/${id}/status`, { status }),
  
  // 첨부 파일 삭제
  deleteAttachment: (id, attachmentId) => 
    apiService.delete(`/agendas/${id}/attachments/${attachmentId}`),
  
  // 전문 용어 추가
  addTechnicalTerm: (id, term, definition) => 
    apiService.post(`/agendas/${id}/technical-terms`, { term, definition }),
  
  // 전문 용어 삭제
  deleteTechnicalTerm: (id, termId) => 
    apiService.delete(`/agendas/${id}/technical-terms/${termId}`),
};

// 녹음 관련 API
export const recordingsApi = {
  // 회의의 모든 녹음 조회
  getByMeetingId: (meetingId) => apiService.get(`/recordings/meeting/${meetingId}`),
  
  // 녹음 상세 조회
  getById: (id) => apiService.get(`/recordings/${id}`),
  
  // 새 녹음 세션 시작
  start: (meetingId, agendaId = null) => 
    apiService.post('/recordings/start', { meetingId, agendaId }),
  
  // 녹음 중지
  stop: (id) => apiService.patch(`/recordings/${id}/stop`),
  
  // 녹음 일시정지
  pause: (id) => apiService.patch(`/recordings/${id}/pause`),
  
  // 녹음 재개
  resume: (id) => apiService.patch(`/recordings/${id}/resume`),
  
  // 스크립트 추가
  addScript: (id, scriptData) => apiService.post(`/recordings/${id}/scripts`, scriptData),
  
  // 스크립트 일괄 추가
  addScriptsBatch: (id, scripts) => 
    apiService.post(`/recordings/${id}/scripts/batch`, { scripts }),
  
  // 오디오 파일 업로드
  uploadAudio: (id, audioFile) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    return apiService.uploadFile(`/recordings/${id}/audio`, formData);
  },
  
  // AI 분석 수행
  analyze: (id) => apiService.post(`/recordings/${id}/analyze`),
  
  // 화자 감지 결과 업데이트
  updateSpeakers: (id, speakers) => 
    apiService.post(`/recordings/${id}/speakers`, { speakers }),
  
  // 녹음 삭제
  delete: (id) => apiService.delete(`/recordings/${id}`),
  
  // 실시간 음성 인식
  transcribe: (id, audioData) => 
    apiService.post(`/recordings/${id}/transcribe`, { audioData }),
};

// 시스템 관련 API
export const systemApi = {
  // 헬스 체크
  health: () => apiService.get('/health'),
  
  // 서비스 상태 확인
  status: () => apiService.get('/status'),
};

// API 서비스 인스턴스
const apiService = new ApiService();

export default apiService; 