import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { firestorePlanPackageRepository } from './firestorePlanPackageRepository';
import { planPackageService } from './planPackageService';
import type { PlanPackage } from '../types/binder';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn((_db: any, name: string) => ({ collName: name })),
    doc: vi.fn((_db: any, coll: string, id: string) => ({ coll, id })),
    query: vi.fn((coll: any, ..._args: any[]) => coll),
    where: vi.fn(() => ({})),
    getDocs: vi.fn(),
    onSnapshot: vi.fn((_q: any, _callback: any) => {
      return vi.fn();
    }),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
    runTransaction: vi.fn(),
  };
});

vi.mock('../lib/firebase', () => {
  let mockUser: any = null;
  return {
    auth: {
      get currentUser() {
        return mockUser;
      },
      set currentUser(user: any) {
        mockUser = user;
      },
      onAuthStateChanged: vi.fn((callback: (user: any) => void) => {
        // 등록 즉시 현재 상태 전달
        callback(mockUser);
        return vi.fn();
      }),
    },
    db: {},
    app: {},
  };
});

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

describe('실 사용자 데이터 흐름 및 라이프사이클 E2E 통합 검증', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    firestorePlanPackageRepository.cleanup();
  });

  it('시나리오 1: 신규 가입자(Clean State) 로그인 시 빈 캐시로 시작하고 옵저버 구독이 동작해야 함', () => {
    (auth as any).currentUser = { uid: 'user-clean-01', email: 'newbie@example.com' };
    
    // 리포지토리 캐시 초기화
    (firestorePlanPackageRepository as any).initCacheFromLocal();
    const initialPackages = planPackageService.loadPackages();
    expect(initialPackages).toEqual([]);

    // 구독자 등록 테스트
    let subscribedData: PlanPackage[] | null = null;
    const unsubscribe = planPackageService.subscribe((pkgs) => {
      subscribedData = pkgs;
    });

    // 계획 생성 시 옵저버로 즉시 전파되는지 확인
    const created = planPackageService.createPackage('첫 번째 계획');
    expect(created.title).toBe('첫 번째 계획');
    expect(subscribedData).not.toBeNull();
    expect(subscribedData!.length).toBe(1);
    expect(subscribedData![0].title).toBe('첫 번째 계획');

    unsubscribe();
  });

  it('시나리오 2: 로컬에서 계획 작성 중 Firestore 빈 스냅샷이 수신되어도 로컬 캐시가 소멸(Wipeout)되지 않아야 함', async () => {
    (auth as any).currentUser = { uid: 'user-wipeout-test', email: 'guard@example.com' };
    (firestorePlanPackageRepository as any).initCacheFromLocal();

    // 1. 사용자가 계획을 로컬에 작성 및 저장
    const created = planPackageService.createPackage('소멸 방지 계획');
    planPackageService.updatePlanText(created.id, '수정된 제목', '본문 1줄\n본문 2줄');

    // 현재 캐시에 데이터 1건 존재 확인
    expect(planPackageService.loadPackages().length).toBe(1);
    expect(planPackageService.loadPackages()[0].content).toBe('본문 1줄\n본문 2줄');

    // 2. Firestore에서 아직 동기화가 반영되지 않아 빈 스냅샷을 반환하는 상황 시뮬레이션
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: true,
      docs: [],
    } as any);

    // refreshFromFirestore 직접 호출
    await (firestorePlanPackageRepository as any).refreshFromFirestore();

    // 3. 검증: 로컬 캐시가 빈 배열로 초기화되지 않고 안전하게 유지되어야 함!
    const packagesAfterSnapshot = planPackageService.loadPackages();
    expect(packagesAfterSnapshot.length).toBe(1);
    expect(packagesAfterSnapshot[0].title).toBe('수정된 제목');
  });

  it('시나리오 3: Firestore에서 원격 데이터가 갱신되면 옵저버를 통해 React로 자동 반영되어야 함', async () => {
    (auth as any).currentUser = { uid: 'user-remote-sync', email: 'sync@example.com' };
    (firestorePlanPackageRepository as any).initCacheFromLocal();

    let notificationCount = 0;
    let latestPackages: PlanPackage[] = [];
    planPackageService.subscribe((pkgs) => {
      notificationCount++;
      latestPackages = pkgs;
    });

    // Firestore에 기존 1건의 계획이 저장되어 있는 경우
    vi.mocked(firestore.getDocs).mockImplementation(async (q: any) => {
      if (q.collName === 'plans') {
        return {
          empty: false,
          docs: [
            {
              data: () => ({
                id: 'remote-plan-1',
                userId: 'user-remote-sync',
                title: '클라우드 저장 계획',
                content: '원격 본문',
                startPage: 1,
                trashStatus: 0,
                createdAt: '2026-10-19',
              }),
            },
          ],
        } as any;
      }
      return { empty: true, docs: [] } as any;
    });

    await (firestorePlanPackageRepository as any).refreshFromFirestore();

    // 검증: 옵저버가 호출되었고 원격 데이터가 최신화되었는가
    expect(latestPackages.length).toBe(1);
    expect(latestPackages[0].id).toBe('remote-plan-1');
    expect(latestPackages[0].title).toBe('클라우드 저장 계획');
  });
});
