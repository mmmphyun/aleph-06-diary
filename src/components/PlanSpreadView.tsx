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
  onNavigatePrevSpread?: () => void;
  startPage?: number;
  lineOffset?: number;
  nextSpreadLabel?: string;
  planStatus?: 'draft' | 'confirmed';
  onConfirmPlan?: () => void;
  chapterNumber?: number;
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
  onNavigatePrevSpread,
  startPage = 1,
  lineOffset = 0,
  nextSpreadLabel,
  planStatus = 'draft',
  onConfirmPlan,
  chapterNumber = 1,
}) => {
  // 본문 편집 모드 (양면 무스크롤 2-Pane 에디터) vs 판면 모드 (54px 격줄 렌더러 & 만년필 교정)
  const [isEditing, setIsEditing] = useState(false);
  const [showOverflowGuide, setShowOverflowGuide] = useState(false);

  // 무스크롤 양면 분할 입력 상태 (좌 7줄, 우 7줄)
  const [leftEditorText, setLeftEditorText] = useState('');
  const [rightEditorText, setRightEditorText] = useState('');

  // 드래그 선택 영역 플로팅 버블 상태
  const [selectionBubble, setSelectionBubble] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // 교정 팝오버 입력 상태
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const rightTextareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const LINES_PER_PAGE = 7;
  const chStr = `CH.${String(chapterNumber).padStart(2, '0')}`;
  const leftPageStr = `PLAN ${chStr} • P.${String(startPage).padStart(2, '0')}`;
  const rightPageStr = `PLAN ${chStr} • P.${String(startPage + 1).padStart(2, '0')}`;
  const contentLines = planContent.split('\n').filter(Boolean);
  const leftLines = contentLines.slice(lineOffset, lineOffset + LINES_PER_PAGE);
  const rightLines = contentLines.slice(lineOffset + LINES_PER_PAGE, lineOffset + LINES_PER_PAGE * 2);

  // 편집 모드 진입 시 양면 텍스트 분할 초기화
  const handleStartEditing = () => {
    if (planStatus === 'confirmed') return;
    const lines = planContent.split('\n');
    setLeftEditorText(lines.slice(lineOffset, lineOffset + LINES_PER_PAGE).join('\n'));
    setRightEditorText(lines.slice(lineOffset + LINES_PER_PAGE, lineOffset + LINES_PER_PAGE * 2).join('\n'));
    setIsEditing(true);
    setSelectionBubble(null);
  };

  // 편집 저장 및 전체 본문 병합
  const handleSaveEditing = () => {
    const leftTrimmed = leftEditorText.split('\n').slice(0, LINES_PER_PAGE);
    const rightTrimmed = rightEditorText.split('\n').slice(0, LINES_PER_PAGE);
    const updatedChunk = [...leftTrimmed, ...rightTrimmed].filter((l) => l.trim().length > 0);

    const allLines = planContent.split('\n');
    const before = allLines.slice(0, lineOffset);
    const after = allLines.slice(lineOffset + LINES_PER_PAGE * 2);
    const merged = [...before, ...updatedChunk, ...after].join('\n');
    onUpdateContent(merged);
    setIsEditing(false);
  };

  // 좌측 7행 에디터 줄바꿈 및 오버플로우 방어
  const handleLeftTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const lines = val.split('\n');
    if (lines.length > LINES_PER_PAGE) {
      // 7줄 초과 시 8번째 줄 이후 내용은 우측 에디터로 자동 전송
      setLeftEditorText(lines.slice(0, LINES_PER_PAGE).join('\n'));
      const overflow = lines.slice(LINES_PER_PAGE).join('\n');
      setRightEditorText((prev) => (prev ? `${overflow}\n${prev}` : overflow));
      rightTextareaRef.current?.focus();
    } else {
      setLeftEditorText(val);
    }
  };

  // 우측 7행 에디터 줄바꿈 제어 (최대 7줄 초과 방어 및 포화 가이드 표출)
  const handleRightTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const lines = val.split('\n');
    if (lines.length > LINES_PER_PAGE) {
      setRightEditorText(lines.slice(0, LINES_PER_PAGE).join('\n'));
      setShowOverflowGuide(true);
    } else {
      setRightEditorText(val);
      if (lines.length === LINES_PER_PAGE) {
        setShowOverflowGuide(true);
      } else {
        setShowOverflowGuide(false);
      }
    }
  };

  // 우측 에디터 키보드 엔터 감지 (7행 포화 시 추가 개행 차단 및 안내)
  const handleRightKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const lines = rightEditorText.split('\n');
      if (lines.length >= LINES_PER_PAGE) {
        e.preventDefault();
        setShowOverflowGuide(true);
      }
    }
  };

  // 오직 줄노트 판면 영역에서만 발동되는 드래그 선택 핸들러
  const handleRuledAreaMouseUp = (pane: 'left' | 'right') => {
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

    // 드래그된 텍스트가 실제 본문 내용에 포함되어 있는지 엄격 검사
    const targetLines = pane === 'left' ? leftLines : rightLines;
    const existsInLines = targetLines.some((l) => l.includes(selectedText));
    if (!existsInLines) {
      setSelectionBubble(null);
      return;
    }

    // 이미 교정된 텍스트와 중복 교정 방어 (1회 교정 원칙)
    const isAlreadyRevised = revisions.some(
      (r) => r.originalText.includes(selectedText) || selectedText.includes(r.originalText)
    );
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

  // 줄 텍스트 내부의 취소선 및 교정문 렌더링 헬퍼
  const renderLineWithRevisions = (lineText: string) => {
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
    <div ref={containerRef} className="relative w-full h-full flex select-text">
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
      {/* [좌측 면: Plan Left (480×640px)] 1~7번째 줄 */}
      {/* ========================================================================= */}
      <div
        ref={leftPaneRef}
        className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-[#E7E5E4]"
        style={{ backgroundColor: 'var(--color-paper)' }}
      >
        <div>
          {/* 상단 섹션 헤더 */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-stone-700">PLAN-DO-SEE</span>
              {planStatus === 'confirmed' ? (
                <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  ✓ 계획 확정 (교정 모드)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onConfirmPlan}
                  className="font-mono text-[10px] text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="계획을 확정 날인합니다. 이후 자유 편집은 잠기며 만년필 1회 교정만 가능합니다."
                >
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  <span>계획 확정 날인</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {planStatus === 'draft' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      handleSaveEditing();
                    } else {
                      handleStartEditing();
                    }
                  }}
                  className="flex items-center gap-1 font-sans text-[11px] text-stone-600 hover:text-stone-900 px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 cursor-pointer transition-colors"
                  title={isEditing ? '작성 완료 및 판면 복귀' : '본문 양면 무스크롤 편집'}
                >
                  {isEditing ? <Check className="w-3 h-3 text-emerald-600" /> : <Edit3 className="w-3 h-3" />}
                  <span>{isEditing ? '작성 완료' : '본문 편집'}</span>
                </button>
              ) : (
                <span className="font-sans text-[10px] text-stone-400">만년필 교정 모드</span>
              )}
              <span className="font-mono text-[11px] text-stone-400">{leftPageStr}</span>
            </div>
          </div>

          {/* 계획 제목 손글씨 인풋 */}
          <div className="mt-3 pb-2 border-b-2 border-stone-400">
            <input
              type="text"
              value={planTitle}
              onChange={(e) => onUpdateTitle(e.target.value)}
              disabled={planStatus === 'confirmed'}
              className="w-full bg-transparent font-handwriting text-2xl text-stone-900 outline-none disabled:text-stone-700"
              placeholder="계획의 핵심 제목을 손글씨로 적으세요"
            />
          </div>

          {/* 좌측 줄노트 영역: 무스크롤 7행 에디터 vs 판면 모드 */}
          <div
            onMouseUp={() => handleRuledAreaMouseUp('left')}
            className="mt-3 h-[378px] bg-ruled-lines overflow-hidden space-y-0"
          >
            {isEditing ? (
              <textarea
                value={leftEditorText}
                onChange={handleLeftTextareaChange}
                rows={7}
                placeholder="1~7번째 줄을 작성하세요. 7줄을 초과하면 우측 페이지로 커서가 자동 점프합니다."
                className="w-full h-[378px] bg-transparent font-handwriting text-base text-stone-900 leading-[54px] p-0 outline-none resize-none overflow-hidden scrollbar-none"
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

        {/* 좌측 하단 정보 & 속표지/이전 장 뒤로가기 버튼 */}
        <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
          {onNavigatePrevSpread ? (
            <button
              type="button"
              onClick={onNavigatePrevSpread}
              className="font-sans text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              title="이전 장으로 돌아가기"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>이전 장 (계획)</span>
            </button>
          ) : onNavigateToTitlePage ? (
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
          <span>{leftPageStr}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [우측 면: Plan Right (480×640px)] 8~14번째 줄 */}
      {/* ========================================================================= */}
      <div
        ref={rightPaneRef}
        className="w-[480px] h-full p-8 flex flex-col justify-between"
        style={{ backgroundColor: 'var(--color-paper)' }}
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <span className="font-mono text-xs font-semibold text-stone-700">PLAN CONTINUED</span>
            <span className="font-mono text-[11px] text-stone-400">{rightPageStr}</span>
          </div>

          {/* 우측 줄노트 영역: 무스크롤 7행 에디터 vs 판면 모드 */}
          <div
            onMouseUp={() => handleRuledAreaMouseUp('right')}
            className="mt-6 h-[378px] bg-ruled-lines overflow-hidden space-y-0"
          >
            {isEditing ? (
              <textarea
                ref={rightTextareaRef}
                value={rightEditorText}
                onChange={handleRightTextareaChange}
                onKeyDown={handleRightKeyDown}
                rows={7}
                placeholder="8~14번째 줄이 이어집니다. 스크롤바 없이 7줄에 맞춰 정돈됩니다."
                className="w-full h-[378px] bg-transparent font-handwriting text-base text-stone-900 leading-[54px] p-0 outline-none resize-none overflow-hidden scrollbar-none"
              />
            ) : rightLines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <Sparkles className="w-7 h-7 text-stone-300 mb-2 stroke-1" />
                <p className="font-handwriting text-lg text-stone-500">
                  "좌측 페이지가 가득 차면
                  <br />
                  이곳으로 글이 자연스럽게 이어집니다."
                </p>
                <p className="font-sans text-[11px] text-stone-400 mt-2">
                  단어를 드래그하여 만년필 취소선을 긋거나 [본문 편집]을 눌러 글을 이어가세요.
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

          {/* 7행 초과 입력 포화 가이드 배너 */}
          {showOverflowGuide && (
            <div className="mt-2 p-2 rounded-lg bg-amber-50/95 border border-amber-300 text-amber-900 text-xs font-sans flex items-center justify-between shadow-2xs">
              <span className="truncate text-[11px]">
                현재 장이 가득 찼습니다. 우측 하단의 [다음 장 넘기기]를 눌러 새 속지에서 이어 쓰세요.
              </span>
              <button
                type="button"
                onClick={() => setShowOverflowGuide(false)}
                className="text-amber-700 hover:text-amber-950 font-bold ml-1 text-xs shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 우측 하단: 다음 섹션으로 새 장 넘김 버튼 */}
        <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
          <span className="font-mono text-[10px] text-stone-400">{rightPageStr}</span>
          <button
            type="button"
            onClick={onNavigateNextSpread}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            title="다음 페이지로 이동"
          >
            <span>{nextSpreadLabel || "새 장 넘겨 할 일 작성"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
