import { describe, it, expect, beforeEach } from 'vitest';
import { PlanPackage } from '../types/binder';
import { firestorePlanPackageRepository } from './firestorePlanPackageRepository';
import { generateExportData } from '../utils/exportUtils';
import { queryTasks } from '../utils/taskFilterSort';

describe('M6: 휴지통·복구·만료와 전체 JSON 내보내기 회귀 테스트 스위트', () => {
  const createSamplePackages = (): PlanPackage[] => [
    {
      id: 'plan-test-01',
      title: '2026 하반기 인프라 보안 강화 계획',
      content: 'DevSecOps 파이프라인 무중단 배포 및 감사 로깅 체계 구축.',
      revisions: [
        {
          id: 'rev-t01',
          startIndex: 0,
          endIndex: 9,
          originalText: 'DevSecOps',
          correctedText: '클라우드 DevSecOps',
          createdAt: '2026-10-02',
          trashStatus: 0,
        },
      ],
      startPage: 1,
      tasks: [
        {
          id: 'task-t01',
          title: 'TLS 1.3 암호화 스위트 적용 및 인증서 자동 갱신',
          done: true,
          startDate: '2026-10-02',
          dueDate: '2026-10-09 23:30',
          priority: 'high',
          description: 'Let`s Encrypt 와일드카드 인증서 발급',
          tags: ['보안', 'TLS'],
          estimatedMinutes: 60,
          status: 'done',
          completedAt: '2026-10-02T10:00:00+09:00',
          createdAt: '2026-10-02',
          trashStatus: 0,
        },
        {
          id: 'task-t02',
          title: 'IAM 최소 권한 원칙 RBAC 롤 정의',
          done: false,
          startDate: '2026-10-02',
          dueDate: '2026-10-09 23:30',
          priority: 'medium',
          description: '서비스 어카운트 감사',
          tags: ['IAM'],
          estimatedMinutes: 90,
          status: 'in_progress',
          createdAt: '2026-10-02',
          trashStatus: 0,
        },
      ],
      logs: [
        {
          id: 'log-t01',
          taskId: 'task-t01',
          taskTitle: 'TLS 1.3 암호화 스위트 적용 및 인증서 자동 갱신',
          completedAt: '2026-10-02T10:00:00+09:00',
          startedAt: '2026-10-02T09:00:00+09:00',
          endedAt: '2026-10-02T10:00:00+09:00',
          actualMinutes: 60,
          impediment: '',
          comment: '암호화 스위트 적합성 확인 완료',
          trashStatus: 0,
        },
      ],
      planStatus: 'confirmed',
      period: { start: '2026-10-01', end: '2026-10-07' },
      createdAt: '2026-10-01',
      trashStatus: 0,
    },
    {
      id: 'plan-test-02',
      title: '임시 실험용 플랜',
      content: '휴지통 테스트 전용 계획 본문',
      revisions: [],
      startPage: 5,
      tasks: [
        {
          id: 'task-t03',
          title: '임시 실험용 할 일',
          done: false,
          startDate: '2026-10-08',
          dueDate: '2026-10-15 23:30',
          priority: 'low',
          description: '삭제 대상',
          tags: ['임시'],
          estimatedMinutes: 30,
          status: 'todo',
          createdAt: '2026-10-08',
          trashStatus: 0,
        },
      ],
      logs: [],
      planStatus: 'draft',
      period: { start: '2026-10-08', end: '2026-10-15' },
      createdAt: '2026-10-08',
      trashStatus: 0,
    },
  ];

  beforeEach(() => {
    firestorePlanPackageRepository.savePackages(createSamplePackages());
  });

  describe('1. 0/1/2 휴지통 상태 전이 및 연쇄 삭제(Cascade Trash) 무결성', () => {
    it('계획 삭제 시 해당 계획과 연결된 할 일, 일지, 리비전이 원자적으로 trashStatus = 1 처리된다', () => {
      firestorePlanPackageRepository.trashPlan('plan-test-01');
      const loaded = firestorePlanPackageRepository.loadPackages();
      const trashedPlan = loaded.find((p) => p.id === 'plan-test-01');

      expect(trashedPlan).toBeDefined();
      expect(trashedPlan?.trashStatus).toBe(1);
      expect(trashedPlan?.trashedAt).toBeTruthy();

      // 하위 할 일 전체 cascade trash 검증
      expect(trashedPlan?.tasks.every((t) => t.trashStatus === 1)).toBe(true);
      expect(trashedPlan?.tasks.every((t) => t.trashedAt === trashedPlan.trashedAt)).toBe(true);

      // 하위 일지 전체 cascade trash 검증
      expect(trashedPlan?.logs.every((l) => l.trashStatus === 1)).toBe(true);
      expect(trashedPlan?.logs.every((l) => l.trashedAt === trashedPlan.trashedAt)).toBe(true);

      // 리비전 cascade trash 검증
      expect(trashedPlan?.revisions.every((r) => r.trashStatus === 1)).toBe(true);

      // 다른 계획(plan-test-02)은 영향받지 않음
      const untouchedPlan = loaded.find((p) => p.id === 'plan-test-02');
      expect(untouchedPlan?.trashStatus).toBe(0);
      expect(untouchedPlan?.tasks[0].trashStatus).toBe(0);
    });

    it('계획 복구 시 연결된 단위 전체가 원자적으로 trashStatus = 2로 복구되고 trashedAt이 null로 초기화된다', () => {
      firestorePlanPackageRepository.trashPlan('plan-test-01');
      firestorePlanPackageRepository.restorePlan('plan-test-01', 2);

      const loaded = firestorePlanPackageRepository.loadPackages();
      const restoredPlan = loaded.find((p) => p.id === 'plan-test-01');

      expect(restoredPlan?.trashStatus).toBe(2);
      expect(restoredPlan?.trashedAt).toBeNull();
      expect(restoredPlan?.tasks.every((t) => t.trashStatus === 2 && t.trashedAt === null)).toBe(true);
      expect(restoredPlan?.logs.every((l) => l.trashStatus === 2 && l.trashedAt === null)).toBe(true);
      expect(restoredPlan?.revisions.every((r) => r.trashStatus === 2 && r.trashedAt === null)).toBe(true);
    });

    it('사용자가 원할 경우 복구 상태(2)에서 정상 활성 상태(0)로 전환할 수 있다', () => {
      firestorePlanPackageRepository.trashPlan('plan-test-01');
      firestorePlanPackageRepository.restorePlan('plan-test-01', 0);

      const loaded = firestorePlanPackageRepository.loadPackages();
      const restoredPlan = loaded.find((p) => p.id === 'plan-test-01');

      expect(restoredPlan?.trashStatus).toBe(0);
      expect(restoredPlan?.tasks.every((t) => t.trashStatus === 0)).toBe(true);
    });

    it('할 일 삭제 시 연결된 실행 기록들만 함께 휴지통으로 이동하며 다른 할 일은 유지된다', () => {
      firestorePlanPackageRepository.trashTask('plan-test-01', 'task-t01');
      const loaded = firestorePlanPackageRepository.loadPackages();
      const plan = loaded.find((p) => p.id === 'plan-test-01')!;

      const t1 = plan.tasks.find((t) => t.id === 'task-t01')!;
      const t2 = plan.tasks.find((t) => t.id === 'task-t02')!;
      const log1 = plan.logs.find((l) => l.id === 'log-t01')!;

      expect(t1.trashStatus).toBe(1);
      expect(t1.trashedAt).toBeTruthy();
      expect(log1.trashStatus).toBe(1);
      expect(log1.trashedAt).toBe(t1.trashedAt);

      // t02는 영향 없음
      expect(t2.trashStatus).toBe(0);
      expect(t2.trashedAt).toBeFalsy();
      // 부모 계획도 활성 상태 유지
      expect(plan.trashStatus).toBe(0);
    });

    it('할 일 복구 시 연결된 일지도 함께 복구되며, 부모 계획이 휴지통인 경우 부모 계획도 원자적 복구된다', () => {
      // 1. 계획 전체 휴지통 이동
      firestorePlanPackageRepository.trashPlan('plan-test-01');
      // 2. 할 일 개별 복구 요청
      firestorePlanPackageRepository.restoreTask('plan-test-01', 'task-t01', 2);

      const loaded = firestorePlanPackageRepository.loadPackages();
      const plan = loaded.find((p) => p.id === 'plan-test-01')!;
      const t1 = plan.tasks.find((t) => t.id === 'task-t01')!;
      const log1 = plan.logs.find((l) => l.id === 'log-t01')!;

      expect(t1.trashStatus).toBe(2);
      expect(log1.trashStatus).toBe(2);
      // 고아 상태 방지를 위해 부모 계획도 함께 복구
      expect(plan.trashStatus).toBe(2);
    });

    it('실행 기록 단독 삭제 및 복구 시 다른 엔티티에 사이드이펙트가 없다', () => {
      firestorePlanPackageRepository.trashLog('plan-test-01', 'log-t01');
      let plan = firestorePlanPackageRepository.loadPackages().find((p) => p.id === 'plan-test-01')!;
      let log1 = plan.logs.find((l) => l.id === 'log-t01')!;
      let t1 = plan.tasks.find((t) => t.id === 'task-t01')!;

      expect(log1.trashStatus).toBe(1);
      expect(t1.trashStatus).toBe(0);
      expect(plan.trashStatus).toBe(0);

      firestorePlanPackageRepository.restoreLog('plan-test-01', 'log-t01', 2);
      plan = firestorePlanPackageRepository.loadPackages().find((p) => p.id === 'plan-test-01')!;
      log1 = plan.logs.find((l) => l.id === 'log-t01')!;

      expect(log1.trashStatus).toBe(2);
    });
  });

  describe('2. 7일 보존 및 만료 영구 삭제 (Purge) 무결성', () => {
    it('7일 만료 시각이 지난 휴지통 항목은 purgeExpiredTrash에 의해 실제 물리 삭제된다', () => {
      const packages = createSamplePackages();
      const EIGHT_DAYS_AGO = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

      // plan-test-01: 8일 전 삭제 (만료 대상)
      packages[0].trashStatus = 1;
      packages[0].trashedAt = EIGHT_DAYS_AGO;
      packages[0].tasks.forEach((t) => {
        t.trashStatus = 1;
        t.trashedAt = EIGHT_DAYS_AGO;
      });
      packages[0].logs.forEach((l) => {
        l.trashStatus = 1;
        l.trashedAt = EIGHT_DAYS_AGO;
      });

      // plan-test-02: 2일 전 할 일 하나만 삭제 (보존 대상)
      packages[1].tasks[0].trashStatus = 1;
      packages[1].tasks[0].trashedAt = TWO_DAYS_AGO;

      firestorePlanPackageRepository.savePackages(packages);

      const result = firestorePlanPackageRepository.purgeExpiredTrash();

      expect(result.purgedPlans).toContain('plan-test-01');
      expect(result.purgedTasks).toContain('task-t01');
      expect(result.purgedTasks).toContain('task-t02');
      expect(result.purgedLogs).toContain('log-t01');

      const remaining = firestorePlanPackageRepository.loadPackages();
      // 만료된 계획은 완전히 제거됨
      expect(remaining.find((p) => p.id === 'plan-test-01')).toBeUndefined();
      // 2일 전 삭제된 할 일은 아직 보존됨
      const remainingPlan2 = remaining.find((p) => p.id === 'plan-test-02')!;
      expect(remainingPlan2.tasks.length).toBe(1);
      expect(remainingPlan2.tasks[0].id).toBe('task-t03');
    });

    it('즉시 물리 영구 삭제(purgePlan, purgeTask, purgeLog) 요청 시 즉시 저장소에서 제거된다', () => {
      firestorePlanPackageRepository.purgeTask('plan-test-01', 'task-t01');
      let plan = firestorePlanPackageRepository.loadPackages().find((p) => p.id === 'plan-test-01')!;
      expect(plan.tasks.find((t) => t.id === 'task-t01')).toBeUndefined();
      expect(plan.logs.find((l) => l.taskId === 'task-t01')).toBeUndefined();

      firestorePlanPackageRepository.purgePlan('plan-test-02');
      const loaded = firestorePlanPackageRepository.loadPackages();
      expect(loaded.find((p) => p.id === 'plan-test-02')).toBeUndefined();
    });
  });

  describe('3. 기본 활성 필터링 (defaultActiveFilter) 무결성', () => {
    it('queryTasks는 trashStatus === 1인 할 일을 기본적으로 목록에서 배제한다', () => {
      const pkgs = createSamplePackages();
      pkgs[0].tasks[0].trashStatus = 1; // t01 삭제

      const activeTasks = queryTasks(pkgs[0].tasks, {});
      expect(activeTasks.length).toBe(1);
      expect(activeTasks[0].id).toBe('task-t02');
    });
  });

  describe('4. 전체 UTF-8 JSON 백업 내보내기 파이프라인 (확정 결정 7번 준수)', () => {
    it('내보내기 JSON에 휴지통 항목(trashStatus: 1)을 100% 포함하며 비밀값이 노출되지 않는다', () => {
      // plan-02를 휴지통에 넣은 상태에서 내보내기 수행
      firestorePlanPackageRepository.trashPlan('plan-test-02');
      const loaded = firestorePlanPackageRepository.loadPackages();

      const exportResult = generateExportData(loaded);

      // 1. 계약 규격 검증
      expect(exportResult.contractVersion).toBe('2.1.0');
      expect(exportResult.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // 2. 계획 배열 검증 (휴지통 계획 포함 2개)
      expect(exportResult.data.plans.length).toBe(2);
      const trashedExportPlan = exportResult.data.plans.find((p) => p.id === 'plan-test-02');
      expect(trashedExportPlan?.trashStatus).toBe(1);
      expect(trashedExportPlan?.trashedAt).toBeTruthy();

      // 3. 할 일 배열 검증 (휴지통 할 일 포함 3개)
      expect(exportResult.data.tasks.length).toBe(3);
      const trashedExportTask = exportResult.data.tasks.find((t) => t.id === 'task-t03');
      expect(trashedExportTask?.trashStatus).toBe(1);
      expect(trashedExportTask?.estimatedMinutes).toBe(30);

      // 4. 실행 기록 배열 검증
      expect(exportResult.data.executionLogs.length).toBe(1);
      expect(exportResult.data.executionLogs[0].actualMinutes).toBe(60);

      // 5. 비밀값/보안 키 부존재 검증
      const jsonString = JSON.stringify(exportResult);
      expect(jsonString).not.toContain('apiKey');
      expect(jsonString).not.toContain('authToken');
      expect(jsonString).not.toContain('privateKey');
      expect(jsonString).not.toContain('secret');
    });
  });

  describe('5. M7 프로덕션 무결성 및 XSS 방어 검증 (T06-C57, T06-C78~C81)', () => {
    it('XSS 공격 페이로드 문자열이 안전하게 원문 텍스트로 보존된다 (T06-C57)', () => {
      const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
      const pkg = firestorePlanPackageRepository.addTask('plan-test-01', {
        title: xssPayload,
        description: xssPayload,
      });

      const addedTask = pkg.tasks.find((t) => t.title === xssPayload);
      expect(addedTask).toBeDefined();
      expect(addedTask?.title).toBe(xssPayload);
      expect(addedTask?.description).toBe(xssPayload);

      // JSON 내보내기 시에도 문자열 그대로 안전하게 이스케이프/보존됨
      const exported = generateExportData([pkg]);
      const exportedTask = exported.data.tasks.find((t) => t.id === addedTask?.id);
      expect(exportedTask?.title).toBe(xssPayload);
    });

    it('INITIAL_PLAN_PACKAGES는 단일 계획에 5개 이상 할 일과 3개 이상 실행 기록을 만족한다 (T06-C78~C80)', async () => {
      const { INITIAL_PLAN_PACKAGES } = await import('./initialData');
      const plan1 = INITIAL_PLAN_PACKAGES.find((p) => p.id === 'plan-01');

      expect(plan1).toBeDefined();
      expect(plan1!.tasks.length).toBeGreaterThanOrEqual(5);
      expect(plan1!.logs.length).toBeGreaterThanOrEqual(3);

      const doneTasks = plan1!.tasks.filter((t) => t.status === 'done');
      expect(doneTasks.length).toBeGreaterThanOrEqual(3);
    });
  });
});
