import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateLegacyDataToUser } from './migrationService';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(),
    writeBatch: vi.fn(),
  };
});

describe('migrationService - M2 1회성 데이터 마이그레이션 단위 테스트 (T07-C100)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('targetUserId가 비어있거나 올바르지 않으면 에러를 던진다', async () => {
    await expect(migrateLegacyDataToUser('')).rejects.toThrow(
      '유효한 targetUserId가 제공되지 않았습니다.'
    );
    await expect(migrateLegacyDataToUser('   ')).rejects.toThrow(
      '유효한 targetUserId가 제공되지 않았습니다.'
    );
  });

  it('기존 DB에 문서가 존재하는 경우 모든 문서에 userId를 일괄 update하고 무결성(lossCount: 0)을 입증한다', async () => {
    const mockPlanDoc1 = { id: 'plan-1', ref: { id: 'plan-1' } };
    const mockPlanDoc2 = { id: 'plan-2', ref: { id: 'plan-2' } };
    const mockTaskDocs = Array.from({ length: 7 }, (_, i) => ({
      id: `task-${i + 1}`,
      ref: { id: `task-${i + 1}` },
    }));
    const mockLogDocs = Array.from({ length: 4 }, (_, i) => ({
      id: `log-${i + 1}`,
      ref: { id: `log-${i + 1}` },
    }));

    vi.mocked(firestore.getDocs)
      .mockResolvedValueOnce({
        empty: false,
        docs: [mockPlanDoc1, mockPlanDoc2],
      } as any)
      .mockResolvedValueOnce({
        empty: false,
        docs: mockTaskDocs,
      } as any)
      .mockResolvedValueOnce({
        empty: false,
        docs: mockLogDocs,
      } as any);

    const updateCalls: Array<{ ref: any; data: any }> = [];
    const mockBatch = {
      update: vi.fn((ref, data) => {
        updateCalls.push({ ref, data });
      }),
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(firestore.writeBatch).mockReturnValue(mockBatch as any);

    const result = await migrateLegacyDataToUser('target-user-uid-123');

    expect(result.plansMigrated).toBe(2);
    expect(result.tasksMigrated).toBe(7);
    expect(result.logsMigrated).toBe(4);
    expect(result.totalBefore).toBe(13);
    expect(result.totalAfter).toBe(13);
    expect(result.lossCount).toBe(0);
    expect(result.isLossless).toBe(true);

    expect(mockBatch.update).toHaveBeenCalledTimes(13);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    expect(updateCalls.every((call) => call.data.userId === 'target-user-uid-123')).toBe(true);
  });

  it('기존 DB가 비어있는 경우 과제 6 초기 실데이터(plans 2, tasks 7, logs 4)를 set으로 마이그레이션한다', async () => {
    vi.mocked(firestore.getDocs)
      .mockResolvedValueOnce({ empty: true, docs: [] } as any)
      .mockResolvedValueOnce({ empty: true, docs: [] } as any)
      .mockResolvedValueOnce({ empty: true, docs: [] } as any);

    const setCalls: Array<{ ref: any; data: any }> = [];
    const mockBatch = {
      update: vi.fn(),
      set: vi.fn((ref, data) => {
        setCalls.push({ ref, data });
      }),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(firestore.writeBatch).mockReturnValue(mockBatch as any);
    vi.mocked(firestore.doc).mockImplementation((_db, coll, id) => ({ coll, id } as any));

    const result = await migrateLegacyDataToUser('seed-user-uid-456');

    expect(result.plansMigrated).toBe(2);
    expect(result.tasksMigrated).toBe(7);
    expect(result.logsMigrated).toBe(4);
    expect(result.lossCount).toBe(0);
    expect(result.isLossless).toBe(true);

    expect(mockBatch.set).toHaveBeenCalledTimes(13);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    expect(setCalls.every((call) => call.data.userId === 'seed-user-uid-456')).toBe(true);
  });
});
