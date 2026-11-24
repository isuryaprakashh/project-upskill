import { createProgressSync } from '@upskill/shared';
import { useSyncExternalStore } from 'react';
import { browserStore, client } from './api';

const sync = createProgressSync({ client, store: browserStore });
export const { start: startProgress, update: updateProgress, retry: retrySync, flush: flushProgress } = sync;
export const useProgress = () => useSyncExternalStore(sync.subscribe, sync.getData);
export const useSyncStatus = () => useSyncExternalStore(sync.subscribe, sync.getStatus);
