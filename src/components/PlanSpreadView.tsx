import React, { useState, useRef } from 'react';
import { TextRevision } from '../types/binder';
import { ArrowLeft, ArrowRight, Edit3, Check, PenTool, Sparkles } from 'lucide-react';

interface PlanSpreadViewProps {
  planTitle: string;
  onUpdateTitle: (title: string) => void;
  planContent: string;
  onUpdateContent: (content: string) => void;
  revisions: TextRevision[];
  onAddRevision: (rev: TextRevision) => void;
  onNavigateNextSpread: () => void;
  onNavigateToTitlePage?: () => void;
}

export const PlanSpreadView: React.FC<PlanSpreadViewProps> = ({
  planTitle,
  onUpdateTitle,
  planContent,
  onUpdateContent,
  revisions,
  onAddRevision,
  onNavigateNextSpread,
  onNavigateToTitlePage,
}) => {
  // 본문 편집 모드 (자유 연속 타이핑 및 자동 줄바꿈) vs 열람/교정 모드 (줄노트 판면 & 드래그 취소선)
  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState(planContent);

  // 드래그 선택 영역 플로팅 버블 상태
  const [selectionBubble, setSelectionBubble] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // 교정 팝오버 입력 상태
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // 마우스 드래그 선택 감지 핸들러
  const handleMouseUp = () => {
    if (isEditing) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      if (!isPopoverOpen) setSelectionBubble(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) {
      if (!isPopoverOpen) setSelectionBubble(null);
      return;
    }

    // 이미 교정된 텍스트와 중복 교정 방어 (1회 교정 원칙)
    const isAlreadyRevised = revisions.some((r) => r.originalText.includes(selectedText) || selectedText.includes(r.originalText));
    if (isAlreadyRevised) {
      setSelectionBubble(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setSelectionBubble({
        text: selectedText,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8,
      });
    }
  };

  // 교정 팝오버 열기
  const handleOpenCorrectionPopover = () => {
    if (!selectionBubble) return;
    setIsPopoverOpen(true);
    setCorrectionInput('');
  };

  // 교정 확정 및 영구 안착
  const handleConfirmRevision = () => {
    const trimmed = correctionInput.trim();
    if (!trimmed || !selectionBubble) {
      setIsPopoverOpen(false);
      setSelectionBubble(null);
      return;
    }

    const startIdx = planContent.indexOf(selectionBubble.text);
    const newRev: TextRevision = {
      id: `rev-${Date.now()}`,
      startIndex: startIdx >= 0 ? startIdx : 0,
      endIndex: startIdx >= 0 ? startIdx + selectionBubble.text.length : selectionBubble.text.length,
      originalText: selectionBubble.text,
      correctedText: trimmed,
      createdAt: '2026-10-02',
    };

    onAddRevision(newRev);
    setIsPopoverOpen(false);
    setSelectionBubble(null);
    window.getSelection()?.removeAllRanges();
  };

  // 편집 완료 및 본문 동기화
  const handleSaveContent = () => {
    onUpdateContent(tempContent);
    setIsEditing(false);
  };

  // 본문을 줄 단위로 분할 (좌측 7줄, 우측 7줄)
  const LINES_PER_PAGE = 7;
  const contentLines = planContent.split('\n').filter(Boolean);
  const leftLines = contentLines.slice(0, LINES_PER_PAGE);
  const rightLines = contentLines.slice(LINES_PER_PAGE, LINES_PER_PAGE * 2);

  // 줄 텍스트 내부의 취소선 및 교정문 렌더링 헬퍼
  const renderLineWithRevisions = (lineText: string) => {
    // 해당 줄에 걸쳐 있는 교정 항목 검색
    const matchedRev = revisions.find((r) => lineText.includes(r.originalText));

    if (!matchedRev) {
      return (
        <span className="font-handwriting text-base text-stone-900 leading-normal">
          {lineText}
        </span>
      );
    }

    const parts = lineText.split(matchedRev.originalText);
    return (
      <span className="font-handwriting text-base leading-normal">
        <span className="text-stone-900">{parts[0]}</span>
        {/* 아날로그 만년필 인라인 취소선 + 바로 아래 18px 교정문 */}
        <ruby className="inline-flex flex-col align-bottom">
          <span className="line-through text-stone-400 decoration-stone-500 decoration-2">
            {matchedRev.originalText}
          </span>
          <rt className="text-[12px] font-handwriting text-[#991B1B] -mt-1 leading-none tracking-wide block">
            ↳ {matchedRev.correctedText}
          </rt>
        </ruby>
        <span className="text-stone-900">{parts.slice(1).join(matchedRev.originalText)}</span>
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full flex select-text"
    >
      {/* ---------------- 플로팅 교정 버블 ---------------- */}
      {selectionBubble && !isPopoverOpen && !isEditing && (
        <div
          className="absolute z-50 -translate-x-1/2 -translate-y-full mb-1 animate-in fade-in zoom-in-95 duration-150"
          style={{ left: `${selectionBubble.x}px`, top: `${selectionBubble.y}px` }}
        >
          <button
            type="button"
            onClick={handleOpenCorrectionPopover}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900 text-stone-100 font-sans text-xs font-medium shadow-xl hover:bg-stone-800 transition-colors cursor-pointer border border-stone-700"
          >
            <PenTool className="w-3.5 h-3.5 text-red-400" />
            <span>만년필 교정하기</span>
          </button>
        </div>
      )}

      {/* ---------------- 만년필 교정문 입력 팝오버 ---------------- */}
      {isPopoverOpen && selectionBubble && (
        <div
          className="absolute z-50 -translate-x-1/2 -translate-y-full mb-2 w-72 bg-white rounded-lg p-3 shadow-2xl border border-stone-300 animate-in fade-in zoom-in-95 duration-150"
          style={{ left: `${selectionBubble.x}px`, top: `${selectionBubble.y}px` }}
        >
          <div className="text-[11px] font-mono text-stone-500 mb-1.5 flex items-center justify-between">
            <span>만년필 1회 교정</span>
            <span className="text-red-700 font-semibold">1회 한정</span>
          </div>
          <div className="text-xs font-handwriting text-stone-500 line-through mb-2 truncate">
            {selectionBubble.text}
          </div>
          <input
            type="text"
            value={correctionInput}
            onChange={(e) => setCorrectionInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmRevision();
            }}
            placeholder="수정할 손글씨 문구 입력..."
            autoFocus
            className="w-full bg-stone-50 border border-stone-300 rounded px-2 py-1.5 font-handwriting text-sm text-[#991B1B] outline-none focus:border-red-400 mb-2"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsPopoverOpen(false);
                setSelectionBubble(null);
              }}
              className="px-2.5 py-1 rounded text-stone-500 hover:text-stone-800 text-xs font-sans cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirmRevision}
              className="px-3 py-1 rounded bg-[#991B1B] hover:bg-red-800 text-white text-xs font-sans font-medium cursor-pointer shadow-xs"
            >
              교정 안착
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [좌측 면: Plan Left (480×640px)] */}
      {/* ========================================================================= */}
      <div
        className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-[#E7E5E4]"
        style={{ backgroundColor: 'var(--color-paper)' }}
      >
        <div>
          {/* 상단 섹션 헤더 */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-stone-700">PLAN-DO-SEE</span>
              <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                섹션 1: 계획 (Plan)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    handleSaveContent();
                  } else {
                    setTempContent(planContent);
                    setIsEditing(true);
                  }
                }}
                className="flex items-center gap-1 font-sans text-[11px] text-stone-600 hover:text-stone-900 px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 cursor-pointer transition-colors"
                title={isEditing ? '입력 완료' : '본문 전체 편집'}
              >
                {isEditing ? <Check className="w-3 h-3 text-emerald-600" /> : <Edit3 className="w-3 h-3" />}
                <span>{isEditing ? '작성 완료' : '본문 편집'}</span>
              </button>
              <span className="font-mono text-[11px] text-stone-400">PAGE 01</span>
            </div>
          </div>

          {/* 계획 제목 손글씨 인풋 */}
          <div className="mt-3 pb-2 border-b-2 border-stone-400">
            <input
              type="text"
              value={planTitle}
              onChange={(e) => onUpdateTitle(e.target.value)}
              className="w-full bg-transparent font-handwriting text-2xl text-stone-900 outline-none"
              placeholder="계획의 핵심 제목을 손글씨로 적으세요"
            />
          </div>

          {/* 좌측 줄노트 영역: 편집 모드(textarea) vs 판면 모드(54px 격줄 렌더러) */}
          <div className="mt-3 h-[380px] bg-ruled-lines overflow-hidden space-y-0">
            {isEditing ? (
              <textarea
                value={tempContent}
                onChange={(e) => setTempContent(e.target.value)}
                placeholder="계획 본문을 자유롭게 적으세요. Enter를 치거나 긴 글을 쓰면 자연스럽게 줄바꿈되며 우측 페이지로 이어집니다."
                className="w-full h-full bg-transparent font-handwriting text-base text-stone-900 leading-[54px] p-1 outline-none resize-none"
              />
            ) : (
              leftLines.map((lineText, idx) => (
                <div key={`left-line-${idx}`} className="h-[54px] flex items-center px-1">
                  {renderLineWithRevisions(lineText)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 좌측 하단 정보 & 속표지 뒤로가기 버튼 */}
        <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
          {onNavigateToTitlePage ? (
            <button
              type="button"
              onClick={onNavigateToTitlePage}
              className="font-sans text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              title="첫 장 속표지로 돌아가기"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>속표지 (Leaf 01)</span>
            </button>
          ) : (
            <span>격줄 교정 캔버스</span>
          )}
          <span>PAGE 01</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [우측 면: Plan Right (480×640px)] 이어지는 텍스트 및 새 장 넘김 */}
      {/* ========================================================================= */}
      <div
        className="w-[480px] h-full p-8 flex flex-col justify-between"
        style={{ backgroundColor: 'var(--color-paper)' }}
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <span className="font-mono text-xs font-semibold text-stone-700">PLAN CONTINUED</span>
            <span className="font-mono text-[11px] text-stone-400">PAGE 02</span>
          </div>

          {/* 우측 줄노트 영역 (좌측 7줄 초과분 자연 렌더링) */}
          <div className="mt-6 h-[400px] bg-ruled-lines overflow-hidden space-y-0">
            {isEditing ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 border border-dashed border-stone-200 rounded-lg">
                <Edit3 className="w-8 h-8 text-stone-300 mb-2 stroke-1" />
                <p className="font-handwriting text-base text-stone-600">
                  "좌측 페이지에서 본문을 자유롭게 작성 중입니다."
                </p>
                <p className="font-sans text-[11px] text-stone-400 mt-2">
                  작성을 마치고 상단 [작성 완료]를 누르면 우측 페이지까지 자연스럽게 정렬됩니다.
                </p>
              </div>
            ) : rightLines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <Sparkles className="w-7 h-7 text-stone-300 mb-2 stroke-1" />
                <p className="font-handwriting text-lg text-stone-500">
                  "좌측 페이지가 가득 차면
                  <br />
                  이곳으로 글이 자연스럽게 흘러옵니다."
                </p>
                <p className="font-sans text-[11px] text-stone-400 mt-2">
                  단어 드래그로 만년필 취소선을 긋거나, 상단 [본문 편집]으로 글을 추가하세요.
                </p>
              </div>
            ) : (
              rightLines.map((lineText, idx) => (
                <div key={`right-line-${idx}`} className="h-[54px] flex items-center px-1">
                  {renderLineWithRevisions(lineText)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 우측 하단: 다음 섹션(할 일)으로 새 장 넘김 버튼 */}
        <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
          <span className="font-mono text-[10px] text-stone-400">PAGE 02</span>
          <button
            type="button"
            onClick={onNavigateNextSpread}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            title="계획을 마치고 새로운 빈 속지로 넘어가 할 일 작성"
          >
            <span>새 장 넘겨 할 일 작성</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
