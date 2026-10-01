import { Plan, PlanInput, PlanRevision, PaginatedRevisions, FieldChange } from '../types/plan';

const STORAGE_KEY_PLAN = 'aleph06_plan_data';
const STORAGE_KEY_REVISIONS = 'aleph06_plan_revisions';

const INITIAL_PLAN: Plan = {
  id: 'plan-01',
  title: '2026 Q4 개발자 역량 강화 및 포트폴리오 리팩토링',
  priority: 'high',
  period: {
    start: '2026.10.01',
    end: '2026.10.31',
  },
  estimatedHours: 48,
  criteria: [
    '시스템 아키텍처 및 DevSecOps 파이프라인 완성',
    '다이어리 코어 인터랙션 60fps 유지 및 테스트 통과',
    '타이포그래피 굴림체 Fallback 0건 무결성 유지',
    '주요 마일스톤 회고 문서 작성 및 배포',
  ],
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T15:30:00.000Z',
};

const INITIAL_REVISIONS: PlanRevision[] = [
  {
    id: 'rev-07',
    planId: 'plan-01',
    revisionNumber: 7,
    changedFields: {
      title: {
        before: '2026 Q4 포트폴리오 완성',
        after: '2026 Q4 개발자 역량 강화 및 포트폴리오 리팩토링',
      },
      estimatedHours: {
        before: 42,
        after: 48,
      },
    },
    revisedAt: '2026-10-01T15:30:00.000Z',
  },
  {
    id: 'rev-06',
    planId: 'plan-01',
    revisionNumber: 6,
    changedFields: {
      priority: {
        before: 'medium',
        after: 'high',
      },
    },
    revisedAt: '2026-10-01T14:15:00.000Z',
  },
  {
    id: 'rev-05',
    planId: 'plan-01',
    revisionNumber: 5,
    changedFields: {
      criteria: {
        before: [
          '시스템 아키텍처 완성',
          '다이어리 코어 인터랙션 60fps 유지',
        ],
        after: [
          '시스템 아키텍처 및 DevSecOps 파이프라인 완성',
          '다이어리 코어 인터랙션 60fps 유지 및 테스트 통과',
          '타이포그래피 굴림체 Fallback 0건 무결성 유지',
          '주요 마일스톤 회고 문서 작성 및 배포',
        ],
      },
    },
    revisedAt: '2026-10-01T13:00:00.000Z',
  },
  {
    id: 'rev-04',
    planId: 'plan-01',
    revisionNumber: 4,
    changedFields: {
      period: {
        before: { start: '2026.10.01', end: '2026.10.25' },
        after: { start: '2026.10.01', end: '2026.10.31' },
      },
    },
    revisedAt: '2026-10-01T11:45:00.000Z',
  },
  {
    id: 'rev-03',
    planId: 'plan-01',
    revisionNumber: 3,
    changedFields: {
      estimatedHours: {
        before: 36,
        after: 42,
      },
    },
    revisedAt: '2026-10-01T10:30:00.000Z',
  },
  {
    id: 'rev-02',
    planId: 'plan-01',
    revisionNumber: 2,
    changedFields: {
      title: {
        before: '2026 하반기 개인 프로젝트',
        after: '2026 Q4 포트폴리오 완성',
      },
    },
    revisedAt: '2026-10-01T09:40:00.000Z',
  },
  {
    id: 'rev-01',
    planId: 'plan-01',
    revisionNumber: 1,
    changedFields: {
      priority: {
        before: 'low',
        after: 'medium',
      },
      estimatedHours: {
        before: 30,
        after: 36,
      },
    },
    revisedAt: '2026-10-01T09:05:00.000Z',
  },
];

class PlanService {
  private loadPlan(): Plan | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PLAN);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(INITIAL_PLAN));
        return INITIAL_PLAN;
      }
      return JSON.parse(stored) as Plan;
    } catch {
      return INITIAL_PLAN;
    }
  }

  private savePlan(plan: Plan | null): void {
    if (plan === null) {
      localStorage.removeItem(STORAGE_KEY_PLAN);
    } else {
      localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(plan));
    }
  }

  private loadRevisions(): PlanRevision[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REVISIONS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_REVISIONS, JSON.stringify(INITIAL_REVISIONS));
        return INITIAL_REVISIONS;
      }
      return JSON.parse(stored) as PlanRevision[];
    } catch {
      return INITIAL_REVISIONS;
    }
  }

  private saveRevisions(revisions: PlanRevision[]): void {
    localStorage.setItem(STORAGE_KEY_REVISIONS, JSON.stringify(revisions));
  }

  /**
   * 활성 계획 조회 (비동기 시뮬레이션)
   */
  async getPlan(id?: string): Promise<Plan | null> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const plan = this.loadPlan();
    if (!plan) return null;
    if (id && plan.id !== id) return null;
    return plan;
  }

  /**
   * 신규 계획 생성
   */
  async createPlan(input: PlanInput): Promise<Plan> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const now = new Date().toISOString();
    const newPlan: Plan = {
      ...input,
      id: `plan-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.savePlan(newPlan);
    return newPlan;
  }

  /**
   * 계획 수정 및 수정 이력 자동 스냅샷 생성
   */
  async updatePlan(
    planId: string,
    updates: Partial<PlanInput>
  ): Promise<{ plan: Plan; revision: PlanRevision | null }> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const currentPlan = this.loadPlan();
    if (!currentPlan || currentPlan.id !== planId) {
      throw new Error(`계획을 찾을 수 없습니다. (ID: ${planId})`);
    }

    const changedFields: Record<string, FieldChange> = {};

    (Object.keys(updates) as Array<keyof PlanInput>).forEach((key) => {
      const beforeValue = currentPlan[key];
      const afterValue = updates[key];

      const isChanged = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
      if (isChanged && afterValue !== undefined) {
        changedFields[key] = {
          before: beforeValue,
          after: afterValue,
        };
      }
    });

    const now = new Date().toISOString();
    const updatedPlan: Plan = {
      ...currentPlan,
      ...updates,
      updatedAt: now,
    };

    let newRevision: PlanRevision | null = null;
    if (Object.keys(changedFields).length > 0) {
      const allRevisions = this.loadRevisions();
      const planRevisions = allRevisions.filter((r) => r.planId === planId);
      const nextRevisionNumber = planRevisions.length > 0
        ? Math.max(...planRevisions.map((r) => r.revisionNumber)) + 1
        : 1;

      newRevision = {
        id: `rev-${Date.now()}`,
        planId,
        revisionNumber: nextRevisionNumber,
        changedFields,
        revisedAt: now,
      };

      // 최신 수정 이력이 상단(0번 인덱스)에 오도록 정렬 저장
      this.saveRevisions([newRevision, ...allRevisions]);
    }

    this.savePlan(updatedPlan);
    return { plan: updatedPlan, revision: newRevision };
  }

  /**
   * 수정 이력 5건 단위 페이징 조회
   */
  async getPlanRevisions(
    planId: string,
    page: number = 1,
    pageSize: number = 5
  ): Promise<PaginatedRevisions> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const allRevisions = this.loadRevisions();
    const filtered = allRevisions
      .filter((r) => r.planId === planId)
      .sort((a, b) => new Date(b.revisedAt).getTime() - new Date(a.revisedAt).getTime());

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const items = filtered.slice(startIndex, startIndex + pageSize);

    return {
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  /**
   * 개발/테스트용 초기 데이터 리셋
   */
  async resetMockData(): Promise<void> {
    localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(INITIAL_PLAN));
    localStorage.setItem(STORAGE_KEY_REVISIONS, JSON.stringify(INITIAL_REVISIONS));
  }

  /**
   * 빈 상태(EmptyState) 테스트용 데이터 비우기
   */
  async clearPlan(): Promise<void> {
    this.savePlan(null);
  }
}

export const planService = new PlanService();
