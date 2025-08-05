const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
  // 회의 참조
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: [true, '회의 ID는 필수입니다.']
  },

  // Agenda 참조
  agendaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agenda',
    required: [true, 'Agenda ID는 필수입니다.']
  },

  // 녹음 정보
  recordingInfo: {
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number,
      min: 0
    },
    status: {
      type: String,
      enum: ['recording', 'paused', 'stopped'],
      default: 'recording'
    }
  },

  // 스크립트 데이터
  scripts: [{
    speaker: {
      type: String,
      required: true,
      trim: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    isInterim: {
      type: Boolean,
      default: false
    }
  }],

  // 감지된 화자 정보
  detectedSpeakers: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    firstDetected: {
      type: Date,
      default: Date.now
    },
    lastDetected: {
      type: Date,
      default: Date.now
    },
    totalUtterances: {
      type: Number,
      default: 0
    }
  }],

  // 오디오 파일 정보
  audioFile: {
    filename: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },

  // AI 분석 결과
  aiAnalysis: {
    summary: String,
    keyPoints: [String],
    actionItems: [String],
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    topics: [String],
    decisions: [String]
  },

  // 메타데이터
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 가상 필드: 총 스크립트 수
recordingSchema.virtual('totalScripts').get(function() {
  return this.scripts.length;
});

// 가상 필드: 완료된 스크립트 수
recordingSchema.virtual('completedScripts').get(function() {
  return this.scripts.filter(script => !script.isInterim).length;
});

// 인덱스 설정
recordingSchema.index({ meetingId: 1, agendaId: 1 });
recordingSchema.index({ 'recordingInfo.status': 1 });
recordingSchema.index({ 'recordingInfo.startTime': -1 });

module.exports = mongoose.model('Recording', recordingSchema); 