import type { IPlanPackageRepository } from '../types/binder';
import { firestorePlanPackageRepository } from './firestorePlanPackageRepository';

export { INITIAL_PLAN_PACKAGES } from './initialData';
export const planPackageService: IPlanPackageRepository = firestorePlanPackageRepository;
