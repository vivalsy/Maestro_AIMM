const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // 회의록 PDF 이메일 발송
  async sendMeetingRecord(meeting, recipients, pdfPath) {
    try {
      const mailOptions = {
        from: `"Maestro AI" <${process.env.EMAIL_USER}>`,
        to: recipients.join(', '),
        subject: `[회의록] ${meeting.title}`,
        html: this.generateMeetingRecordEmail(meeting),
        attachments: [
          {
            filename: `회의록_${meeting.title}_${new Date(meeting.date).toISOString().split('T')[0]}.pdf`,
            path: pdfPath
          }
        ]
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Meeting record email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending meeting record email:', error);
      throw error;
    }
  }

  // 회의 초대 이메일 발송
  async sendMeetingInvitation(meeting, recipients) {
    try {
      const mailOptions = {
        from: `"Maestro AI" <${process.env.EMAIL_USER}>`,
        to: recipients.join(', '),
        subject: `[회의 초대] ${meeting.title}`,
        html: this.generateInvitationEmail(meeting)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Meeting invitation email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending meeting invitation email:', error);
      throw error;
    }
  }

  // 회의록 이메일 템플릿 생성
  generateMeetingRecordEmail(meeting) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #990033; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; }
          .meeting-info { background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .agenda-item { margin: 10px 0; padding: 10px; border-left: 3px solid #990033; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>회의록</h1>
          <p>Maestro AI Meeting Management System</p>
        </div>
        
        <div class="content">
          <div class="meeting-info">
            <h2>${meeting.title}</h2>
            <p><strong>일시:</strong> ${new Date(meeting.date).toLocaleDateString()} ${meeting.startTime} - ${meeting.endTime}</p>
            <p><strong>장소:</strong> ${meeting.location}</p>
            <p><strong>주관자:</strong> ${meeting.organizer}</p>
          </div>
          
          ${meeting.record?.summary ? `
            <h3>회의 요약</h3>
            <p>${meeting.record.summary}</p>
          ` : ''}
          
          ${meeting.record?.keyPoints?.length > 0 ? `
            <h3>주요 논의 사항</h3>
            <ul>
              ${meeting.record.keyPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
          ` : ''}
          
          ${meeting.record?.actionItems?.length > 0 ? `
            <h3>액션 아이템</h3>
            <ul>
              ${meeting.record.actionItems.map(item => `
                <li>
                  <strong>${item.description}</strong>
                  ${item.assignee ? ` - 담당: ${item.assignee}` : ''}
                  ${item.dueDate ? ` - 마감일: ${new Date(item.dueDate).toLocaleDateString()}` : ''}
                </li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>이 회의록은 Maestro AI 시스템에서 자동으로 생성되었습니다.</p>
          <p>문의사항이 있으시면 시스템 관리자에게 연락해 주세요.</p>
        </div>
      </body>
      </html>
    `;
  }

  // 회의 초대 이메일 템플릿 생성
  generateInvitationEmail(meeting) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #990033; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; }
          .meeting-info { background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .webex-info { background-color: #e3f2fd; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .btn { display: inline-block; padding: 10px 20px; background-color: #990033; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>회의 초대</h1>
          <p>Maestro AI Meeting Management System</p>
        </div>
        
        <div class="content">
          <div class="meeting-info">
            <h2>${meeting.title}</h2>
            <p><strong>일시:</strong> ${new Date(meeting.date).toLocaleDateString()} ${meeting.startTime} - ${meeting.endTime}</p>
            <p><strong>장소:</strong> ${meeting.location}</p>
            <p><strong>주관자:</strong> ${meeting.organizer}</p>
          </div>
          
          ${meeting.webexInfo?.url ? `
            <div class="webex-info">
              <h3>Webex 회의 정보</h3>
              <p><strong>회의 URL:</strong> <a href="${meeting.webexInfo.url}">${meeting.webexInfo.url}</a></p>
              ${meeting.webexInfo.meetingKey ? `<p><strong>회의 키:</strong> ${meeting.webexInfo.meetingKey}</p>` : ''}
              ${meeting.webexInfo.meetingPassword ? `<p><strong>비밀번호:</strong> ${meeting.webexInfo.meetingPassword}</p>` : ''}
              <a href="${meeting.webexInfo.url}" class="btn">회의 참가</a>
            </div>
          ` : ''}
          
          <p>회의에 참석해 주시기 바랍니다.</p>
        </div>
        
        <div class="footer">
          <p>이 초대는 Maestro AI 시스템에서 자동으로 발송되었습니다.</p>
        </div>
      </body>
      </html>
    `;
  }

  // 이메일 발송 테스트
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService(); 