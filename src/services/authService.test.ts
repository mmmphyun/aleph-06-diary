import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signIn,
  signUp,
  signOut,
  subscribeAuthState,
  mapAuthError,
} from './authService';
import * as firebaseAuth from 'firebase/auth';

// Firebase Auth SDK 함수 모킹
vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<typeof import('firebase/auth')>('firebase/auth');
  return {
    ...actual,
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
  };
});

describe('authService - Firebase Authentication 단위 테스트 스위트 (T07-M1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. 계정 열거 방어 및 에러 메시지 정규화 (T07-C98, T07-C96)', () => {
    it('auth/user-not-found, auth/wrong-password, auth/invalid-credential 오류는 단일 메시지로 통일 매핑된다 (계정 열거 방어)', () => {
      const errNotFound = { code: 'auth/user-not-found' };
      const errWrongPassword = { code: 'auth/wrong-password' };
      const errInvalidCred = { code: 'auth/invalid-credential' };

      const msg1 = mapAuthError(errNotFound);
      const msg2 = mapAuthError(errWrongPassword);
      const msg3 = mapAuthError(errInvalidCred);

      const expected = '아이디 또는 비밀번호가 올바르지 않습니다';
      expect(msg1).toBe(expected);
      expect(msg2).toBe(expected);
      expect(msg3).toBe(expected);
      // 세 오류의 메시지가 100% 동일하여 공격자가 계정 존재 여부를 유추할 수 없어야 함
      expect(msg1).toBe(msg2);
      expect(msg2).toBe(msg3);
    });

    it('auth/email-already-in-use 오류는 중복 가입 안내 문구로 매핑된다', () => {
      const errDuplicate = { code: 'auth/email-already-in-use' };
      expect(mapAuthError(errDuplicate)).toBe('이미 등록된 이메일 계정입니다');
    });

    it('기타 Auth 예외 코드(invalid-email, weak-password 등)가 명확한 한국어로 매핑된다', () => {
      expect(mapAuthError({ code: 'auth/invalid-email' })).toBe('유효한 이메일 형식이 아닙니다');
      expect(mapAuthError({ code: 'auth/weak-password' })).toBe('비밀번호는 최소 6자 이상이어야 합니다');
      expect(mapAuthError({ code: 'auth/too-many-requests' })).toBe(
        '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요'
      );
      expect(mapAuthError({ code: 'unknown-code' })).toBe(
        '인증 처리에 실패했습니다. 잠시 후 다시 시도해 주세요'
      );
    });
  });

  describe('2. 회원가입 (signUp) 검증 로직 및 상태 전이 (T07-C94, T07-C96)', () => {
    it('이메일 또는 비밀번호 미입력 시 네트워크 요청 없이 즉시 유효성 오류를 발생시킨다', async () => {
      await expect(signUp('', 'password123')).rejects.toThrow('이메일을 입력해 주세요');
      await expect(signUp('user@example.com', '')).rejects.toThrow(
        '비밀번호는 최소 6자 이상이어야 합니다'
      );
      await expect(signUp('user@example.com', '12345')).rejects.toThrow(
        '비밀번호는 최소 6자 이상이어야 합니다'
      );
      expect(firebaseAuth.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('유효한 정보로 회원가입 요청 시 createUserWithEmailAndPassword를 호출하고 User 객체를 반환한다', async () => {
      const mockUser = { uid: 'user-001', email: 'test@example.com' };
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValueOnce({
        user: mockUser as any,
      } as any);

      const result = await signUp('test@example.com', 'securepass123');

      expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'securepass123'
      );
      expect(result).toEqual(mockUser);
    });

    it('이미 존재하는 이메일로 가입 시 auth/email-already-in-use를 감지하여 한국어 거절 문구를 반환한다', async () => {
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockRejectedValueOnce({
        code: 'auth/email-already-in-use',
      });

      await expect(signUp('existing@example.com', 'password123')).rejects.toThrow(
        '이미 등록된 이메일 계정입니다'
      );
    });
  });

  describe('3. 로그인 (signIn) 및 계정 열거 방어 (T07-C94, T07-C98)', () => {
    it('빈 이메일 또는 비밀번호로 로그인 시도 시 즉시 에러를 반환한다', async () => {
      await expect(signIn('', 'password')).rejects.toThrow(
        '이메일과 비밀번호를 모두 입력해 주세요'
      );
      await expect(signIn('test@example.com', '')).rejects.toThrow(
        '이메일과 비밀번호를 모두 입력해 주세요'
      );
      expect(firebaseAuth.signInWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('올바른 계정 정보로 로그인 시 signInWithEmailAndPassword를 호출하고 User 객체를 반환한다', async () => {
      const mockUser = { uid: 'user-002', email: 'verified@example.com' };
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValueOnce({
        user: mockUser as any,
      } as any);

      const result = await signIn('verified@example.com', 'mypassword');

      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'verified@example.com',
        'mypassword'
      );
      expect(result).toEqual(mockUser);
    });

    it('존재하지 않는 계정(user-not-found)으로 로그인 실패 시 단일 메시지를 반환한다', async () => {
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValueOnce({
        code: 'auth/user-not-found',
      });

      await expect(signIn('nobody@example.com', 'password123')).rejects.toThrow(
        '아이디 또는 비밀번호가 올바르지 않습니다'
      );
    });

    it('비밀번호 불일치(wrong-password)로 로그인 실패 시 user-not-found와 동일한 메시지를 반환한다', async () => {
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValueOnce({
        code: 'auth/wrong-password',
      });

      await expect(signIn('exists@example.com', 'wrongpw123')).rejects.toThrow(
        '아이디 또는 비밀번호가 올바르지 않습니다'
      );
    });

    it('최신 SDK 자격증명 오류(invalid-credential) 발생 시 동일한 메시지를 반환한다', async () => {
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValueOnce({
        code: 'auth/invalid-credential',
      });

      await expect(signIn('user@example.com', 'anypass')).rejects.toThrow(
        '아이디 또는 비밀번호가 올바르지 않습니다'
      );
    });
  });

  describe('4. 로그아웃 (signOut) 및 세션 정리 (T07-C95)', () => {
    it('signOut 호출 시 firebase signOut을 정상 호출한다', async () => {
      vi.mocked(firebaseAuth.signOut).mockResolvedValueOnce(undefined);

      await expect(signOut()).resolves.toBeUndefined();
      expect(firebaseAuth.signOut).toHaveBeenCalledWith(expect.anything());
    });

    it('signOut 실패 시 정규화된 오류를 발생시킨다', async () => {
      vi.mocked(firebaseAuth.signOut).mockRejectedValueOnce({
        code: 'auth/network-request-failed',
      });

      await expect(signOut()).rejects.toThrow(
        '네트워크 연결이 원활하지 않습니다. 인터넷 연결을 확인해 주세요'
      );
    });
  });

  describe('5. 인증 상태 리스너 구독 (subscribeAuthState)', () => {
    it('onAuthStateChanged를 올바른 인자와 함께 등록하고 구독 해제 함수를 반환한다', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(firebaseAuth.onAuthStateChanged).mockReturnValueOnce(mockUnsubscribe as any);

      const callback = vi.fn();
      const unsub = subscribeAuthState(callback);

      expect(firebaseAuth.onAuthStateChanged).toHaveBeenCalledWith(
        expect.anything(),
        callback
      );
      unsub();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
