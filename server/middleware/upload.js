const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 업로드 디렉토리 생성
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 파일 필터링
const fileFilter = (req, file, cb) => {
  // 허용된 파일 타입
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다.'), false);
  }
};

// 저장 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 파일 타입별로 디렉토리 분리
    let subDir = 'general';
    if (file.mimetype.startsWith('audio/')) {
      subDir = 'audio';
    } else if (file.mimetype.startsWith('image/')) {
      subDir = 'images';
    } else if (file.mimetype.includes('pdf')) {
      subDir = 'documents';
    } else if (file.mimetype.includes('word') || file.mimetype.includes('excel') || file.mimetype.includes('powerpoint')) {
      subDir = 'documents';
    }

    const targetDir = path.join(uploadDir, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // 파일명 중복 방지
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// multer 설정
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 10 // 최대 10개 파일
  }
});

// 오디오 파일 전용 업로드
const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const audioDir = path.join(uploadDir, 'audio');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }
      cb(null, audioDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `recording-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedAudioTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
    if (allowedAudioTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 오디오 형식입니다.'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB for audio files
  }
});

module.exports = {
  upload,
  audioUpload,
  uploadDir
}; 