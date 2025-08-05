const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  constructor() {
    this.doc = null;
  }

  // 회의록 PDF 생성
  async generateMeetingRecord(meeting, agendas, recordings) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `meeting_record_${meeting._id}_${Date.now()}.pdf`;
        const filepath = path.join(process.env.UPLOAD_PATH || './uploads', 'pdfs', filename);
        
        // PDF 디렉토리 생성
        const pdfDir = path.dirname(filepath);
        if (!fs.existsSync(pdfDir)) {
          fs.mkdirSync(pdfDir, { recursive: true });
        }

        this.doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const stream = fs.createWriteStream(filepath);
        this.doc.pipe(stream);

        // PDF 내용 생성
        this.generateHeader(meeting);
        this.generateMeetingInfo(meeting);
        this.generateAgendaSummary(agendas);
        this.generateRecordSummary(recordings);
        this.generateActionItems(meeting);
        this.generateFooter();

        this.doc.end();

        stream.on('finish', () => {
          resolve(filepath);
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // 헤더 생성
  generateHeader(meeting) {
    this.doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#990033')
      .text('회의록', { align: 'center' })
      .moveDown(0.5);

    this.doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text(meeting.title, { align: 'center' })
      .moveDown(1);

    this.doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`생성일: ${new Date().toLocaleDateString()}`, { align: 'center' })
      .moveDown(2);
  }

  // 회의 정보 생성
  generateMeetingInfo(meeting) {
    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('회의 정보')
      .moveDown(0.5);

    const meetingInfo = [
      { label: '일시', value: `${new Date(meeting.date).toLocaleDateString()} ${meeting.startTime} - ${meeting.endTime}` },
      { label: '장소', value: meeting.location },
      { label: '주관자', value: meeting.organizer },
      { label: '참석자', value: meeting.attendees.map(a => a.name).join(', ') }
    ];

    meetingInfo.forEach(info => {
      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text(`${info.label}:`, { continued: true })
        .font('Helvetica')
        .fillColor('#666666')
        .text(` ${info.value}`)
        .moveDown(0.3);
    });

    this.moveDown(1);
  }

  // Agenda 요약 생성
  generateAgendaSummary(agendas) {
    if (!agendas || agendas.length === 0) return;

    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Agenda 요약')
      .moveDown(0.5);

    agendas.forEach((agenda, index) => {
      this.doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#990033')
        .text(`${index + 1}. ${agenda.title}`)
        .moveDown(0.3);

      this.doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`보고자: ${agenda.presenter} | 소요시간: ${agenda.duration}분`)
        .moveDown(0.3);

      if (agenda.description) {
        this.doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#333333')
          .text(agenda.description, { width: 500 })
          .moveDown(0.5);
      }

      this.moveDown(0.5);
    });

    this.moveDown(1);
  }

  // 녹음 요약 생성
  generateRecordSummary(recordings) {
    if (!recordings || recordings.length === 0) return;

    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('녹음 요약')
      .moveDown(0.5);

    recordings.forEach((recording, index) => {
      this.doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#990033')
        .text(`녹음 ${index + 1}`)
        .moveDown(0.3);

      this.doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`시작시간: ${new Date(recording.recordingInfo.startTime).toLocaleString()}`)
        .moveDown(0.3);

      if (recording.recordingInfo.endTime) {
        this.doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`종료시간: ${new Date(recording.recordingInfo.endTime).toLocaleString()}`)
          .moveDown(0.3);
      }

      this.doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`총 스크립트: ${recording.scripts?.length || 0}개`)
        .moveDown(0.5);

      // AI 분석 결과가 있으면 표시
      if (recording.aiAnalysis?.summary) {
        this.doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#333333')
          .text('AI 분석 요약:')
          .moveDown(0.3);

        this.doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#666666')
          .text(recording.aiAnalysis.summary, { width: 500 })
          .moveDown(0.5);
      }

      this.moveDown(0.5);
    });

    this.moveDown(1);
  }

  // 액션 아이템 생성
  generateActionItems(meeting) {
    if (!meeting.record?.actionItems || meeting.record.actionItems.length === 0) return;

    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('액션 아이템')
      .moveDown(0.5);

    meeting.record.actionItems.forEach((item, index) => {
      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#990033')
        .text(`${index + 1}. ${item.description}`)
        .moveDown(0.3);

      if (item.assignee) {
        this.doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`담당: ${item.assignee}`)
          .moveDown(0.3);
      }

      if (item.dueDate) {
        this.doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`마감일: ${new Date(item.dueDate).toLocaleDateString()}`)
          .moveDown(0.3);
      }

      this.doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`상태: ${item.status}`)
        .moveDown(0.5);
    });

    this.moveDown(1);
  }

  // 푸터 생성
  generateFooter() {
    this.doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#999999')
      .text('이 회의록은 Maestro AI 시스템에서 자동으로 생성되었습니다.', { align: 'center' })
      .moveDown(0.5);

    this.doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#999999')
      .text(`생성일시: ${new Date().toLocaleString()}`, { align: 'center' });
  }

  // 페이지 나누기
  moveDown(lines = 1) {
    this.doc.moveDown(lines);
  }
}

module.exports = new PDFGenerator(); 