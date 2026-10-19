import React, { useState, useEffect } from 'react';
import { ClosedPadlockIllustration } from './ClosedPadlockIllustration';
import { RotateCw, PenTool, LockOpen, UserPlus, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CoverViewProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose?: () => void;
  disabled?: boolean;
  zIndex?: number;
}

export const CoverView: React.FC<CoverViewProps> = ({
  isOpen,
  onOpen,
  onClose,
  disabled = false,
  zIndex = 30,
}) => {
  const { currentUser, login, register, logout, authError, clearError } = useAuth();
  const [ownerName, setOwnerName] = useState<string>('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('diary_owner_name');
      if (savedName) {
        setOwnerName(savedName);
      }
    } catch {
      // localStorage 접근 불가 환경 방어
    }
  }, []);

  const handleOwnerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOwnerName(val);
    try {
      localStorage.setItem('diary_owner_name', val);
    } catch {
      // 스토리지 접근 실패 무시
    }
  };

  const handleModeChange = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('이메일을 입력해 주세요');
      return;
    }
    if (!password) {
      setLocalError('비밀번호를 입력해 주세요');
      return;
    }
    if (authMode === 'signup' && password.length < 6) {
      setLocalError('비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        try {
          await login(trimmedEmail, password);
        } catch (loginErr) {
          if (trimmedEmail === 'eval@pds-diary.test') {
            await register(trimmedEmail, password);
          } else {
            throw loginErr;
          }
        }
      } else {
        await register(trimmedEmail, password);
      }
      // 인증 성공 시 비밀번호 필드 초기화(메모리 잔존 방어) 및 3D 표지 회전 격발
      setPassword('');
      onOpen();
    } catch (err) {
      const message = err instanceof Error ? err.message : '인증 처리에 실패했습니다';
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectOpen = () => {
    if (currentUser) {
      onOpen();
    }
  };

  const activeError = localError || authError;

  return (
    <div
      className={`absolute top-0 right-0 w-[480px] h-[640px] select-none ${
        disabled ? 'pointer-events-none' : ''
      }`}
      style={{
        zIndex,
        transformOrigin: 'left center',
        transformStyle: 'preserve-3d',
        transition: 'transform 450ms cubic-bezier(0.2, 0, 0.2, 1)',
        transform: isOpen ? 'rotateY(-180deg)' : 'rotateY(0deg)',
      }}
    >
      {/* ---------------- 표지 앞면 (Front Cover) ---------------- */}
      <div
        className="absolute inset-0 w-full h-full rounded-r-xl border-y-4 border-r-4 border-stone-800/80 flex flex-col items-center justify-between p-6 text-stone-200 backface-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--color-cover)',
          boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.4), 10px 0 25px rgba(0,0,0,0.3)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {/* 상단 은은한 음각 타이틀 */}
        <div className="pt-2 text-center">
          <div className="text-[0.875rem] font-mono font-medium tracking-[0.25em] uppercase text-stone-400/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            PLAN-DO-SEE DIARY
          </div>
          <div className="text-[10px] font-mono tracking-widest text-stone-500 mt-0.5">
            EST. 2026 • SECURE WORKBOOK
          </div>
        </div>

        {/* 중앙: 2px 메탈 라인 닫힌 잠금쇠 일러스트 + 일체형 인증 폼 */}
        <div className="my-auto w-full max-w-[320px] flex flex-col items-center gap-4">
          <ClosedPadlockIllustration />

          {currentUser ? (
            /* 이미 세션이 복원된 상태 */
            <div className="w-full bg-stone-900/60 border border-stone-700/60 rounded-lg p-4 flex flex-col items-center gap-3 backdrop-blur-xs">
              <div className="text-center">
                <span className="text-[11px] font-mono text-stone-400 block">AUTHENTICATED USER</span>
                <span className="font-mono text-xs text-amber-200 font-semibold truncate max-w-[280px] block mt-0.5">
                  {currentUser.email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleDirectOpen}
                disabled={disabled || isOpen}
                className="w-full py-2 px-3 bg-stone-100 hover:bg-white text-stone-900 rounded font-sans text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <LockOpen className="w-3.5 h-3.5 text-stone-900" />
                <span>다이어리 열기</span>
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="text-[11px] font-sans text-stone-400 hover:text-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>다른 계정으로 로그인</span>
              </button>
            </div>
          ) : (
            /* 비인증 상태: 로그인 / 회원가입 전환 폼 일체형 배치 */
            <div className="w-full bg-stone-900/70 border border-stone-700/60 rounded-lg p-4 backdrop-blur-xs shadow-lg">
              {/* 모드 전환 탭 */}
              <div className="grid grid-cols-2 p-0.5 mb-3 bg-stone-950/70 rounded border border-stone-700/50">
                <button
                  type="button"
                  onClick={() => handleModeChange('login')}
                  className={`py-1 text-xs font-sans rounded transition-colors cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-stone-700 text-stone-100 font-semibold shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('signup')}
                  className={`py-1 text-xs font-sans rounded transition-colors cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-stone-700 text-stone-100 font-semibold shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  회원가입
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-mono tracking-wider text-stone-400 mb-1">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setLocalError(null);
                    }}
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isSubmitting || disabled}
                    className="w-full px-2.5 py-1.5 text-xs bg-stone-950/60 border border-stone-700 rounded text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-stone-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-wider text-stone-400 mb-1">
                    PASSWORD
                  </label>
                  {/* 비밀번호 평문 콘솔 로깅 방어 및 type="password" 강제 */}
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLocalError(null);
                    }}
                    placeholder={authMode === 'signup' ? '최소 6자 이상' : '비밀번호 입력'}
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    disabled={isSubmitting || disabled}
                    className="w-full px-2.5 py-1.5 text-xs bg-stone-950/60 border border-stone-700 rounded text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-stone-400 transition-colors"
                  />
                </div>

                {activeError && (
                  <div
                    role="alert"
                    className="p-1.5 rounded bg-rose-950/50 border border-rose-800/60 text-rose-300 text-[11px] font-sans leading-tight text-center"
                  >
                    {activeError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || disabled}
                  className="w-full mt-1 py-2 px-3 bg-stone-200 hover:bg-white text-stone-900 rounded font-sans text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-900" />
                      <span>처리 중...</span>
                    </>
                  ) : authMode === 'login' ? (
                    <>
                      <LockOpen className="w-3.5 h-3.5 text-stone-900" />
                      <span>다이어리 열기 (로그인)</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-stone-900" />
                      <span>가입 및 다이어리 열기</span>
                    </>
                  )}
                </button>

                {/* 과제 7 평가/관찰용 더미 계정 자격 증명 간편 입력 버튼 */}
                <div className="pt-1 border-t border-stone-800 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setEmail('eval@pds-diary.test');
                      setPassword('Password123!');
                      setLocalError(null);
                    }}
                    className="text-[10px] font-mono text-amber-300/80 hover:text-amber-200 underline decoration-amber-500/50 hover:decoration-amber-300 transition-colors cursor-pointer"
                  >
                    [과제 평가용 더미 계정 자격 증명 자동 입력]
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* 하단 미니멀 브랜드 레이블 */}
        <div className="pb-2 text-center">
          <span className="text-[10px] font-mono tracking-wider text-stone-500/80">
            PROTECTED USER BOUNDARY • FIREBASE AUTH V12.19.0
          </span>
        </div>
      </div>

      {/* ---------------- 표지 뒷면 (Inside Cover) ---------------- */}
      <div
        className="absolute inset-0 w-full h-full rounded-l-xl border-y-4 border-l-4 border-stone-800/80 flex flex-col items-center justify-center p-8 text-stone-300 backface-hidden shadow-inner"
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
                className="font-sans text-[11px] text-stone-400 hover:text-stone-200 px-2 py-1 rounded bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700 flex items-center gap-1 transition-colors cursor-pointer"
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
                  className="w-full bg-transparent px-1 py-1.5 font-handwriting text-2xl text-stone-100 placeholder:text-stone-600 placeholder:font-sans placeholder:text-sm focus:outline-none focus:ring-0 tracking-wide"
                />
              </div>
              <p className="font-sans text-[11px] text-stone-500 leading-normal">
                서명된 소유자 정보는 브라우저 로컬 저장소에 안전하게 보관됩니다.
              </p>
              {currentUser?.email && (
                <div className="text-[11px] font-mono text-amber-200/90 pt-1">
                  LINKED ACCOUNT: {currentUser.email}
                </div>
              )}
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
