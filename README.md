# Maestro AI - 회의 관리 시스템

React와 TypeScript를 사용하여 개발된 현대적인 회의 관리 웹 애플리케이션입니다. AI 기반 회의록 생성 및 이메일 배포 기능을 제공합니다.

## 주요 기능

- **회의 목록 조회**: 등록된 모든 회의를 테이블 형태로 표시
- **검색 기능**: 회의명 또는 주관자로 검색 가능
- **상태 관리**: 예정, 진행중, 완료 상태 표시
- **WebEx 연동**: WebEx 링크가 있는 회의는 바로 참여 가능
- **회의록 관리**: 회의록 작성 및 조회 기능
- **AI 기반 회의록 생성**: 음성 녹음을 통한 자동 회의록 생성
- **이메일 배포**: 생성된 회의록을 이메일로 자동 배포
- **PDF 생성**: 회의록을 PDF 형태로 다운로드

## 기술 스택

### Frontend
- React 18
- TypeScript
- CSS3
- Font Awesome (아이콘)

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- Multer (파일 업로드)
- Nodemailer (이메일)
- PDFKit (PDF 생성)
- OpenAI API (AI 서비스)

## 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd Maestro_AI
```

### 2. Frontend 설정
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

### 3. Backend 설정
```bash
# 서버 디렉토리로 이동
cd server

# 의존성 설치
npm install

# 환경 변수 설정
# server/.env 파일을 생성하고 아래 내용을 추가하세요
```

### 4. 환경 변수 설정
`server/.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/maestro_ai

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# AI Service Configuration
AI_SERVICE_URL=https://api.openai.com/v1
AI_SERVICE_KEY=your-openai-api-key

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN_DEV=http://localhost:3000
CORS_ORIGIN_PROD=https://yourdomain.com
```

### 5. 데이터베이스 설정
MongoDB가 설치되어 있어야 합니다. 로컬에서 실행하거나 MongoDB Atlas를 사용할 수 있습니다.

### 6. 서버 실행
```bash
# 개발 모드로 실행
npm run dev

# 프로덕션 모드로 실행
npm start
```

### 7. 브라우저에서 접속
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## 프로젝트 구조

```
Maestro_AI/
├── src/                    # Frontend (React/TypeScript)
│   ├── components/         # React 컴포넌트
│   ├── types/             # TypeScript 타입 정의
│   ├── data/              # 샘플 데이터
│   └── services/          # API 서비스
├── server/                # Backend (Node.js/Express)
│   ├── config/            # 데이터베이스 설정
│   ├── models/            # MongoDB 모델
│   ├── routes/            # API 라우터
│   ├── middleware/        # 미들웨어
│   ├── utils/             # 유틸리티 함수
│   └── uploads/           # 업로드된 파일
└── public/                # 정적 파일
```

## API 엔드포인트

### 회의 관리
- `GET /api/meetings` - 회의 목록 조회
- `POST /api/meetings` - 새 회의 등록
- `PUT /api/meetings/:id` - 회의 정보 수정
- `DELETE /api/meetings/:id` - 회의 삭제

### 회의록 관리
- `GET /api/agendas` - 회의록 목록 조회
- `POST /api/agendas` - 새 회의록 생성
- `PUT /api/agendas/:id` - 회의록 수정
- `DELETE /api/agendas/:id` - 회의록 삭제

### 녹음 파일 관리
- `POST /api/recordings/upload` - 녹음 파일 업로드
- `POST /api/recordings/transcribe` - 음성 텍스트 변환
- `GET /api/recordings/:id` - 녹음 파일 조회

### 시스템 상태
- `GET /api/health` - 서버 상태 확인
- `GET /api/status` - 서비스 상태 확인

## 기능 설명

### 회의 상태
- **예정**: 아직 시작하지 않은 회의 (파란색 배지)
- **진행중**: 현재 진행 중인 회의 (노란색 배지)
- **완료**: 종료된 회의 (초록색 배지)

### 회의록 상태
- **작성**: 회의록을 작성해야 하는 상태 (주황색 버튼)
- **보기**: 작성된 회의록을 볼 수 있는 상태 (파란색 버튼)

### AI 기능
- **음성 인식**: 녹음 파일을 텍스트로 변환
- **회의록 생성**: AI를 통한 자동 회의록 생성
- **요약 생성**: 회의 내용 요약 및 액션 아이템 추출

### 이메일 기능
- **회의록 배포**: 생성된 회의록을 참석자에게 이메일로 배포
- **PDF 첨부**: 회의록을 PDF 형태로 첨부하여 발송

## 개발 가이드

### 환경 변수 설정
1. Gmail 계정에서 2단계 인증 활성화
2. 앱 비밀번호 생성
3. OpenAI API 키 발급
4. MongoDB 연결 문자열 설정

### 데이터베이스 스키마
- **Meeting**: 회의 정보 (제목, 날짜, 참석자 등)
- **Agenda**: 회의록 정보 (내용, 작성자, 상태 등)
- **Recording**: 녹음 파일 정보 (파일명, 경로, 상태 등)

## 배포

### Frontend 배포
```bash
npm run build
npm run deploy
```

### Backend 배포
- Heroku, Vercel, AWS 등 클라우드 플랫폼 사용
- 환경 변수 설정 필요
- MongoDB Atlas 연결 설정

## 문제 해결

### 일반적인 문제
1. **CORS 오류**: 프론트엔드와 백엔드 포트 확인
2. **데이터베이스 연결 실패**: MongoDB URI 확인
3. **이메일 전송 실패**: Gmail 설정 확인
4. **파일 업로드 실패**: 업로드 디렉토리 권한 확인

### 로그 확인
```bash
# 서버 로그 확인
npm run dev

# 데이터베이스 연결 확인
# MongoDB Compass 또는 mongo shell 사용
```

## 라이선스

MIT License

## 기여

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 