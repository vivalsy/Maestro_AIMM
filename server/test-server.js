const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

// CORS 설정
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development'
  });
});

// 회의 생성 엔드포인트
app.post('/api/meetings', (req, res) => {
  try {
    console.log('회의 생성 요청:', req.body);
    
    // 간단한 회의 객체 생성
    const meeting = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('생성된 회의:', meeting);
    
    res.status(201).json({
      message: '회의가 성공적으로 생성되었습니다.',
      meeting
    });
  } catch (error) {
    console.error('회의 생성 오류:', error);
    res.status(400).json({ 
      message: '회의 생성 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 회의 수정 엔드포인트
app.put('/api/meetings/:id', (req, res) => {
  try {
    console.log('회의 수정 요청:', req.params.id, req.body);
    
    const meeting = {
      id: req.params.id,
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    console.log('수정된 회의:', meeting);
    
    res.json({
      message: '회의가 성공적으로 수정되었습니다.',
      meeting
    });
  } catch (error) {
    console.error('회의 수정 오류:', error);
    res.status(400).json({ 
      message: '회의 수정 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 모든 회의 조회 엔드포인트
app.get('/api/meetings', (req, res) => {
  try {
    console.log('회의 목록 조회 요청');
    
    // 임시 데이터 반환
    const meetings = [
      {
        id: '1',
        title: '테스트 회의',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        location: '회의실 A',
        organizer: '홍길동',
        status: 'scheduled',
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json({
      meetings,
      totalPages: 1,
      currentPage: 1,
      total: meetings.length
    });
  } catch (error) {
    console.error('회의 목록 조회 오류:', error);
    res.status(500).json({ message: '회의 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 404 핸들러
app.use('/api/*', (req, res) => {
  res.status(404).json({
    message: '요청한 API 엔드포인트를 찾을 수 없습니다.',
    path: req.originalUrl
  });
});

// 에러 핸들러
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    message: '서버 내부 오류가 발생했습니다.',
    error: error.message
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Test Server is running on port ${PORT}`);
  console.log(`📊 Environment: development`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 