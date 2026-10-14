/**
 * 한국 표준시(KST, UTC+9) 기준 날짜 및 시각 유틸리티
 */

/**
 * 오늘 날짜 문자열 반환 (YYYY-MM-DD, KST 기준)
 */
export function getTodayKST(): string {
  const now = new Date();
  // UTC+9 밀리초 보정
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstTime.toISOString().split('T')[0];
}

/**
 * 현재 일시 KST ISO 8601 형식 문자열 반환 (YYYY-MM-DDTHH:mm:ss+09:00)
 */
export function getNowKSTIsoString(): string {
  const now = new Date();
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const iso = kstTime.toISOString(); // e.g. 2026-10-08T17:20:00.000Z
  return iso.substring(0, 19) + '+09:00';
}

/**
 * 기준 시작일(YYYY-MM-DD)로부터 N일 뒤 23:30 KST 마감일시 반환
 * @param startDateStr YYYY-MM-DD 형식
 * @param daysOffset 일수 오프셋 (기본 7일)
 * @returns YYYY-MM-DD 23:30
 */
export function getDefaultDueDateKST(startDateStr: string, daysOffset = 7): string {
  try {
    const [year, month, day] = startDateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + daysOffset);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d} 23:30`;
  } catch {
    return `${startDateStr} 23:30`;
  }
}

/**
 * 시작 일시와 종료 일시로부터 소요 시간(분) 런타임 계산 (T06-C25)
 * @param startedAt 시작 일시 (ISO 8601 또는 파싱 가능한 날짜 문자열)
 * @param endedAt 종료 일시 (ISO 8601 또는 파싱 가능한 날짜 문자열)
 * @returns 분 단위 정수 (0 이상)
 */
export function calculateActualMinutes(startedAt?: string, endedAt?: string): number {
  if (!startedAt || !endedAt) return 0;
  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) return 0;
  return Math.round((endMs - startMs) / (1000 * 60));
}

/**
 * 소요 분(minutes)을 사용자 친화적 문자열로 포맷팅 (예: 90분 -> "1시간 30분", 45분 -> "45분")
 */
export function formatActualMinutes(minutes: number): string {
  if (minutes <= 0) return '0분';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}시간 ${remainingMinutes}분`;
  }
  if (hours > 0) {
    return `${hours}시간`;
  }
  return `${remainingMinutes}분`;
}

/**
 * ISO 8601 문자열 또는 날짜 문자열을 KST 기준 YYYY-MM-DD 문자열로 변환
 */
export function toKSTDateString(dateOrIso?: string | null): string {
  if (!dateOrIso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrIso)) {
    return dateOrIso;
  }
  try {
    const d = new Date(dateOrIso);
    if (isNaN(d.getTime())) {
      const match = dateOrIso.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : '';
    }
    const kstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return kstTime.toISOString().split('T')[0];
  } catch {
    const match = String(dateOrIso).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }
}

/**
 * 시간 오차(분)를 사용자 친화적 문자열로 포맷팅 (예: +90분 -> "+1시간 30분", -15분 -> "-15분", 0분 -> "±0분")
 */
export function formatVarianceMinutes(diffMinutes: number): string {
  if (diffMinutes === 0) return '±0분';
  const absMin = Math.abs(diffMinutes);
  const formatted = formatActualMinutes(absMin);
  return diffMinutes > 0 ? `+${formatted}` : `-${formatted}`;
}

