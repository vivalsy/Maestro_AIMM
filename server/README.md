# Maestro AI Backend Server

React 기반 회의 관리 시스템의 백엔드 서버입니다.

## 🏗️ 시스템 아키텍처

```
React 앱 → Nginx → Express 서버 → Mongoose → MongoDB
```

## 📋 주요 기능

### 1. 회의 관리
- 회의 기본 정보 관리 (제목, 일시, 장소, 참석자 등)
- Webex 정보 연동
- 회의 상태 관리 (예정, 진행중, 완료, 취소)

### 2. Agenda 관리
- Agenda 생성, 수정, 삭제
- 첨부 파일 업로드
- 전문 용어 관리
- 순서 변경 기능

### 3. 실시간 음성 기록
- 회의 중 실시간 녹음
- 음성 인식 및 스크립트 생성
- 화자 감지
- AI 분석 (요약, 감정 분석, 액션 아이템 추출)

### 4. 회의록 처리
- AI를 활용한 회의 요약 생성
- PDF 회의록 생성
- 이메일을 통한 회의록 배포

## 🛠️ 기술 스택

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **File Upload**: Multer
- **Email**: Nodemailer
- **PDF Generation**: PDFKit
- **Security**: Helmet, CORS, Rate Limiting
- **AI Integration**: Placeholder (실제 AI 서비스 연동 가능)

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`config.env` 파일을 생성하고 다음 내용을 설정하세요:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/maestro_ai

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# AI Service Configuration (Placeholder)
AI_SERVICE_URL=https://api.openai.com/v1
AI_SERVICE_KEY=your_openai_api_key

# Webex Configuration
WEBEX_CLIENT_ID=your_webex_client_id
WEBEX_CLIENT_SECRET=your_webex_client_secret
```

### 3. MongoDB 실행
MongoDB가 로컬에서 실행 중인지 확인하세요.

### 4. 서버 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

## 📡 API 엔드포인트

### 회의 관리
- `GET /api/meetings` - 모든 회의 조회
- `GET /api/meetings/:id` - 회의 상세 조회
- `POST /api/meetings` - 새 회의 생성
- `PUT /api/meetings/:id` - 회의 수정
- `DELETE /api/meetings/:id` - 회의 삭제
- `PATCH /api/meetings/:id/status` - 회의 상태 변경
- `POST /api/meetings/:id/generate-record` - 회의록 생성
- `POST /api/meetings/:id/send-invitation` - 초대 이메일 발송

### Agenda 관리
- `GET /api/agendas/meeting/:meetingId` - 회의의 모든 Agenda 조회
- `GET /api/agendas/:id` - Agenda 상세 조회
- `POST /api/agendas` - 새 Agenda 생성
- `PUT /api/agendas/:id` - Agenda 수정
- `DELETE /api/agendas/:id` - Agenda 삭제
- `PATCH /api/agendas/:id/reorder` - Agenda 순서 변경
- `PATCH /api/agendas/:id/status` - Agenda 상태 변경

### 녹음 관리
- `GET /api/recordings/meeting/:meetingId` - 회의의 모든 녹음 조회
- `GET /api/recordings/:id` - 녹음 상세 조회
- `POST /api/recordings/start` - 녹음 세션 시작
- `PATCH /api/recordings/:id/stop` - 녹음 중지
- `PATCH /api/recordings/:id/pause` - 녹음 일시정지
- `PATCH /api/recordings/:id/resume` - 녹음 재개
- `POST /api/recordings/:id/scripts` - 스크립트 추가
- `POST /api/recordings/:id/analyze` - AI 분석 수행

### 시스템
- `GET /api/health` - 헬스 체크
- `GET /api/status` - 서비스 상태 확인

## 📁 프로젝트 구조

```
server/
├── config/
│   └── database.js          # MongoDB 연결 설정
├── middleware/
│   └── upload.js            # 파일 업로드 미들웨어
├── models/
│   ├── Meeting.js           # 회의 모델
│   ├── Agenda.js            # Agenda 모델
│   └── Recording.js         # 녹음 모델
├── routes/
│   ├── meetings.js          # 회의 API 라우터
│   ├── agendas.js           # Agenda API 라우터
│   └── recordings.js        # 녹음 API 라우터
├── utils/
│   ├── emailService.js      # 이메일 서비스
│   ├── pdfGenerator.js      # PDF 생성 유틸리티
│   └── aiService.js         # AI 분석 서비스
├── uploads/                 # 업로드된 파일 저장소
├── server.js                # 메인 서버 파일
├── package.json
└── README.md
```

## 🔧 개발 가이드

### 새로운 API 엔드포인트 추가
1. `routes/` 디렉토리에 새 라우터 파일 생성
2. `server.js`에서 라우터 등록
3. 필요한 모델과 유틸리티 함수 구현

### 데이터베이스 스키마 수정
1. `models/` 디렉토리의 해당 모델 파일 수정
2. 인덱스 및 가상 필드 추가 고려
3. 마이그레이션 스크립트 작성 (필요시)

### 파일 업로드 설정
- `middleware/upload.js`에서 허용된 파일 타입 및 크기 설정
- 업로드 디렉토리 구조 관리

## 🚀 배포

### 프로덕션 환경 설정
1. 환경 변수를 프로덕션 값으로 설정
2. MongoDB 연결 문자열 업데이트
3. 이메일 서비스 설정
4. AI 서비스 API 키 설정

### Docker 배포 (선택사항)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔒 보안 고려사항

- Helmet을 통한 보안 헤더 설정
- CORS 정책 설정
- Rate limiting 적용
- 파일 업로드 검증
- 입력 데이터 검증

## 📝 로그 및 모니터링

- Morgan을 통한 HTTP 요청 로깅
- 에러 핸들링 및 로깅
- 서비스 상태 모니터링 엔드포인트

## 🤝 기여 가이드

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 