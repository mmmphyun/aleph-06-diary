import React, { useState } from 'react';
import { SpineDivider } from './SpineDivider';
import { CoverView } from './CoverView';
import { DeskMemoSheet } from './DeskMemoSheet';
import { IndexTabs } from './IndexTabs';
import { WritingCanvas } from './WritingCanvas';
import { TitlePageView } from './TitlePageView';
import { ReviewSpreadView } from './ReviewSpreadView';
import { PageCascadeOverlay } from './PageCascadeOverlay';
import { SingleLeafFlipOverlay } from './SingleLeafFlipOverlay';
import { SectionTab, PlanPackage, TextRevision } from '../types/binder';
import { planPackageService } from '../services/planPackageService';
import { Trash2 } from 'lucide-react';

const TAB_ORDER: Record<SectionTab, number> = {
  writing: 0,
  review: 1,
  archive: 2,
};

interface BinderChassisProps {
  onCoverOpenChange?: (isOpen: boolean) => void;
  onRegisterCloseHandler?: (handler: () => void) => void;
}

export const BinderChassis: React.FC<BinderChassisProps> = ({
  onCoverOpenChange,
  onRegisterCloseHandler,
}) => {
  // 다이어리 개폐 상태: 'closed'(Frame 0 닫힘) | 'opened'(표지 열림 완료 후 바닥 고정)
  const [isOpen, setIsOpen] = useState(false);

  // 표지 3D 플립 애니메이션 진행 플래그 (450ms 동안 CoverView z-30 유지 후 바닥 z-10 안착)
  const [isCoverFlipping, setIsCoverFlipping] = useState(false);

  // 단일 낱장 속지 3D 플립 모션 플래그 및 방향
  const [isLeafFlipping, setIsLeafFlipping] = useState(false);
  const [leafFlipDirection, setLeafFlipDirection] = useState<'forward' | 'backward'>('forward');

  // 다중 계획 패키지 상태 (localStorage 연동)
  const [packages, setPackages] = useState<PlanPackage[]>(() =>
    planPackageService.loadPackages()
  );
  const [currentPackageId, setCurrentPackageId] = useState<string>(
    () => packages[0]?.id || 'plan-01'
  );
  // 미작성 상태의 유령 계획 스토리지 오염을 방지하는 임시 작성 상태 (Lazy Materialization)
  const [transientDraft, setTransientDraft] = useState<PlanPackage | null>(null);

  // 속표지(Leaf 01 Front) 수동 넘김 여부 (true일 때만 본문 양면 스프레드 진입)
  const [hasTurnedTitlePage, setHasTurnedTitlePage] = useState(false);

  // Tier 1: 우측 돌출 인덱스 탭 상태 ('writing' | 'review' | 'archive')
  const [activeTab, setActiveTab] = useState<SectionTab>('writing');

  // Tier 2: 기록 섹션 내부 스프레드 인덱스 (0: 계획, 1: 할 일, 2: 실행 일지)
  const [writingSpread, setWritingSpread] = useState(0);

  // Page Flip Cascade 모션 플래그 및 방향 (탭 전환 시 촤라락 넘김)
  const [isCascading, setIsCascading] = useState(false);
  const [cascadeDirection, setCascadeDirection] = useState<'forward' | 'backward'>('forward');

  // 계획 선택 핸들러
  const handleSelectPackage = (pkgId: string) => {
    if (currentPackageId === 'draft-transient') {
      setTransientDraft(null);
    }
    setCurrentPackageId(pkgId);
  };

  // 계획 신규 생성 핸들러 (속표지 캘린더 연동 - 명시적 폼 제출)
  const handleCreatePackage = (title: string, startDate?: string, endDate?: string) => {
    if (currentPackageId === 'draft-transient') {
      setTransientDraft(null);
    }
    const newPkg = planPackageService.createPackage(title, startDate, endDate);
    setPackages(planPackageService.loadPackages());
    setCurrentPackageId(newPkg.id);
  };

  // 임시 드래프트의 영속화(Commit Gate) 헬퍼
  const ensureCommittedPackageId = (initialTitle?: string, initialContent?: string): string => {
    if (currentPackageId === 'draft-transient' && transientDraft) {
      const finalTitle = (initialTitle ?? transientDraft.title).trim() || `새로운 계획 ${packages.length + 1}`;
      const newPkg = planPackageService.createPackage(
        finalTitle,
        transientDraft.period?.start,
        transientDraft.period?.end
      );
      if (initialContent !== undefined && initialContent !== '') {
        planPackageService.updatePlanText(newPkg.id, finalTitle, initialContent);
      }
      setPackages(planPackageService.loadPackages());
      setCurrentPackageId(newPkg.id);
      setTransientDraft(null);
      return newPkg.id;
    }
    return currentPackageId;
  };

  // 마지막 속지에서 다음 새 계획 패키지 연속 결속 핸들러 (Lazy Materialization: 즉시 저장하지 않고 메모리 임시 드래프트로 오픈)
  const handleAppendNewPlanPackage = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastPage = packages.length > 0 ? packages[packages.length - 1].startPage + 4 : 1;
    const draft: PlanPackage = {
      id: 'draft-transient',
      title: '',
      content: '',
      revisions: [],
      startPage: lastPage,
      tasks: [],
      logs: [],
      tasksTemplateApplied: false,
      planStatus: 'draft',
      period: { start: today, end: today },
      createdAt: today,
    };
    setTransientDraft(draft);
    setCurrentPackageId('draft-transient');
    setWritingSpread(0);
    setLeafFlipDirection('forward');
    setIsLeafFlipping(true);
    setTimeout(() => {
      setIsLeafFlipping(false);
    }, 280);
  };

  // 현재 선택된 패키지 객체 추출 및 챕터 번호 계산
  const isTransientActive = currentPackageId === 'draft-transient' && transientDraft !== null;
  const currentPackage: PlanPackage = isTransientActive
    ? transientDraft
    : packages.find((p) => p.id === currentPackageId) || packages[0];
  const chapterNumber = isTransientActive
    ? packages.length + 1
    : Math.max(1, packages.findIndex((p) => p.id === currentPackageId) + 1);

  // 계획 확정 핸들러
  const handleConfirmPlan = () => {
    const pkgId = ensureCommittedPackageId();
    planPackageService.confirmPlan(pkgId);
    setPackages(planPackageService.loadPackages());
  };

  // 계획 본문 업데이트 핸들러
  const handleUpdatePlan = (title: string, content: string) => {
    if (currentPackageId === 'draft-transient') {
      if (title.trim().length > 0 || content.trim().length > 0) {
        ensureCommittedPackageId(title, content);
      } else {
        setTransientDraft((prev) => (prev ? { ...prev, title, content } : null));
      }
      return;
    }
    planPackageService.updatePlanText(currentPackageId, title, content);
    setPackages(planPackageService.loadPackages());
  };

  // 만년필 취소선 교정 추가 핸들러
  const handleAddRevision = (rev: TextRevision) => {
    const pkgId = ensureCommittedPackageId();
    planPackageService.addRevision(pkgId, rev);
    setPackages(planPackageService.loadPackages());
  };

  // 할 일 추가 핸들러
  const handleAddTask = (input: string | import('../types/binder').TaskInputDto) => {
    const pkgId = ensureCommittedPackageId();
    planPackageService.addTask(pkgId, input);
    setPackages(planPackageService.loadPackages());
  };

  // 할 일 수정 핸들러
  const handleUpdateTask = (taskId: string, updates: Partial<import('../types/binder').TaskInputDto>) => {
    const pkgId = ensureCommittedPackageId();
    planPackageService.updateTask(pkgId, taskId, updates);
    setPackages(planPackageService.loadPackages());
  };

  // 할 일 삭제 핸들러
  const handleDeleteTask = (taskId: string) => {
    const pkgId = ensureCommittedPackageId();
    planPackageService.deleteTask(pkgId, taskId);
    setPackages(planPackageService.loadPackages());
  };

  // 할 일 토글 및 실행 일지 연쇄 생성 핸들러
  const handleToggleTask = (taskId: string, comment?: string, impediment?: string) => {
    const pkgId = ensureCommittedPackageId();
    const { packages: updatedPackages } = planPackageService.toggleTaskDone(
      pkgId,
      taskId,
      comment,
      impediment
    );
    setPackages(updatedPackages);
  };

  // 실행 일지 성찰 코멘트 수정 핸들러
  const handleUpdateLogComment = (logId: string, comment: string) => {
    const pkgId = ensureCommittedPackageId();
    planPackageService.updateLogComment(pkgId, logId, comment);
    setPackages(planPackageService.loadPackages());
  };

  // 실행 일지 코멘트 및 장애 요인 수정 핸들러
  const handleUpdateLog = (logId: string, updates: { comment?: string; impediment?: string }) => {
    const pkgId = ensureCommittedPackageId();
    planPackageService.updateLog(pkgId, logId, updates);
    setPackages(planPackageService.loadPackages());
  };

  // 빈 속지에서 할 일 템플릿 적용 핸들러
  const handleApplyTasksTemplate = () => {
    const pkgId = ensureCommittedPackageId();
    planPackageService.applyTasksTemplate(pkgId);
    setPackages(planPackageService.loadPackages());
  };

  // 앞표지 오픈: 단 1회 좌측 바닥(Inside Cover)으로 안착 후 영구 고정
  const handleOpenCover = () => {
    setIsOpen(true);
    setIsCoverFlipping(true);
    setHasTurnedTitlePage(false);
    onCoverOpenChange?.(true);
    setTimeout(() => {
      setIsCoverFlipping(false);
    }, 450);
  };

  // 앞표지 닫기: 닫힌 상태로 복귀
  const handleCloseCover = () => {
    if (currentPackageId === 'draft-transient') {
      setTransientDraft(null);
      setCurrentPackageId(packages[0]?.id || 'plan-01');
    }
    setIsCoverFlipping(true);
    setIsOpen(false);
    setHasTurnedTitlePage(false);
    setWritingSpread(0);
    setActiveTab('writing');
    onCoverOpenChange?.(false);
    setTimeout(() => {
      setIsCoverFlipping(false);
    }, 450);
  };

  // 속표지(Leaf 01) 넘김 핸들러: 실물 낱장 속지 3D 플립 후 본문 양면 스프레드로 진입
  const handleTurnTitlePage = () => {
    if (isLeafFlipping) return;
    setWritingSpread(0);
    setLeafFlipDirection('forward');
    setIsLeafFlipping(true);
    setTimeout(() => {
      setHasTurnedTitlePage(true);
    }, 140);
    setTimeout(() => {
      setIsLeafFlipping(false);
    }, 280);
  };

  // 본문에서 속표지로 뒤로가기 핸들러
  const handleReturnToTitlePage = () => {
    if (isLeafFlipping) return;
    if (currentPackageId === 'draft-transient') {
      setTransientDraft(null);
      setCurrentPackageId(packages[0]?.id || 'plan-01');
    }
    setLeafFlipDirection('backward');
    setIsLeafFlipping(true);
    setTimeout(() => {
      setHasTurnedTitlePage(false);
      setActiveTab('writing');
      setWritingSpread(0);
    }, 140);
    setTimeout(() => {
      setIsLeafFlipping(false);
    }, 280);
  };

  // 기록 섹션 내부 스프레드 간 3D 낱장 넘김 핸들러 (계획 ↔ 할 일 ↔ 실행 일지)
  const handleNavigateWritingSpread = (nextSpread: number) => {
    if (isLeafFlipping || nextSpread === writingSpread) return;
    const direction = nextSpread > writingSpread ? 'forward' : 'backward';
    setLeafFlipDirection(direction);
    setIsLeafFlipping(true);
    setTimeout(() => {
      setWritingSpread(nextSpread);
    }, 140);
    setTimeout(() => {
      setIsLeafFlipping(false);
    }, 280);
  };

  // 상위 컴포넌트에 표지 닫기 핸들러 등록
  React.useEffect(() => {
    if (onRegisterCloseHandler) {
      onRegisterCloseHandler(handleCloseCover);
    }
  }, [onRegisterCloseHandler]);

  // 인덱스 탭 전환 (Page Flip Cascade 3D 다중 플립 모션)
  const handleSelectTab = (tab: SectionTab) => {
    if (tab === activeTab || isCascading) return;
    if (currentPackageId === 'draft-transient') {
      setTransientDraft(null);
      setCurrentPackageId(packages[0]?.id || 'plan-01');
    }
    const direction = TAB_ORDER[tab] > TAB_ORDER[activeTab] ? 'forward' : 'backward';
    setCascadeDirection(direction);
    setIsCascading(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsCascading(false);
    }, 360);
  };

  return (
    <div className="relative w-[960px] h-[640px] perspective-1400">
      {/* ========================================================================= */}
      {/* [레이어 1: 닫힘 상태 베이스] 좌측 데스크 메모지 + 우측 닫힌 하드커버 앞표지 */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-between pointer-events-none">
        {/* 좌측 480px: 웜스톤 데스크 위의 에디토리얼 메모지 */}
        <div
          className={`w-[480px] h-[640px] flex items-center justify-center p-4 transition-opacity duration-300 ${
            !isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'
          }`}
        >
          <DeskMemoSheet />
        </div>

        {/* 우측 480px: 닫힌 다이어리 하드커버 베이스 */}
        <div
          className={`w-[480px] h-[640px] rounded-xl border-4 border-[#2E2A27] shadow-chassis relative transition-opacity duration-300 ${
            !isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundColor: 'var(--color-cover)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          }}
        />
      </div>

      {/* 우측 돌출 인덱스 탭 (State 0, 1에서는 peekOnly로 살짝 돌출, State 2 본문에서 완전 활성화) */}
      <IndexTabs
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        disabled={isCascading}
        peekOnly={!isOpen || !hasTurnedTitlePage}
      />

      {/* ========================================================================= */}
      {/* [레이어 2: 펼침 상태 양면 바인더 섀시 (960×640px)] 속지 캔버스 */}
      {/* ========================================================================= */}
      <div
        className={`absolute inset-0 w-[960px] h-[640px] rounded-xl border-4 border-[#2E2A27] shadow-chassis overflow-visible transition-opacity duration-300 ${
          !isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          backgroundColor: 'var(--color-cover)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          zIndex: !hasTurnedTitlePage || isLeafFlipping ? 25 : 20,
        }}
      >
        {/* 바인더 내부 양면 페이퍼 컨테이너 */}
        <div
          className={`relative w-full h-full flex rounded-lg overflow-hidden transform-style-preserve-3d transition-transform duration-250 ${
            isCascading ? 'scale-[0.99] opacity-95' : 'scale-100 opacity-100'
          }`}
        >
          {/* 중앙 제본선 음영 */}
          <div className="absolute left-[472px] top-0 bottom-0 z-30 pointer-events-none">
            <SpineDivider />
          </div>

          {/* 인덱스 탭 전환 시 촤라락 3D 다중 속지 플립 오버레이 */}
          <PageCascadeOverlay
            isCascading={isCascading}
            direction={cascadeDirection}
          />

          {/* 단일 낱장 속지 넘김 3D 플립 오버레이 */}
          <SingleLeafFlipOverlay
            isFlipping={isLeafFlipping}
            direction={leafFlipDirection}
          />

          {/* ---------------- 단계별 속지 컨텐츠 ---------------- */}
          {!hasTurnedTitlePage ? (
            /* [State 1: 속표지 단계 - 다이나믹 TOC 목차] 좌측은 투명 영역 (하부 Inside Cover 서명 폼 노출), 우측은 Leaf 01 Front */
            <div className="w-full h-full flex relative" style={{ zIndex: 25 }}>
              <div className="w-[480px] h-full pointer-events-none" />
              <TitlePageView
                packages={packages}
                currentPackageId={currentPackageId}
                onSelectPackage={handleSelectPackage}
                onCreatePackage={handleCreatePackage}
                onTurnPage={handleTurnTitlePage}
              />
            </div>
          ) : (
            /* [State 2: 본문 양면 스프레드 단계] */
            <>
              {activeTab === 'writing' && (
                /* [기록 캔버스] 계획 -> 할 일 -> 실행 일지 3대 섹션 전개 */
                <WritingCanvas
                  currentPackage={currentPackage}
                  currentSpread={writingSpread}
                  onNavigateSpread={handleNavigateWritingSpread}
                  onNavigateToTitlePage={handleReturnToTitlePage}
                  onUpdatePlan={handleUpdatePlan}
                  onAddRevision={handleAddRevision}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onToggleTask={handleToggleTask}
                  onUpdateLogComment={handleUpdateLogComment}
                  onUpdateLog={handleUpdateLog}
                  onApplyTasksTemplate={handleApplyTasksTemplate}
                  onConfirmPlan={handleConfirmPlan}
                  onAppendNewPlanPackage={handleAppendNewPlanPackage}
                  chapterNumber={chapterNumber}
                />
              )}

          {activeTab === 'review' && (
            /* [돌아보기 섹션] 달력 기반 4대 지표 집계 및 상세 네비게이션 뷰 */
            <ReviewSpreadView
              packages={packages}
              onSelectPackage={(pkgId) => {
                handleSelectPackage(pkgId);
                setActiveTab('writing');
              }}
              onNavigateToSection={(pkgId, spreadIndex) => {
                handleSelectPackage(pkgId);
                setWritingSpread(spreadIndex);
                setActiveTab('writing');
              }}
            />
          )}

          {activeTab === 'archive' && (
            /* [보관함 섹션] 좌 480px 삭제계획 + 우 480px 삭제할일 2면 분할 */
            <div className="w-full h-full flex">
              {/* 좌측 480px: 삭제된 계획 보관함 */}
              <div
                className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-[#E7E5E4]"
                style={{ backgroundColor: 'var(--color-paper)' }}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-purple-700" />
                      <span className="font-mono text-xs font-semibold text-stone-700">ARCHIVE SECTION</span>
                    </div>
                    <span className="font-mono text-[11px] text-stone-400">ARCHIVE P.01</span>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="font-serif text-2xl text-stone-800">지워진 생각의 보관함</div>
                      <p className="font-sans text-xs text-stone-500 mt-1 leading-relaxed">
                        삭제된 계획 카드가 구겨진 음영과 마스킹 테이프로 안전하게 보관되는 휴지통입니다.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-stone-100/80 border border-dashed border-stone-300 space-y-2 opacity-90">
                      <div className="flex items-center justify-between text-xs">
                        <span className="line-through text-stone-500 font-serif">2026 상반기 취미 플랜</span>
                        <span className="text-[10px] font-mono text-stone-400">삭제됨</span>
                      </div>
                      <button
                        type="button"
                        className="text-[11px] text-blue-700 hover:text-blue-900 font-medium cursor-pointer"
                      >
                        ↶ 계획 복구
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
                  <span>ALEPH-06 ARCHIVE</span>
                  <span>ARCHIVE P.01</span>
                </div>
              </div>

              {/* 우측 480px: 삭제된 할 일 목록 */}
              <div
                className="w-[480px] h-full p-8 flex flex-col justify-between"
                style={{ backgroundColor: 'var(--color-paper)' }}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <span className="font-mono text-xs font-semibold text-stone-700">DELETED TASKS</span>
                    <span className="font-mono text-[11px] text-stone-400">ARCHIVE P.02</span>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="font-serif text-2xl text-stone-800">삭제된 할 일 목록</div>
                      <p className="font-sans text-xs text-stone-500 mt-1 leading-relaxed">
                        보관된 카드는 7일 동안 보관 후 영구 삭제 처리됩니다.
                      </p>
                    </div>
                    <div className="p-3 rounded bg-white border border-stone-200 flex items-center justify-between shadow-2xs opacity-80">
                      <span className="text-xs line-through text-stone-500">사용하지 않는 임시 테스트 메모</span>
                      <button
                        type="button"
                        className="text-xs text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        영구 삭제
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
                  <span>ALEPH-06 ARCHIVE</span>
                  <span>ARCHIVE P.02</span>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [레이어 3: 앞표지 (CoverView)] */}
      {/* 최초 1회만 -180도 열려 좌측 바닥(Inside Cover)으로 안착 후 영구 고정 */}
      {/* ========================================================================= */}
      <CoverView
        isOpen={isOpen}
        onOpen={handleOpenCover}
        onClose={handleCloseCover}
        disabled={false}
        zIndex={!isOpen || isCoverFlipping ? 30 : (!hasTurnedTitlePage ? 25 : 10)}
      />
    </div>
  );
};
