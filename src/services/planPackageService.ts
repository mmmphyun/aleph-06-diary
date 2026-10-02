import type { PlanPackage, LogItem } from '../types/binder';

const STORAGE_KEY = 'aleph06_plan_packages';

export const INITIAL_PLAN_PACKAGES: PlanPackage[] = [
  {
    id: 'plan-01',
    title: '2026 하반기 핵심 목표 수립',
    content: `매일 아침 30분 CS 시스템 아키텍처 및 네트워크 표준 읽기.\n주 3회 5km 조깅 및 코어 운동 진행하기.\nDevSecOps 자동화 파이프라인 무중단 배포 설계서 완성.\n매주 일요일 저녁 1시간 다이어리 실행 일지 및 시간 오차 회고.\n운영체제 커널 가상 메모리와 페이지 교체 알고리즘 정리.\n클라우드 인프라 보안 감사 체크리스트 점검 및 자동화 구축.`,
    revisions: [
      {
        id: 'rev-01',
        startIndex: 37,
        endIndex: 58,
        originalText: '주 3회 5km 조깅 및 코어 운동',
        correctedText: '주 4회 7km 러닝 및 인터벌 트레이닝으로 상향',
        createdAt: '2026-10-02',
      },
    ],
    startPage: 1,
    tasks: [
      {
        id: 't-01',
        title: '네트워크 소켓 버퍼링 및 TCP 상태 머신 정리',
        done: true,
        createdAt: '2026-10-02',
      },
      {
        id: 't-02',
        title: '바인더 다이어리 2-Tier 캔버스 컴포넌트 구현',
        done: false,
        createdAt: '2026-10-02',
      },
      {
        id: 't-03',
        title: '아날로그 인라인 취소선 교정 렌더링 무결성 검증',
        done: false,
        createdAt: '2026-10-02',
      },
    ],
    logs: [
      {
        id: 'log-01',
        taskId: 't-01',
        taskTitle: '네트워크 소켓 버퍼링 및 TCP 상태 머신 정리',
        completedAt: '26.10.02 09:30',
        comment: 'TIME_WAIT 상태와 SO_REUSEADDR 소켓 옵션의 연관 관계를 명확히 정립함.',
      },
    ],
    createdAt: '2026-10-01',
  },
  {
    id: 'plan-02',
    title: '바인더 프론트엔드 무스크롤 인터랙션 고도화',
    content: `페이지네이션 스크롤바 원천 차단 및 양면 2-Pane 분할 에디터 구축.\n단일 속지 회전 3D 플립 모션 레이어 통합.\n속표지 다이나믹 TOC 목차 실시간 챕터 점프 연동.\n테마 변경 시 데스크 배경 및 종이 틴트 일체화 렌더링.`,
    revisions: [],
    startPage: 5,
    tasks: [
      {
        id: 't-04',
        title: '단일 속지 3D 플립 모션 및 캐스케이드 연동',
        done: true,
        createdAt: '2026-10-02',
      },
      {
        id: 't-05',
        title: '속표지 다이나믹 TOC 목차 챕터 원클릭 점프 구축',
        done: false,
        createdAt: '2026-10-02',
      },
    ],
    logs: [
      {
        id: 'log-02',
        taskId: 't-04',
        taskTitle: '단일 속지 3D 플립 모션 및 캐스케이드 연동',
        completedAt: '26.10.02 11:40',
        comment: 'Perspective 1400px 축 기반의 실물 낱장 회전 모션을 안착시킴.',
      },
    ],
    createdAt: '2026-10-02',
  },
];

export const planPackageService = {
  loadPackages(): PlanPackage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // 로컬 스토리지 접근 오류 방어
    }
    return INITIAL_PLAN_PACKAGES;
  },

  savePackages(packages: PlanPackage[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
    } catch {
      // 로컬 스토리지 저장 오류 무시
    }
  },

  createPackage(title: string): PlanPackage {
    const existing = this.loadPackages();
    // 마지막 패키지의 startPage + 4로 다음 시작 페이지 계산 (각 패키지당 4페이지 기본 할당)
    const lastPage = existing.length > 0 ? existing[existing.length - 1].startPage + 4 : 1;
    const newPkg: PlanPackage = {
      id: `plan-${Date.now()}`,
      title: title.trim() || `새로운 계획 ${existing.length + 1}`,
      content: '',
      revisions: [],
      startPage: lastPage,
      tasks: [],
      logs: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...existing, newPkg];
    this.savePackages(updated);
    return newPkg;
  },

  updatePackage(pkg: PlanPackage): void {
    const existing = this.loadPackages();
    const updated = existing.map((p) => (p.id === pkg.id ? pkg : p));
    this.savePackages(updated);
  },

  toggleTaskDone(pkgId: string, taskId: string, comment?: string): { packages: PlanPackage[]; updatedPkg: PlanPackage } {
    const existing = this.loadPackages();
    let targetPkg = existing.find((p) => p.id === pkgId);
    if (!targetPkg) return { packages: existing, updatedPkg: existing[0] };

    const targetTask = targetPkg.tasks.find((t) => t.id === taskId);
    if (!targetTask) return { packages: existing, updatedPkg: targetPkg };

    const nextDone = !targetTask.done;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = `${String(now.getFullYear()).slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    let updatedLogs = [...targetPkg.logs];
    if (nextDone) {
      const newLog: LogItem = {
        id: `log-${Date.now()}`,
        taskId: targetTask.id,
        taskTitle: targetTask.title,
        completedAt: `${dateStr} ${timeStr}`,
        comment: comment || '할 일을 완수하고 실행 성찰을 남깁니다.',
      };
      updatedLogs.push(newLog);
    } else {
      updatedLogs = updatedLogs.filter((l) => l.taskId !== taskId);
    }

    const updatedTasks = targetPkg.tasks.map((t) => (t.id === taskId ? { ...t, done: nextDone } : t));
    const newPkg: PlanPackage = {
      ...targetPkg,
      tasks: updatedTasks,
      logs: updatedLogs,
    };

    const updatedPackages = existing.map((p) => (p.id === pkgId ? newPkg : p));
    this.savePackages(updatedPackages);
    return { packages: updatedPackages, updatedPkg: newPkg };
  },
};
