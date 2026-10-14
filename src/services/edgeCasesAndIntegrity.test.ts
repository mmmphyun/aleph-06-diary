import { describe, it, expect, beforeEach } from 'vitest';
import { TaskItem } from '../types/binder';
import { firestorePlanPackageRepository } from './firestorePlanPackageRepository';
import { generateExportData } from '../utils/exportUtils';
import { queryTasks, compareTasksDeterministic } from '../utils/taskFilterSort';
import {
  calculateActualMinutes,
  formatVarianceMinutes,
  toKSTDateString,
  getDefaultDueDateKST,
} from '../utils/dateUtils';
import { INITIAL_PLAN_PACKAGES } from './initialData';

// Node 환경을 위한 LocalStorage 폴리필 설정
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
  get length() {
    return storageMap.size;
  },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

describe('엣지케이스 및 데이터 무결성 전수 검증 스위트', () => {
  beforeEach(() => {
    localStorageMock.clear();
    firestorePlanPackageRepository.savePackages(JSON.parse(JSON.stringify(INITIAL_PLAN_PACKAGES)));
  });

  describe('1. 완료 처리 멱등성 및 비동기 상태 전이 엣지케이스 (T06-C21, T06-C22)', () => {
    it('동일 할 일 완료 토글을 연속 2회 호출 시 첫 회에만 completedAt과 로그가 기록되고 2회차는 취소(in_progress)로 복귀한다', () => {
      const pkgId = 'plan-01';
      const taskId = 't-04'; // 초기 status: in_progress, done: false

      // 1회 호출: 완료 전이
      const res1 = firestorePlanPackageRepository.toggleTaskDone(pkgId, taskId, '완료 1차 코멘트');
      const task1 = res1.updatedPkg.tasks.find((t) => t.id === taskId);
      expect(task1?.done).toBe(true);
      expect(task1?.status).toBe('done');
      expect(task1?.completedAt).toBeTruthy();
      const log1 = res1.updatedPkg.logs.find((l) => l.taskId === taskId);
      expect(log1).toBeDefined();
      expect(log1?.completedAt).toBe(task1?.completedAt);

      // 2회 호출: 진행 중으로 안전하게 복귀 (토글 동작 정합성)
      const res2 = firestorePlanPackageRepository.toggleTaskDone(pkgId, taskId);
      const task2 = res2.updatedPkg.tasks.find((t) => t.id === taskId);
      expect(task2?.done).toBe(false);
      expect(task2?.status).toBe('in_progress');
      expect(task2?.completedAt).toBeNull();
      // 해당 할 일의 실행 일지도 안전하게 제거됨
      const log2 = res2.updatedPkg.logs.find((l) => l.taskId === taskId);
      expect(log2).toBeUndefined();
    });

    it('할 일 완료 시 돌아보기 기간 내 완료 카운트가 정확히 1만 증가하고, 중복 완료 시에는 증가하지 않는다 (T06-C22)', () => {
      const pkgId = 'plan-01';
      const taskId = 't-04'; // 초기 status: in_progress
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const getCompletedCount = () => {
        const pkgs = firestorePlanPackageRepository.loadPackages();
        return pkgs
          .filter((p) => p.trashStatus !== 1)
          .flatMap((p) => p.tasks)
          .filter((t) => {
            if (!t.done || t.status !== 'done' || !t.completedAt || t.trashStatus === 1) return false;
            const d = toKSTDateString(t.completedAt);
            return d >= startDate && d <= endDate;
          }).length;
      };

      const initialCount = getCompletedCount();

      // 1회 완료 실행
      firestorePlanPackageRepository.toggleTaskDone(pkgId, taskId, '완료 처리');
      const countAfterFirst = getCompletedCount();
      expect(countAfterFirst).toBe(initialCount + 1);

      // 멱등성: status: 'done' 상태인 할 일에 대해 추가 업데이트가 발생해도 완료 수는 증가하지 않음
      firestorePlanPackageRepository.updateTask(pkgId, taskId, { status: 'done', title: '제목 수정' });
      const countAfterDuplicate = getCompletedCount();
      expect(countAfterDuplicate).toBe(countAfterFirst);
    });

    it('존재하지 않는 pkgId나 taskId로 toggleTaskDone, deleteTask, updateTask 호출 시 예외 없이 현재 캐시를 반환한다', () => {
      expect(() => {
        const res = firestorePlanPackageRepository.toggleTaskDone('non-existent-plan', 'non-existent-task');
        expect(res.packages).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const res = firestorePlanPackageRepository.deleteTask('non-existent-plan', 'non-existent-task');
        expect(res).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const res = firestorePlanPackageRepository.updateTask('non-existent-plan', 'non-existent-task', {
          title: '없는 태스크 수정 시도',
        });
        expect(res).toBeDefined();
      }).not.toThrow();
    });

    it('updateTask를 통해 이미 done인 태스크의 status를 다시 done으로 업데이트해도 기존 completedAt이 덮어쓰이지 않는다', () => {
      const pkgId = 'plan-01';
      const originalTask = firestorePlanPackageRepository.loadPackages()
        .find((p) => p.id === pkgId)!.tasks.find((t) => t.status === 'done')!;
      const originalCompletedAt = originalTask.completedAt;

      const updatedPkg = firestorePlanPackageRepository.updateTask(pkgId, originalTask.id, {
        status: 'done',
        title: '제목만 변경',
      });
      const updatedTask = updatedPkg.tasks.find((t) => t.id === originalTask.id);
      expect(updatedTask?.completedAt).toBe(originalCompletedAt);
      expect(updatedTask?.title).toBe('제목만 변경');
    });
  });

  describe('2. 연쇄 휴지통 및 고아 방지 원자적 복구 엣지케이스 (T06-C13, M6)', () => {
    it('부모 계획 삭제 시 하위 tasks와 logs가 원자적으로 trashStatus = 1 처리되고 활성 목록에서 제외된다', () => {
      const pkgId = 'plan-01';
      firestorePlanPackageRepository.trashPlan(pkgId);

      const loaded = firestorePlanPackageRepository.loadPackages();
      const trashedPlan = loaded.find((p) => p.id === pkgId)!;
      expect(trashedPlan.trashStatus).toBe(1);
      expect(trashedPlan.trashedAt).toBeTruthy();

      // 모든 하위 할 일 및 로그도 연쇄적으로 trashStatus = 1
      for (const t of trashedPlan.tasks) {
        expect(t.trashStatus).toBe(1);
        expect(t.trashedAt).toBeTruthy();
      }
      for (const l of trashedPlan.logs) {
        expect(l.trashStatus).toBe(1);
        expect(l.trashedAt).toBeTruthy();
      }

      // queryTasks 활성 필터에서 완전히 배제됨
      const activeTasks = queryTasks(trashedPlan.tasks, {});
      expect(activeTasks.length).toBe(0);
    });

    it('부모 계획이 휴지통(1) 상태일 때 자식 할 일을 복구(restoreTask)하면 부모 계획도 함께 trashStatus = 2로 복구된다 (고아 방지)', () => {
      const pkgId = 'plan-01';
      firestorePlanPackageRepository.trashPlan(pkgId);

      // plan-01 하위의 t-01 복구 시도
      const restoredPkg = firestorePlanPackageRepository.restoreTask(pkgId, 't-01', 2);
      expect(restoredPkg.trashStatus).toBe(2);
      expect(restoredPkg.trashedAt).toBeNull();

      const restoredTask = restoredPkg.tasks.find((t) => t.id === 't-01');
      expect(restoredTask?.trashStatus).toBe(2);
      expect(restoredTask?.trashedAt).toBeNull();

      // 나머지 t-02 등 미복구 할 일은 여전히 trashStatus = 1 유지
      const stillTrashedTask = restoredPkg.tasks.find((t) => t.id === 't-02');
      expect(stillTrashedTask?.trashStatus).toBe(1);
    });
  });

  describe('3. 입력 경계값, 시간 경계 및 특수문자 엣지케이스', () => {
    it('마감일 경계 시각(23:30 KST) 및 자정 직전 시각이 정확히 포맷팅 및 보존된다', () => {
      const startDate = '2026-10-09';
      const defaultDue = getDefaultDueDateKST(startDate);
      expect(defaultDue).toBe('2026-10-16 23:30');

      // 23:30 KST 문자열 파싱 및 일자 변환
      const dateStr = toKSTDateString('2026-10-16 23:30');
      expect(dateStr).toBe('2026-10-16');
    });

    it('예상 시간 0분, 실제 소요 시간 0분, 또는 음수 시간 발생 시 NaN 없이 안전하게 처리된다', () => {
      // 시작 시각과 종료 시각이 동일한 경우
      const start = '2026-10-02T10:00:00+09:00';
      const endSame = '2026-10-02T10:00:00+09:00';
      expect(calculateActualMinutes(start, endSame)).toBe(0);

      // 종료 시각이 시작 시각보다 앞서는 비정상 순서 (음수 방어)
      const endEarlier = '2026-10-02T09:00:00+09:00';
      expect(calculateActualMinutes(start, endEarlier)).toBe(0);

      // 평균 오차 포맷터 0분 처리
      expect(formatVarianceMinutes(0)).toBe('±0분');
    });

    it('120자 이상의 긴 텍스트와 특수문자(따옴표, 백틱, 줄바꿈, 이모지) 입력 시 필드 손상 없이 온전히 저장된다', () => {
      const longTitle = 'A'.repeat(150);
      const specialDesc = `따옴표 'single' 및 "double", 백틱 \`code\`, 개행 \n 다음 줄, 특수기호 <>&%$#, 이모지 🛡️🚀`;

      const pkg = firestorePlanPackageRepository.addTask('plan-01', {
        title: longTitle,
        description: specialDesc,
        estimatedMinutes: 0,
      });

      const task = pkg.tasks.find((t) => t.title === longTitle);
      expect(task).toBeDefined();
      expect(task?.title.length).toBe(150);
      expect(task?.description).toBe(specialDesc);
      expect(task?.estimatedMinutes).toBe(0);
    });
  });

  describe('4. XSS 인젝션 페이로드 엣지케이스 (T06-C57)', () => {
    it('다양한 변형 XSS 공격 벡터를 계획 본문 및 할 일 필드에 주입해도 문자열 그대로 안전하게 격리된다', () => {
      const xssVectors = [
        '<svg onload=alert(1)>',
        'javascript:void(0)',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<body onload=alert(1)>',
        '"><script>alert(document.domain)</script>',
      ];

      for (const vector of xssVectors) {
        const pkg = firestorePlanPackageRepository.addTask('plan-01', {
          title: vector,
          description: vector,
        });

        const addedTask = pkg.tasks.find((t) => t.title === vector);
        expect(addedTask).toBeDefined();
        expect(addedTask?.title).toBe(vector);
        expect(addedTask?.description).toBe(vector);
      }

      // JSON 내보내기 시에도 XSS 벡터가 원문 텍스트 노드로 안전하게 보존됨
      const exported = generateExportData(firestorePlanPackageRepository.loadPackages());
      const tasksInExport = exported.data.tasks;
      for (const vector of xssVectors) {
        const found = tasksInExport.find((t) => t.title === vector);
        expect(found).toBeDefined();
        expect(found?.title).toBe(vector);
      }
    });
  });

  describe('5. 오프라인 캐시 및 스토리지 예외 방어 엣지케이스', () => {
    it('localStorage에 잘못된 JSON 문자열이 저장되어 있어도 크래시 없이 기본 데이터로 복구된다', () => {
      localStorageMock.setItem('aleph06_plan_packages', '{invalid json corrupted');
      expect(() => {
        firestorePlanPackageRepository['initCacheFromLocal']();
      }).not.toThrow();

      const pkgs = firestorePlanPackageRepository.loadPackages();
      expect(pkgs.length).toBeGreaterThan(0);
      expect(pkgs[0].id).toBe('plan-01');
    });

    it('localStorage가 비어있거나 빈 배열([])일 때 기본 INITIAL_PLAN_PACKAGES로 복구된다', () => {
      localStorageMock.setItem('aleph06_plan_packages', '[]');
      firestorePlanPackageRepository['initCacheFromLocal']();
      const pkgs = firestorePlanPackageRepository.loadPackages();
      expect(pkgs.length).toBeGreaterThanOrEqual(1);
      expect(pkgs[0].id).toBe('plan-01');
    });

    it('localStorage.setItem이 QuotaExceededError를 던져도 캐시 동작이 중단되지 않는다', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      expect(() => {
        firestorePlanPackageRepository.addTask('plan-01', { title: '용량 초과 테스트' });
      }).not.toThrow();

      const pkgs = firestorePlanPackageRepository.loadPackages();
      const found = pkgs.find((p) => p.id === 'plan-01')?.tasks.find((t) => t.title === '용량 초과 테스트');
      expect(found).toBeDefined();

      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('6. 돌아보기 동적 집계 엣지케이스 (T06-C81)', () => {
    it('기간 내에 일치하는 데이터가 0건인 경우 분모 0 나눗셈 없이 오차 ±0분 및 0건을 반환한다', () => {
      // 데이터가 없는 미래 범위 (2030-01-01 ~ 2030-01-07)
      const startDate = '2030-01-01';
      const endDate = '2030-01-07';
      const packages = firestorePlanPackageRepository.loadPackages();

      const filteredPlans = packages.filter((pkg) => {
        if (pkg.period && pkg.trashStatus !== 1) {
          return pkg.period.start <= endDate && pkg.period.end >= startDate;
        }
        return false;
      });
      expect(filteredPlans.length).toBe(0);

      const allTasks = packages.filter((p) => p.trashStatus !== 1).flatMap((p) => p.tasks);
      const completedTasks = allTasks.filter((t) => {
        if (!t.done || t.status !== 'done' || !t.completedAt || t.trashStatus === 1) return false;
        const d = toKSTDateString(t.completedAt);
        return d >= startDate && d <= endDate;
      });
      expect(completedTasks.length).toBe(0);

      // 오차 계산
      const totalDiff = 0;
      const avgDiff = completedTasks.length > 0 ? Math.round(totalDiff / completedTasks.length) : 0;
      expect(avgDiff).toBe(0);
      expect(formatVarianceMinutes(avgDiff)).toBe('±0분');
    });
  });

  describe('7. 결정적 4차 정렬 및 동률 처리 (T06-C20)', () => {
    it('마감일, 우선순위, 제목이 모두 동일할 때 ID 오름차순(4차 정렬 키)으로 일관된 순서를 유지한다', () => {
      const identicalTasks: TaskItem[] = [
        {
          id: 't-99',
          title: '동일 제목',
          done: false,
          startDate: '2026-10-01',
          dueDate: '2026-10-10 23:30',
          priority: 'high',
          status: 'todo',
          tags: [],
          createdAt: '2026-10-01',
        },
        {
          id: 't-10',
          title: '동일 제목',
          done: false,
          startDate: '2026-10-01',
          dueDate: '2026-10-10 23:30',
          priority: 'high',
          status: 'todo',
          tags: [],
          createdAt: '2026-10-01',
        },
        {
          id: 't-50',
          title: '동일 제목',
          done: false,
          startDate: '2026-10-01',
          dueDate: '2026-10-10 23:30',
          priority: 'high',
          status: 'todo',
          tags: [],
          createdAt: '2026-10-01',
        },
      ];

      const sorted = [...identicalTasks].sort(compareTasksDeterministic);
      expect(sorted[0].id).toBe('t-10');
      expect(sorted[1].id).toBe('t-50');
      expect(sorted[2].id).toBe('t-99');
    });
  });
});
