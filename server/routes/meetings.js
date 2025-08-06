const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Agenda = require('../models/Agenda');
const Recording = require('../models/Recording');
const { upload } = require('../middleware/upload');
const emailService = require('../utils/emailService');
const pdfGenerator = require('../utils/pdfGenerator');
const aiService = require('../utils/aiService');

// 모든 회의 조회
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    let query = {};
    
    // 상태 필터
    if (status) {
      query.status = status;
    }
    
    // 검색 필터
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { organizer: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    const meetings = await Meeting.find(query)
      .populate('attendees')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Meeting.countDocuments(query);
    
    res.json({
      meetings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ message: '회의 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 회의 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('attendees');
    
    if (!meeting) {
      return res.status(404).json({ message: '회의를 찾을 수 없습니다.' });
    }
    
    // 관련 Agenda 조회
    const agendas = await Agenda.find({ meetingId: req.params.id })
      .sort({ order: 1 });
    
    // 관련 녹음 조회
    const recordings = await Recording.find({ meetingId: req.params.id })
      .populate('agendaId')
      .sort({ 'recordingInfo.startTime': 1 });
    
    res.json({
      meeting,
      agendas,
      recordings
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ message: '회의 조회 중 오류가 발생했습니다.' });
  }
});

// 새 회의 생성
router.post('/', async (req, res) => {
  try {
    console.log('회의 생성 요청 데이터:', req.body);
    
    const meetingData = {
      ...req.body,
      createdBy: req.body.createdBy || 'system'
    };
    
    const meeting = new Meeting(meetingData);
    await meeting.save();
    
    console.log('생성된 회의:', meeting);
    
    res.status(201).json({
      message: '회의가 성공적으로 생성되었습니다.',
      meeting
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(400).json({ 
      message: '회의 생성 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 회의 수정
router.put('/:id', async (req, res) => {
  try {
    console.log('회의 수정 요청 데이터:', req.body);
    
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!meeting) {
      return res.status(404).json({ message: '회의를 찾을 수 없습니다.' });
    }
    
    console.log('수정된 회의:', meeting);
    
    res.json({
      message: '회의가 성공적으로 수정되었습니다.',
      meeting
    });
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(400).json({ 
      message: '회의 수정 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 회의 삭제
router.delete('/:id', async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndDelete(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({ message: '회의를 찾을 수 없습니다.' });
    }
    
    // 관련 데이터 삭제
    await Agenda.deleteMany({ meetingId: req.params.id });
    await Recording.deleteMany({ meetingId: req.params.id });
    
    res.json({ message: '회의가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ message: '회의 삭제 중 오류가 발생했습니다.' });
  }
});

// 회의 상태 변경
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!meeting) {
      return res.status(404).json({ message: '회의를 찾을 수 없습니다.' });
    }
    
    res.json({
      message: '회의 상태가 성공적으로 변경되었습니다.',
      meeting
    });
  } catch (error) {
    console.error('Error updating meeting status:', error);
    res.status(400).json({ message: '회의 상태 변경 중 오류가 발생했습니다.' });
  }
});

// 회의록 생성 및 이메일 발송
router.post('/:id/generate-record', async (req, res) => {
  try {
    const { recipients } = req.body;
    
    // 회의 정보 조회
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: '회의를 찾을 수 없습니다.' });
    }
    
    // 관련 데이터 조회
    const agendas = await Agenda.find({ meetingId: req.params.id }).sort({ order: 1 });
    const recordings = await Recording.find({ meetingId: req.params.id })
      .populate('agendaId')
      .sort({ 'recordingInfo.startTime': 1 });
    
    // AI 분석 수행
    const aiAnalysis = await aiService.generateMeetingSummary(meeting, agendas, recordings);
    
    // 회의록 업데이트
    meeting.record = {
      summary: aiAnalysis.summary,
      keyPoints: aiAnalysis.keyPoints,
      actionItems: aiAnalysis.actionItems.map(item => ({
        description: item,
        status: 'pending'
      }))
    };
    
    meeting.aiAnalysis = {
      summary: aiAnalysis.summary,
      sentiment: aiAnalysis.sentiment,
      keyTopics: aiAnalysis.topics,
      decisions: aiAnalysis.decisions
    };
    
    await meeting.save();
    
    // PDF 생성
    const pdfPath = await pdfGenerator.generateMeetingRecord(meeting, agendas, recordings);
    
    // 이메일 발송
    if (recipients && recipients.length > 0) {
      await emailService.sendMeetingRecord(meeting, recipients, pdfPath);
    }
    
    res.json({
      message: '회의록이 성공적으로 생성되었습니다.',
      pdfPath,
      aiAnalysis
    });
  } catch (error) {
    console.error('Error generating meeting record:', error);
    res.status(500).json({ message: '회의록 생성 중 오류가 발생했습니다.' });
  }
});

// 회의 초대 이메일 발송
router.post('/:id/send-invitation', async (req, res) => {
  try {
    const { recipients } = req.body;
    
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: '회의를 찾을 수 없습니다.' });
    }
    
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ message: '수신자 이메일이 필요합니다.' });
    }
    
    await emailService.sendMeetingInvitation(meeting, recipients);
    
    res.json({ message: '회의 초대 이메일이 성공적으로 발송되었습니다.' });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ message: '초대 이메일 발송 중 오류가 발생했습니다.' });
  }
});

// 통계 정보 조회
router.get('/:id/stats', async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: '회의를 찾을 수 없습니다.' });
    }
    
    const agendas = await Agenda.find({ meetingId: req.params.id });
    const recordings = await Recording.find({ meetingId: req.params.id });
    
    const stats = {
      totalAgendas: agendas.length,
      completedAgendas: agendas.filter(a => a.status === 'completed').length,
      totalRecordings: recordings.length,
      totalScripts: recordings.reduce((sum, r) => sum + (r.scripts?.length || 0), 0),
      totalDuration: recordings.reduce((sum, r) => sum + (r.recordingInfo.duration || 0), 0),
      detectedSpeakers: recordings.reduce((speakers, r) => {
        r.detectedSpeakers?.forEach(speaker => {
          if (!speakers.find(s => s.name === speaker.name)) {
            speakers.push(speaker);
          }
        });
        return speakers;
      }, [])
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching meeting stats:', error);
    res.status(500).json({ message: '통계 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router; 