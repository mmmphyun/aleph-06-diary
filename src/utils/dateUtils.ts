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
