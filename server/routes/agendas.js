const express = require('express');
const router = express.Router();
const Agenda = require('../models/Agenda');
const Meeting = require('../models/Meeting');
const { upload } = require('../middleware/upload');

// 회의의 모든 Agenda 조회
router.get('/meeting/:meetingId', async (req, res) => {
  try {
    const agendas = await Agenda.find({ meetingId: req.params.meetingId })
      .sort({ order: 1 });
    
    res.json(agendas);
  } catch (error) {
    console.error('Error fetching agendas:', error);
    res.status(500).json({ message: 'Agenda 목록 조회 중 오류가 발생했습니다.' });
  }
});

// Agenda 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const agenda = await Agenda.findById(req.params.id)
      .populate('meetingId');
    
    if (!agenda) {
      return res.status(404).json({ message: 'Agenda를 찾을 수 없습니다.' });
    }
    
    res.json(agenda);
  } catch (error) {
    console.error('Error fetching agenda:', error);
    res.status(500).json({ message: 'Agenda 조회 중 오류가 발생했습니다.' });
  }
});

// 새 Agenda 생성
router.post('/', upload.array('attachments', 10), async (req, res) => {
  try {
    // 회의 존재 확인
    const meeting = await Meeting.findById(req.body.meetingId);
    if (!meeting) {
      return res.status(404).json({ message: '회의를 찾을 수 없습니다.' });
    }
    
    // 다음 순서 번호 계산
    const lastAgenda = await Agenda.findOne({ meetingId: req.body.meetingId })
      .sort({ order: -1 });
    const nextOrder = lastAgenda ? lastAgenda.order + 1 : 1;
    
    const agendaData = {
      ...req.body,
      order: nextOrder
    };
    
    // 첨부 파일 정보 추가
    if (req.files && req.files.length > 0) {
      agendaData.attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimeType: file.mimetype
      }));
    }
    
    const agenda = new Agenda(agendaData);
    await agenda.save();
    
    res.status(201).json({
      message: 'Agenda가 성공적으로 생성되었습니다.',
      agenda
    });
  } catch (error) {
    console.error('Error creating agenda:', error);
    res.status(400).json({ 
      message: 'Agenda 생성 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// Agenda 수정
router.put('/:id', upload.array('attachments', 10), async (req, res) => {
  try {
    const agenda = await Agenda.findById(req.params.id);
    if (!agenda) {
      return res.status(404).json({ message: 'Agenda를 찾을 수 없습니다.' });
    }
    
    const updateData = { ...req.body, updatedAt: new Date() };
    
    // 새 첨부 파일이 있으면 기존 파일 정보에 추가
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimeType: file.mimetype
      }));
      
      updateData.attachments = [...(agenda.attachments || []), ...newAttachments];
    }
    
    const updatedAgenda = await Agenda.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      message: 'Agenda가 성공적으로 수정되었습니다.',
      agenda: updatedAgenda
    });
  } catch (error) {
    console.error('Error updating agenda:', error);
    res.status(400).json({ 
      message: 'Agenda 수정 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// Agenda 삭제
router.delete('/:id', async (req, res) => {
  try {
    const agenda = await Agenda.findByIdAndDelete(req.params.id);
    
    if (!agenda) {
      return res.status(404).json({ message: 'Agenda를 찾을 수 없습니다.' });
    }
    
    // 순서 재정렬
    await Agenda.updateMany(
      { meetingId: agenda.meetingId, order: { $gt: agenda.order } },
      { $inc: { order: -1 } }
    );
    
    res.json({ message: 'Agenda가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting agenda:', error);
    res.status(500).json({ message: 'Agenda 삭제 중 오류가 발생했습니다.' });
  }
});

// Agenda 순서 변경
router.patch('/:id/reorder', async (req, res) => {
  try {
    const { newOrder } = req.body;
    
    const agenda = await Agenda.findById(req.params.id);
    if (!agenda) {
      return res.status(404).json({ message: 'Agenda를 찾을 수 없습니다.' });
    }
    
    const oldOrder = agenda.order;
    
    if (newOrder > oldOrder) {
      // 뒤로 이동
      await Agenda.updateMany(
        { 
          meetingId: agenda.meetingId, 
          order: { $gt: oldOrder, $lte: newOrder } 
        },
        { $inc: { order: -1 } }
      );
    } else if (newOrder < oldOrder) {
      // 앞으로 이동
      await Agenda.updateMany(
        { 
          meetingId: agenda.meetingId, 
          order: { $gte: newOrder, $lt: oldOrder } 
        },
        { $inc: { order: 1 } }
      );
    }
    
    agenda.order = newOrder;
    await agenda.save();
    
    res.json({
      message: 'Agenda 순서가 성공적으로 변경되었습니다.',
      agenda
    });
  } catch (error) {
    console.error('Error reordering agenda:', error);
    res.status(400).json({ message: 'Agenda 순서 변경 중 오류가 발생했습니다.' });
  }
});

// Agenda 상태 변경
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const agenda = await Agenda.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!agenda) {
      return res.status(404).json({ message: 'Agenda를 찾을 수 없습니다.' });
    }
    
    res.json({
      message: 'Agenda 상태가 성공적으로 변경되었습니다.',
      agenda
    });
  } catch (error) {
    console.error('Error updating agenda status:', error);
    res.status(400).json({ message: 'Agenda 상태 변경 중 오류가 발생했습니다.' });
  }
});

// 첨부 파일 삭제
router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const agenda = await Agenda.findById(req.params.id);
    if (!agenda) {
      return res.status(404).json({ message: 'Agenda를 찾을 수 없습니다.' });
    }
    
    const attachmentIndex = agenda.attachments.findIndex(
      att => att._id.toString() === req.params.attachmentId
    );
    
    if (attachmentIndex === -1) {
      return res.status(404).json({ message: '첨부 파일을 찾을 수 없습니다.' });
    }
    
    // 파일 시스템에서 삭제
    const fs = require('fs');
    const attachment = agenda.attachments[attachmentIndex];
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }
    
    // 배열에서 제거
    agenda.attachments.splice(attachmentIndex, 1);
    await agenda.save();
    
    res.json({ message: '첨부 파일이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: '첨부 파일 삭제 중 오류가 발생했습니다.' });
  }
});

// 전문 용어 추가
router.post('/:id/technical-terms', async (req, res) => {
  try {
    const { term, definition } = req.body;
    
    const agenda = await Agenda.findById(req.params.id);
    if (!agenda) {
      return res.status(404).json({ message: 'Agenda를 찾을 수 없습니다.' });
    }
    
    agenda.technicalTerms.push({ term, definition });
    await agenda.save();
    
    res.json({
      message: '전문 용어가 성공적으로 추가되었습니다.',
      agenda
    });
  } catch (error) {
    console.error('Error adding technical term:', error);
    res.status(400).json({ message: '전문 용어 추가 중 오류가 발생했습니다.' });
  }
});

// 전문 용어 삭제
router.delete('/:id/technical-terms/:termId', async (req, res) => {
  try {
    const agenda = await Agenda.findById(req.params.id);
    if (!agenda) {
      return res.status(404).json({ message: 'Agenda를 찾을 수 없습니다.' });
    }
    
    const termIndex = agenda.technicalTerms.findIndex(
      term => term._id.toString() === req.params.termId
    );
    
    if (termIndex === -1) {
      return res.status(404).json({ message: '전문 용어를 찾을 수 없습니다.' });
    }
    
    agenda.technicalTerms.splice(termIndex, 1);
    await agenda.save();
    
    res.json({ message: '전문 용어가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting technical term:', error);
    res.status(500).json({ message: '전문 용어 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router; 