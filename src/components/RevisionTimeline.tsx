import React, { useEffect, useState, useCallback } from 'react';
import { PaginatedRevisions, Priority, PlanPeriod } from '../types/plan';
import { planService } from '../services/planService';
import { History, ChevronLeft, ChevronRight, Stamp } from 'lucide-react';

interface RevisionTimelineProps {
  planId: string;
  refreshTrigger?: number;
}

export const RevisionTimeline: React.FC<RevisionTimelineProps> = ({
  planId,
  refreshTrigger = 0,
}) => {
  const [data, setData] = useState<PaginatedRevisions>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 5,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 책장 넘김 애니메이션 상태 ('idle' | 'flipping-next' | 'flipping-prev')
  const [flipState, setFlipState] = useState<'idle' | 'flipping-next' | 'flipping-prev'>('idle');

  const fetchRevisions = useCallback(
    async (pageToLoad: number) => {
      try {
        setLoading(true);
        setError(null);
        const result = await planService.getPlanRevisions(planId, pageToLoad, 5);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '수정 이력을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [planId]
  );

  useEffect(() => {
    fetchRevisions(1);
  }, [fetchRevisions, refreshTrigger]);

  /**
   * 책장 넘김 애니메이션과 함께 페이지 전환
   */
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > data.totalPages || flipState !== 'idle' || loading) return;

    const direction = newPage > data.page ? 'flipping-next' : 'flipping-prev';
    setFlipState(direction);

    // 1단계: 책장이 반쯤 넘어감 (180ms) 후 데이터 전환
    setTimeout(async () => {
      await fetchRevisions(newPage);
      // 2단계: 새 페이지가 펴지며 제자리로 복귀 (180ms)
      setTimeout(() => {
        setFlipState('idle');
      }, 180);
    }, 180);
  };

  /**
   * ISO 8601 날짜를 YY.MM.DD HH:mm 규격으로 변환
   */
  const formatRevisionDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${yy}.${mm}.${dd} ${hh}:${min}`;
    } catch {
      return isoString;
    }
  };

  /**
   * 필드명 한글화 매핑
   */
  const getFieldLabel = (fieldKey: string): string => {
    switch (fieldKey) {
      case 'title':
        return '제목';
      case 'priority':
        return '우선순위';
      case 'period':
        return '기간';
      case 'estimatedHours':
        return '예상 시간';
      case 'criteria':
        return '성공 기준';
      default:
        return fieldKey;
    }
  };

  /**
   * 필드 값 포맷팅
   */
  const renderFieldValue = (fieldKey: string, val: unknown): string => {
    if (val === null || val === undefined) return '(없음)';
    if (fieldKey === 'priority') {
      const p = val as Priority;
      if (p === 'high') return '높음';
      if (p === 'medium') return '보통';
      if (p === 'low') return '낮음';
      return String(val);
    }
    if (fieldKey === 'period') {
      const period = val as PlanPeriod;
      if (period?.start && period?.end) {
        return `${period.start} ~ ${period.end}`;
      }
      return JSON.stringify(val);
    }
    if (fieldKey === 'estimatedHours') {
      return `${val}시간`;
    }
    if (fieldKey === 'criteria') {
      if (Array.isArray(val)) {
        return `${val.length}개 기준`;
      }
      return String(val);
    }
    return String(val);
  };

  // 플립 트랜스폼 스타일 계산
  const getFlipStyle = (): React.CSSProperties => {
    if (flipState === 'flipping-next') {
      return {
        transformOrigin: 'left center',
        transform: 'rotateY(-45deg) scale(0.96)',
        opacity: 0.35,
        filter: 'drop-shadow(-8px 4px 12px rgba(0,0,0,0.15))',
      };
    }
    if (flipState === 'flipping-prev') {
      return {
        transformOrigin: 'right center',
        transform: 'rotateY(45deg) scale(0.96)',
        opacity: 0.35,
        filter: 'drop-shadow(8px 4px 12px rgba(0,0,0,0.15))',
      };
    }
    return {
      transformOrigin: 'center center',
      transform: 'rotateY(0deg) scale(1)',
      opacity: 1,
    };
  };

  return (
    <div className="flex flex-col justify-between h-full select-none">
      <div className="space-y-2.5">
        {/* 헤더: 수정 이력 (Revision History) + 총 이력 건수 */}
        <div className="flex items-center justify-between pb-2.5 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-600" />
            <h2 className="font-sans text-sm font-bold text-stone-800">
              수정 이력 (Revision History)
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-stone-500 tracking-normal">
              TOTAL
            </span>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-700">
              {data.total}
            </span>
          </div>
        </div>

        {/* 수정 이력 목록 (스크롤바 완전 배제: overflow-hidden + 3D 플립 애니메이션) */}
        <div className="h-[400px] overflow-hidden perspective-1400">
          <div
            className="h-full flex flex-col justify-between transition-transform duration-180 ease-out"
            style={getFlipStyle()}
          >
            {loading && flipState === 'idle' ? (
              <div className="h-full flex items-center justify-center font-sans text-xs text-stone-400">
                이력 불러오는 중...
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center font-sans text-xs text-red-500">
                {error}
              </div>
            ) : data.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <Stamp className="w-8 h-8 stroke-1 text-stone-300 mb-2" />
                <p className="font-sans text-xs">수정 이력이 존재하지 않습니다.</p>
              </div>
            ) : (
              <div className="space-y-1.5 h-full flex flex-col justify-start">
                {data.items.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-2 rounded bg-white/80 border border-stone-200/90 shadow-2xs space-y-1 relative"
                  >
                    {/* 스냅샷 카드 헤더: 타임스탬프 + 불변 스탬프 배지 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-stone-700">
                          REV #{rev.revisionNumber}
                        </span>
                        <span className="font-mono text-[10px] text-stone-500">
                          {formatRevisionDate(rev.revisedAt)}
                        </span>
                      </div>

                      {/* 불변 스냅샷 스탬프 테두리 */}
                      <span className="border border-stone-300 rounded px-1.5 py-0.2 text-[9px] tracking-wider text-stone-500 font-mono uppercase bg-stone-50/80">
                        SNAPSHOT
                      </span>
                    </div>

                    {/* 변경된 필드 목록: 취소선(line-through) 렌더링 및 신규 값 인라인 대조 */}
                    <div className="space-y-0.5 pt-1 border-t border-stone-100">
                      {Object.entries(rev.changedFields).map(([key, change]) => {
                        const label = getFieldLabel(key);
                        const beforeText = renderFieldValue(key, change.before);
                        const afterText = renderFieldValue(key, change.after);

                        return (
                          <div
                            key={key}
                            className="text-[11px] font-sans flex items-start gap-1 leading-tight"
                          >
                            <span className="text-stone-500 font-medium shrink-0 min-w-[48px]">
                              [{label}]
                            </span>
                            <div className="flex-1 break-words flex flex-wrap items-center gap-x-1.5">
                              {/* 변경 전 값: 취소선 (line-through) */}
                              <span className="line-through text-stone-400">
                                {beforeText}
                              </span>
                              <span className="text-stone-400 font-mono text-[10px]">대체</span>
                              {/* 변경 후 값: 신규 값 인라인 대조 */}
                              <span className="text-stone-800 font-semibold">
                                {afterText}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 페이징 컨트롤러 (책장 넘김 인터랙션) */}
      <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handlePageChange(data.page - 1)}
            disabled={data.page <= 1 || flipState !== 'idle' || loading}
            className="p-1 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-0.5 active:scale-95"
            aria-label="이전 페이지 (책장 넘기기)"
            title="이전 페이지 넘기기"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="font-sans text-[10px] hidden sm:inline pr-0.5">이전</span>
          </button>

          <span className="font-mono text-xs text-stone-600 px-1.5 font-medium">
            {data.page} / {data.totalPages}
          </span>

          <button
            type="button"
            onClick={() => handlePageChange(data.page + 1)}
            disabled={data.page >= data.totalPages || flipState !== 'idle' || loading}
            className="p-1 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-0.5 active:scale-95"
            aria-label="다음 페이지 (책장 넘기기)"
            title="다음 페이지 넘기기"
          >
            <span className="font-sans text-[10px] hidden sm:inline pl-0.5">다음</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="font-mono text-[10px] text-stone-400">
          5 REVISIONS / PAGE
        </span>
      </div>
    </div>
  );
};
