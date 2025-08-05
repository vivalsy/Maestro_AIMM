const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  // 회의 기본 정보
  title: {
    type: String,
    required: [true, '회의명은 필수입니다.'],
    trim: true,
    maxlength: [200, '회의명은 200자를 초과할 수 없습니다.']
  },
  date: {
    type: Date,
    required: [true, '회의 일자는 필수입니다.']
  },
  startTime: {
    type: String,
    required: [true, '시작 시간은 필수입니다.']
  },
  endTime: {
    type: String,
    required: [true, '종료 시간은 필수입니다.']
  },
  location: {
    type: String,
    required: [true, '장소는 필수입니다.'],
    trim: true
  },
  organizer: {
    type: String,
    required: [true, '주관자는 필수입니다.'],
    trim: true
  },
  attendees: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    department: {
      type: String,
      trim: true
    }
  }],

  // Webex 정보
  webexInfo: {
    url: {
      type: String,
      trim: true
    },
    meetingKey: {
      type: String,
      trim: true
    },
    meetingPassword: {
      type: String,
      trim: true
    }
  },

  // 회의 상태
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },

  // 회의록 정보
  record: {
    summary: String,
    keyPoints: [String],
    actionItems: [{
      description: String,
      assignee: String,
      dueDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      }
    }]
  },

  // AI 분석 결과
  aiAnalysis: {
    summary: String,
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    keyTopics: [String],
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
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 가상 필드: 회의 시간
meetingSchema.virtual('duration').get(function() {
  if (this.startTime && this.endTime) {
    const start = new Date(`2000-01-01T${this.startTime}`);
    const end = new Date(`2000-01-01T${this.endTime}`);
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / 60000);
    return diffMins;
  }
  return 0;
});

// 인덱스 설정
meetingSchema.index({ date: -1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ organizer: 1 });
meetingSchema.index({ 'attendees.email': 1 });

module.exports = mongoose.model('Meeting', meetingSchema); 