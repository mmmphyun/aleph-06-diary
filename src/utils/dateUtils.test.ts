import { describe, it, expect } from 'vitest';
import {
  getTodayKST,
  getNowKSTIsoString,
  getDefaultDueDateKST,
  calculateActualMinutes,
  formatActualMinutes,
  toKSTDateString,
  formatVarianceMinutes,
} from './dateUtils';

describe('dateUtils - M4/M5 KST 날짜 및 시간 계산 유틸리티 검증', () => {
  it('getTodayKST: YYYY-MM-DD 형식의 한국 표준시 날짜를 반환한다', () => {
    const today = getTodayKST();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getNowKSTIsoString: +09:00 타임존 오프셋을 포함한 ISO 8601 문자열을 반환한다', () => {
    const iso = getNowKSTIsoString();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/);
  });

  it('getDefaultDueDateKST: 시작일 기준 7일 뒤 23:30 KST를 기본 마감일시로 산출한다', () => {
    const startDate = '2026-10-02';
    const dueDate = getDefaultDueDateKST(startDate);
    expect(dueDate).toBe('2026-10-09 23:30');
  });

  it('calculateActualMinutes: 시작 및 종료 시각으로부터 소요 분을 정확히 계산한다 (T06-C25)', () => {
    const start = '2026-10-02T08:00:00+09:00';
    const end = '2026-10-02T09:30:00+09:00';
    expect(calculateActualMinutes(start, end)).toBe(90);

    // 45분 차이
    const end45 = '2026-10-02T08:45:00+09:00';
    expect(calculateActualMinutes(start, end45)).toBe(45);

    // 종료 시각이 시작 시각보다 앞서거나 비정상 입력 시 0분 반환
    expect(calculateActualMinutes(end, start)).toBe(0);
    expect(calculateActualMinutes(undefined, end)).toBe(0);
  });

  it('formatActualMinutes: 분 단위 정수를 X시간 Y분 형식으로 포맷팅한다', () => {
    expect(formatActualMinutes(90)).toBe('1시간 30분');
    expect(formatActualMinutes(120)).toBe('2시간');
    expect(formatActualMinutes(45)).toBe('45분');
    expect(formatActualMinutes(0)).toBe('0분');
    expect(formatActualMinutes(-10)).toBe('0분');
  });

  it('toKSTDateString: UTC ISO 문자열 또는 날짜 문자열을 KST YYYY-MM-DD로 정확히 환산한다', () => {
    // 2026-10-01 23:00:00 UTC = 2026-10-02 08:00:00 KST
    const utcSparse = '2026-10-01T23:00:00.000Z';
    expect(toKSTDateString(utcSparse)).toBe('2026-10-02');

    // 이미 KST ISO 문자열인 경우
    const kstIso = '2026-10-05T14:20:00+09:00';
    expect(toKSTDateString(kstIso)).toBe('2026-10-05');

    // 일반 날짜 문자열
    expect(toKSTDateString('2026-10-10')).toBe('2026-10-10');
    expect(toKSTDateString('2026-10-10 23:30')).toBe('2026-10-10');
    expect(toKSTDateString(null)).toBe('');
  });

  it('formatVarianceMinutes: 시간 오차 부호에 따라 올바른 텍스트를 반환한다', () => {
    expect(formatVarianceMinutes(90)).toBe('+1시간 30분');
    expect(formatVarianceMinutes(30)).toBe('+30분');
    expect(formatVarianceMinutes(-45)).toBe('-45분');
    expect(formatVarianceMinutes(-75)).toBe('-1시간 15분');
    expect(formatVarianceMinutes(0)).toBe('±0분');
  });
});
