const mongoose = require('mongoose');

const agendaSchema = new mongoose.Schema({
  // 회의 참조
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: [true, '회의 ID는 필수입니다.']
  },

  // Agenda 기본 정보
  title: {
    type: String,
    required: [true, 'Agenda 제목은 필수입니다.'],
    trim: true,
    maxlength: [200, '제목은 200자를 초과할 수 없습니다.']
  },
  duration: {
    type: Number,
    required: [true, '소요 시간은 필수입니다.'],
    min: [1, '소요 시간은 최소 1분이어야 합니다.']
  },
  presenter: {
    type: String,
    required: [true, '보고자는 필수입니다.'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, '상세 내용은 1000자를 초과할 수 없습니다.']
  },

  // 전문 용어
  technicalTerms: [{
    term: {
      type: String,
      required: true,
      trim: true
    },
    definition: {
      type: String,
      trim: true
    }
  }],

  // 첨부 파일
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 순서
  order: {
    type: Number,
    required: true,
    min: 1
  },

  // 상태
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },

  // 실제 소요 시간 (회의 중 기록)
  actualDuration: {
    type: Number,
    min: 0
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

// 인덱스 설정
agendaSchema.index({ meetingId: 1, order: 1 });
agendaSchema.index({ status: 1 });
agendaSchema.index({ presenter: 1 });

module.exports = mongoose.model('Agenda', agendaSchema); 