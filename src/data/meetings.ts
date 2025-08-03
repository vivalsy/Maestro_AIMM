import { Meeting } from '../types/Meeting';

export const meetings: Meeting[] = [
  {
    id: '1',
    name: '연간 목표 설정 워크숍',
    date: '2025-03-10',
    time: '13:00~16:00',
    startDateTime: new Date('2025-03-10T13:00:00'),
    endDateTime: new Date('2025-03-10T16:00:00'),
    location: '본사 대회의실',
    organizer: {
      name: '박지은',
      title: '부장'
    },
    attendees: ['송혜진', '김영수', '노승현'],
    totalAttendees: 7,
    status: 'scheduled',
    minutesStatus: 'write',
    hasLiveRecording: true,
    agendaItems: [
      {
        id: '1',
        title: '2024년 실적 리뷰',
        duration: '30분',
        presenter: '박지은',
        content: '2024년도 각 부서별 실적 현황 및 성과 분석',
        files: []
      },
      {
        id: '2',
        title: '2025년 목표 설정',
        duration: '45분',
        presenter: '송혜진',
        content: '2025년도 회사 전체 목표 및 부서별 세부 목표 설정',
        files: []
      },
      {
        id: '3',
        title: '전략 수립',
        duration: '60분',
        presenter: '김영수',
        content: '목표 달성을 위한 전략적 방향성 및 실행 계획 수립',
        files: []
      }
    ],
    meetingScript: '회의 시작: 박지은 부장이 2024년 실적 리뷰를 시작합니다...',
    minutesContent: '2024년 실적 리뷰 결과, 매출 목표 95% 달성...'
  },
  {
    id: '2',
    name: '보안 정책 업데이트 회의',
    date: '2025-03-05',
    time: '14:00~15:30',
    startDateTime: new Date('2025-03-05T14:00:00'),
    endDateTime: new Date('2025-03-05T15:30:00'),
    location: '온라인',
    organizer: {
      name: '서지훈',
      title: '책임'
    },
    attendees: ['이미영', '정태호', '한소영'],
    totalAttendees: 5,
    webexUrl: 'https://webex.com/meeting/123',
    status: 'in-progress',
    minutesStatus: 'write',
    hasLiveRecording: true,
    agendaItems: [
      {
        id: '1',
        title: '현재 보안 정책 현황',
        duration: '20분',
        presenter: '서지훈',
        content: '현재 적용 중인 보안 정책 및 취약점 분석',
        files: []
      },
      {
        id: '2',
        title: '신규 보안 정책 검토',
        duration: '40분',
        presenter: '이미영',
        content: '업데이트된 보안 정책 검토 및 적용 방안',
        files: []
      }
    ],
    meetingScript: '보안 정책 업데이트 회의 시작: 서지훈 책임이 현재 보안 정책 현황을 설명합니다...',
    minutesContent: '현재 보안 정책 현황 분석 결과, 3개 영역에서 개선 필요...'
  },
  {
    id: '3',
    name: 'AI 프로젝트 킥오프',
    date: '2025-03-01',
    time: '09:30~11:00',
    startDateTime: new Date('2025-03-01T09:30:00'),
    endDateTime: new Date('2025-03-01T11:00:00'),
    location: 'AI 연구소',
    organizer: {
      name: '조현우',
      title: '팀장'
    },
    attendees: ['김민수', '박서연', '이준호'],
    totalAttendees: 6,
    status: 'completed',
    minutesStatus: 'view',
    hasLiveRecording: false,
    agendaItems: [
      {
        id: '1',
        title: 'AI 프로젝트 개요',
        duration: '30분',
        presenter: '조현우',
        content: 'AI 프로젝트의 목표, 범위, 예상 성과에 대한 소개',
        files: []
      },
      {
        id: '2',
        title: '팀 구성 및 역할',
        duration: '30분',
        presenter: '김민수',
        content: '프로젝트 팀 구성원 및 각자의 역할과 책임',
        files: []
      }
    ],
    meetingScript: 'AI 프로젝트 킥오프 시작: 조현우 팀장이 프로젝트 개요를 설명합니다...',
    minutesContent: 'AI 프로젝트 킥오프 완료. 팀 구성 및 역할 분담 완료...'
  },
  {
    id: '4',
    name: '분기별 실적 리뷰',
    date: '2025-02-28',
    time: '10:00~12:00',
    startDateTime: new Date('2025-02-28T10:00:00'),
    endDateTime: new Date('2025-02-28T12:00:00'),
    location: '본사 중회의실',
    organizer: {
      name: '김영희',
      title: '이사'
    },
    attendees: ['최동욱', '윤서진', '박민수'],
    totalAttendees: 8,
    status: 'completed',
    minutesStatus: 'view',
    hasLiveRecording: true,
    agendaItems: [
      {
        id: '1',
        title: '1분기 실적 분석',
        duration: '45분',
        presenter: '김영희',
        content: '2025년 1분기 매출, 비용, 수익성 분석',
        files: []
      },
      {
        id: '2',
        title: '2분기 계획 수립',
        duration: '45분',
        presenter: '최동욱',
        content: '2분기 목표 설정 및 실행 계획 수립',
        files: []
      }
    ],
    meetingScript: '분기별 실적 리뷰 시작: 김영희 이사가 1분기 실적을 분석합니다...',
    minutesContent: '1분기 실적 분석 완료. 매출 목표 102% 달성, 수익성 개선...'
  }
]; 