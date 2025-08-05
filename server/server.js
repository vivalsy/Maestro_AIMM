require('dotenv').config({ path: './.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// 환경 변수 기본값 설정
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/maestro_ai';
process.env.EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
process.env.EMAIL_PORT = process.env.EMAIL_PORT || '587';
process.env.EMAIL_USER = process.env.EMAIL_USER || 'your-email@gmail.com';
process.env.EMAIL_PASS = process.env.EMAIL_PASS || 'your-app-password';
process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'your-email@gmail.com';
process.env.AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://api.openai.com/v1';
process.env.AI_SERVICE_KEY = process.env.AI_SERVICE_KEY || 'your-openai-api-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'maestro-ai-secret-key-2024';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
process.env.MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || '10485760';
process.env.UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || '100';
process.env.CORS_ORIGIN_DEV = process.env.CORS_ORIGIN_DEV || 'http://localhost:3000';
process.env.CORS_ORIGIN_PROD = process.env.CORS_ORIGIN_PROD || 'https://yourdomain.com';

// 데이터베이스 연결
const connectDB = require('./config/database');

// 라우터 임포트
const meetingsRouter = require('./routes/meetings');
const agendasRouter = require('./routes/agendas');
const recordingsRouter = require('./routes/recordings');

const app = express();
const PORT = process.env.PORT || 5000;

// 데이터베이스 연결
connectDB();

// 보안 미들웨어
app.use(helmet());

// CORS 설정
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CORS_ORIGIN_PROD] 
    : [process.env.CORS_ORIGIN_DEV],
  credentials: true
}));

// 압축 미들웨어
app.use(compression());

// 로깅 미들웨어
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 최대 요청 수
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해 주세요.'
});
app.use('/api/', limiter);

// Body parser 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 서빙
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API 라우터
app.use('/api/meetings', meetingsRouter);
app.use('/api/agendas', agendasRouter);
app.use('/api/recordings', recordingsRouter);

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// 서비스 상태 확인 엔드포인트
app.get('/api/status', async (req, res) => {
  try {
    const emailService = require('./utils/emailService');
    const aiService = require('./utils/aiService');
    
    const emailStatus = await emailService.testConnection();
    const aiStatus = await aiService.testConnection();
    
    res.json({
      database: 'connected',
      email: emailStatus ? 'connected' : 'disconnected',
      ai: aiStatus ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: '서비스 상태 확인 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    });
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
  
  // Multer 에러 처리
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: '파일 크기가 너무 큽니다.',
      error: '파일 크기는 10MB를 초과할 수 없습니다.'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      message: '예상치 못한 파일 필드가 있습니다.',
      error: '파일 업로드 형식이 올바르지 않습니다.'
    });
  }
  
  // MongoDB 에러 처리
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      message: '데이터 검증 오류',
      errors: messages
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      message: '잘못된 데이터 형식',
      error: 'ID 형식이 올바르지 않습니다.'
    });
  }
  
  // 기본 에러 응답
  res.status(error.status || 500).json({
    message: error.message || '서버 내부 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI}`);
  console.log(`📧 Email: ${process.env.EMAIL_HOST}`);
  console.log(`🤖 AI Service: ${process.env.AI_SERVICE_URL || 'Placeholder'}`);
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

// Unhandled promise rejection
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Uncaught exception
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
}); 