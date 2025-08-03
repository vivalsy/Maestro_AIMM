export interface Meeting {
  id: string;
  name: string;
  date: string;
  time: string;
  startDateTime?: Date; // 회의 시작 시간
  endDateTime?: Date;   // 회의 종료 시간
  location: string;
  organizer: {
    name: string;
    title: string;
  };
  attendees: string[];
  totalAttendees: number;
  webexUrl?: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  minutesStatus: 'write' | 'view';
  hasLiveRecording?: boolean;
  agendaItems?: AgendaItem[]; // 안건 목록
  meetingScript?: string; // 실시간 회의 기록 스크립트
  minutesContent?: string; // 회의록 내용
  minutesFile?: string; // 회의록 파일명 (PDF)
  emailDistributed?: boolean; // 이메일 배포 완료 여부
}

export interface AgendaItem {
  id: string;
  title: string;
  duration: string;
  presenter: string;
  content: string;
  files: File[];
}

export interface MeetingFormData {
  name: string;
  date: string;
  time: string;
  location: string;
  organizer: {
    name: string;
    title: string;
  };
  attendees: string[];
  webexUrl?: string;
} 