/**
 * 계획(Plan) 및 수정 이력(PlanRevision) 엔티티 인터페이스 정의
 * 마일스톤 M2: 계획 세우기 및 수정 이력 타임라인
 */

export type Priority = 'high' | 'medium' | 'low';

export interface PlanPeriod {
  start: string; // YYYY.MM.DD 또는 YYYY-MM-DD
  end: string;   // YYYY.MM.DD 또는 YYYY-MM-DD
}

export interface Plan {
  id: string;
  title: string;
  priority: Priority;
  period: PlanPeriod;
  estimatedHours: number;
  criteria: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface FieldChange<T = unknown> {
  before: T;
  after: T;
}

export interface PlanRevision {
  id: string;
  planId: string;
  revisionNumber: number;
  changedFields: Record<string, FieldChange>;
  revisedAt: string; // ISO 8601
}

export type PlanInput = Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>;

export interface PaginatedRevisions {
  items: PlanRevision[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
