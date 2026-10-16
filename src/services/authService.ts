import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type NextOrObserver,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

/**
 * Firebase Auth 에러 코드를 사용자 친화적 메시지로 정규화합니다.
 * 계정 열거(Account Enumeration) 공격 방어를 위해 존재하지 않는 계정과 비밀번호 불일치를 단일 메시지로 통일합니다.
 */
export const mapAuthError = (error: unknown): string => {
  const code = (error as { code?: string })?.code || '';

  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      // T07-C98: 계정 존재 여부 노출 방지를 위한 단일 오류 문구 강제
      return '아이디 또는 비밀번호가 올바르지 않습니다';
    case 'auth/email-already-in-use':
      // T07-C96: 중복 가입 거절 안내
      return '이미 등록된 이메일 계정입니다';
    case 'auth/invalid-email':
      return '유효한 이메일 형식이 아닙니다';
    case 'auth/weak-password':
      return '비밀번호는 최소 6자 이상이어야 합니다';
    case 'auth/too-many-requests':
      return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요';
    case 'auth/network-request-failed':
      return '네트워크 연결이 원활하지 않습니다. 인터넷 연결을 확인해 주세요';
    default:
      return '인증 처리에 실패했습니다. 잠시 후 다시 시도해 주세요';
  }
};

/**
 * 이메일 및 비밀번호 기반 로그인
 * 계정 열거 방어 에러 매핑 적용
 */
export const signIn = async (email: string, password: string): Promise<User> => {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    throw new Error('이메일과 비밀번호를 모두 입력해 주세요');
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
    return credential.user;
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
};

/**
 * 신규 사용자 회원가입
 * 비밀번호 6자 이상 제약 및 중복 이메일 거절 적용
 */
export const signUp = async (email: string, password: string): Promise<User> => {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error('이메일을 입력해 주세요');
  }
  if (!password || password.length < 6) {
    throw new Error('비밀번호는 최소 6자 이상이어야 합니다');
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    return credential.user;
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
};

/**
 * 현재 로그인 세션 종료 및 토큰 파기
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
};

/**
 * 인증 상태 변경 구독
 * 초기 세션 복원 및 로그인/로그아웃 실시간 동기화
 */
export const subscribeAuthState = (
  observerOrNext: NextOrObserver<User>
): (() => void) => {
  return onAuthStateChanged(auth, observerOrNext);
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const authService = {
  signIn,
  signUp,
  signOut,
  subscribeAuthState,
  getCurrentUser,
  mapAuthError,
};
