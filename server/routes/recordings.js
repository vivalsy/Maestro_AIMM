const express = require('express');
const router = express.Router();
const Recording = require('../models/Recording');
const Meeting = require('../models/Meeting');
const Agenda = require('../models/Agenda');
const { audioUpload } = require('../middleware/upload');
const aiService = require('../utils/aiService');

// 회의의 모든 녹음 조회
router.get('/meeting/:meetingId', async (req, res) => {
  try {
    const recordings = await Recording.find({ meetingId: req.params.meetingId })
      .populate('agendaId')
      .sort({ 'recordingInfo.startTime': 1 });
    
    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ message: '녹음 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 녹음 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id)
      .populate('meetingId')
      .populate('agendaId');
    
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    res.json(recording);
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({ message: '녹음 조회 중 오류가 발생했습니다.' });
  }
});

// 새 녹음 세션 시작
router.post('/start', async (req, res) => {
  try {
    const { meetingId, agendaId } = req.body;
    
    // 회의 존재 확인
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: '회의를 찾을 수 없습니다.' });
    }
    
    // Agenda 존재 확인
    if (agendaId) {
      const agenda = await Agenda.findById(agendaId);
      if (!agenda) {
        return res.status(404).json({ message: 'Agenda를 찾을 수 없습니다.' });
      }
    }
    
    const recording = new Recording({
      meetingId,
      agendaId,
      recordingInfo: {
        startTime: new Date(),
        status: 'recording'
      }
    });
    
    await recording.save();
    
    res.status(201).json({
      message: '녹음 세션이 시작되었습니다.',
      recording
    });
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(400).json({ 
      message: '녹음 시작 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 녹음 중지
router.patch('/:id/stop', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    recording.recordingInfo.endTime = new Date();
    recording.recordingInfo.status = 'stopped';
    recording.recordingInfo.duration = 
      (recording.recordingInfo.endTime - recording.recordingInfo.startTime) / 1000;
    
    await recording.save();
    
    res.json({
      message: '녹음이 중지되었습니다.',
      recording
    });
  } catch (error) {
    console.error('Error stopping recording:', error);
    res.status(400).json({ message: '녹음 중지 중 오류가 발생했습니다.' });
  }
});

// 녹음 일시정지
router.patch('/:id/pause', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    recording.recordingInfo.status = 'paused';
    await recording.save();
    
    res.json({
      message: '녹음이 일시정지되었습니다.',
      recording
    });
  } catch (error) {
    console.error('Error pausing recording:', error);
    res.status(400).json({ message: '녹음 일시정지 중 오류가 발생했습니다.' });
  }
});

// 녹음 재개
router.patch('/:id/resume', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    recording.recordingInfo.status = 'recording';
    await recording.save();
    
    res.json({
      message: '녹음이 재개되었습니다.',
      recording
    });
  } catch (error) {
    console.error('Error resuming recording:', error);
    res.status(400).json({ message: '녹음 재개 중 오류가 발생했습니다.' });
  }
});

// 스크립트 추가
router.post('/:id/scripts', async (req, res) => {
  try {
    const { speaker, text, confidence, isInterim } = req.body;
    
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    recording.scripts.push({
      speaker,
      text,
      timestamp: new Date(),
      confidence: confidence || 0,
      isInterim: isInterim || false
    });
    
    await recording.save();
    
    res.json({
      message: '스크립트가 추가되었습니다.',
      recording
    });
  } catch (error) {
    console.error('Error adding script:', error);
    res.status(400).json({ message: '스크립트 추가 중 오류가 발생했습니다.' });
  }
});

// 스크립트 일괄 추가
router.post('/:id/scripts/batch', async (req, res) => {
  try {
    const { scripts } = req.body;
    
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    const newScripts = scripts.map(script => ({
      speaker: script.speaker,
      text: script.text,
      timestamp: new Date(script.timestamp || Date.now()),
      confidence: script.confidence || 0,
      isInterim: script.isInterim || false
    }));
    
    recording.scripts.push(...newScripts);
    await recording.save();
    
    res.json({
      message: '스크립트가 일괄 추가되었습니다.',
      recording
    });
  } catch (error) {
    console.error('Error adding scripts batch:', error);
    res.status(400).json({ message: '스크립트 일괄 추가 중 오류가 발생했습니다.' });
  }
});

// 오디오 파일 업로드
router.post('/:id/audio', audioUpload.single('audio'), async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: '오디오 파일이 필요합니다.' });
    }
    
    recording.audioFile = {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype
    };
    
    await recording.save();
    
    res.json({
      message: '오디오 파일이 업로드되었습니다.',
      recording
    });
  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(400).json({ message: '오디오 파일 업로드 중 오류가 발생했습니다.' });
  }
});

// AI 분석 수행
router.post('/:id/analyze', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    // AI 분석 수행
    const aiAnalysis = await aiService.analyzeRecording(recording);
    
    recording.aiAnalysis = aiAnalysis;
    await recording.save();
    
    res.json({
      message: 'AI 분석이 완료되었습니다.',
      aiAnalysis
    });
  } catch (error) {
    console.error('Error analyzing recording:', error);
    res.status(500).json({ message: 'AI 분석 중 오류가 발생했습니다.' });
  }
});

// 화자 감지 결과 업데이트
router.post('/:id/speakers', async (req, res) => {
  try {
    const { speakers } = req.body;
    
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    recording.detectedSpeakers = speakers.map(speaker => ({
      name: speaker.name,
      confidence: speaker.confidence || 0,
      firstDetected: new Date(speaker.firstDetected || Date.now()),
      lastDetected: new Date(speaker.lastDetected || Date.now()),
      totalUtterances: speaker.totalUtterances || 0
    }));
    
    await recording.save();
    
    res.json({
      message: '화자 감지 결과가 업데이트되었습니다.',
      recording
    });
  } catch (error) {
    console.error('Error updating speakers:', error);
    res.status(400).json({ message: '화자 감지 결과 업데이트 중 오류가 발생했습니다.' });
  }
});

// 녹음 삭제
router.delete('/:id', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    // 오디오 파일 삭제
    if (recording.audioFile) {
      const fs = require('fs');
      if (fs.existsSync(recording.audioFile.path)) {
        fs.unlinkSync(recording.audioFile.path);
      }
    }
    
    await Recording.findByIdAndDelete(req.params.id);
    
    res.json({ message: '녹음이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ message: '녹음 삭제 중 오류가 발생했습니다.' });
  }
});

// 실시간 음성 인식 (WebSocket 대신 HTTP로 구현)
router.post('/:id/transcribe', async (req, res) => {
  try {
    const { audioData } = req.body;
    
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: '녹음을 찾을 수 없습니다.' });
    }
    
    // AI 서비스를 통한 음성 인식 (실제로는 WebSocket 사용 권장)
    const transcription = await aiService.transcribeAudio(audioData);
    
    // 임시 스크립트로 추가
    recording.scripts.push({
      speaker: 'Unknown',
      text: transcription.text,
      timestamp: new Date(),
      confidence: transcription.confidence,
      isInterim: transcription.isInterim
    });
    
    await recording.save();
    
    res.json({
      message: '음성 인식이 완료되었습니다.',
      transcription
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ message: '음성 인식 중 오류가 발생했습니다.' });
  }
});

module.exports = router; 