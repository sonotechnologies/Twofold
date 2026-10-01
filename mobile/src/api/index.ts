import { isDemo } from '@/lib/supabase';

import type { Backend } from './backend';
import { demoBackend } from './demoBackend';
import { supabaseBackend } from './supabaseBackend';

export const api: Backend = isDemo ? demoBackend : supabaseBackend;
export * from './types';
export type { NewMessage } from './backend';
