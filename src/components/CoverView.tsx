import React, { useState, useEffect } from 'react';
import { OpenPadlockIllustration } from './OpenPadlockIllustration';
import { NoticeMemoSticky } from './NoticeMemoSticky';
import { RotateCw, PenTool } from 'lucide-react';

interface CoverViewProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose?: () => void;
  disabled?: boolean;
}

export const CoverView: React.FC<CoverViewProps> = ({
  isOpen,
  onOpen,
  onClose,
  disabled = false,
}) => {
  const [ownerName, setOwnerName] = useState<string>('');

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('diary_owner_name');
      if (savedName) {
        setOwnerName(savedName);
      }
    } catch {
      // localStorage 접근 불가 환경(예: private browsing 보안 제한) 방어
    }
  }, []);

  const handleOwnerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOwnerName(val);
    try {
      localStorage.setItem('diary_owner_name', val);
    } catch {
      // localStorage 할당 초과 또는 보안 제한 무시
    }
  };

  return (
    <div
      className={`absolute top-0 right-0 w-[480px] h-[640px] z-30 select-none ${
        disabled ? 'pointer-events-none' : ''
      }`}
      style={{
        transformOrigin: 'left center',
        transformStyle: 'preserve-3d',
        transition: 'transform 450ms cubic-bezier(0.2, 0, 0.2, 1)',
        transform: isOpen ? 'rotateY(-180deg)' : 'rotateY(0deg)',
      }}
    >
      {/* ---------------- 표지 앞면 (Front Cover) ---------------- */}
      <div
        className="absolute inset-0 w-full h-full rounded-r-xl border-y-4 border-r-4 border-[#2E2A27]/80 flex flex-col items-center justify-between p-8 text-stone-200 backface-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--color-cover)',
          boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.4), 10px 0 25px rgba(0,0,0,0.3)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {/* 상단 은은한 음각 타이틀 */}
        <div className="pt-6 text-center">
          <div className="text-[0.875rem] font-mono font-medium tracking-[0.25em] uppercase text-stone-400/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            PLAN-DO-SEE DIARY
          </div>
          <div className="text-[10px] font-mono tracking-widest text-stone-500 mt-1">
            EST. 2026 • WORKBOOK
          </div>
        </div>

        {/* 중앙 정밀 2px 메탈 라인 잠금쇠 일러스트 */}
        <div className="my-auto flex flex-col items-center gap-6">
          <OpenPadlockIllustration />

          {/* T06-C82 필수 안내 포스트잇 */}
          <NoticeMemoSticky onOpen={onOpen} disabled={disabled || isOpen} />
        </div>

        {/* 하단 미니멀 브랜드 레이블 */}
        <div className="pb-4 text-center">
          <span className="text-[11px] font-mono tracking-wider text-stone-500/80">
            PRIVATE LOCAL MEMORY
          </span>
        </div>
      </div>

      {/* ---------------- 표지 뒷면 (Inside Cover): 180도 회전했을 때 좌측에 보이는 하드커버 안쪽 ---------------- */}
      <div
        className="absolute inset-0 w-full h-full rounded-l-xl border-y-4 border-l-4 border-[#2E2A27]/80 flex flex-col items-center justify-center p-8 text-stone-300 backface-hidden shadow-inner"
        style={{
          backgroundColor: 'var(--color-cover)',
          transform: 'rotateY(180deg)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <div className="w-full h-full border border-stone-600/30 rounded-lg p-6 flex flex-col justify-between bg-stone-900/40">
          {/* 상단 시스템 라벨 및 닫기 버튼 */}
          <div className="flex items-center justify-between border-b border-stone-700/50 pb-3">
            <div className="text-xs font-mono text-stone-400">
              <div>INSIDE COVER</div>
              <div className="text-[10px] text-stone-500 mt-0.5">PLAN-DO-SEE NOTEBOOK</div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="font-sans text-[11px] text-stone-400 hover:text-stone-200 px-2 py-1 rounded bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700 flex items-center gap-1 transition-colors"
                title="표지 다시 닫기"
              >
                <RotateCw className="w-3 h-3" />
                <span>표지 닫기</span>
              </button>
            )}
          </div>

          {/* 중앙 소유자 서명 폼 */}
          <div className="my-auto w-full max-w-[340px] mx-auto space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-stone-400 text-xs font-mono tracking-wider">
                <PenTool className="w-3.5 h-3.5 text-stone-400" />
                <span>THIS DIARY BELONGS TO:</span>
              </div>
              <div className="relative border-b-2 border-stone-600/80 focus-within:border-stone-400 transition-colors">
                <input
                  type="text"
                  value={ownerName}
                  onChange={handleOwnerNameChange}
                  placeholder="이름을 서명하세요"
                  maxLength={30}
                  className="w-full bg-transparent px-1 py-1.5 font-handwriting text-2xl text-stone-100 placeholder:text-stone-600 placeholder:font-sans placeholder:text-sm outline-none tracking-wide"
                />
              </div>
              <p className="font-sans text-[11px] text-stone-500 leading-normal">
                서명된 소유자 정보는 브라우저 로컬 저장소에 안전하게 보관됩니다.
              </p>
            </div>

            <div className="pt-4 border-t border-stone-800 text-center font-handwriting text-stone-400 text-base leading-relaxed">
              "생각을 기록하고, 행동을 살피며, 삶을 반추하다"
            </div>
          </div>

          {/* 하단 시스템 정보 */}
          <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 border-t border-stone-800/60 pt-3">
            <span>REGISTERED OWNER</span>
            <span>ALEPH-06 • SYSTEM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

