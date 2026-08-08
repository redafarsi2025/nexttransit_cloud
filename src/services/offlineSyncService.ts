import { logger } from '../utils/logger';

export interface PendingOfflineAction {
  id: string;
  type: 'WORK_ORDER_UPDATE' | 'INCIDENT_REPORT' | 'FUEL_LOG_CREATE' | 'INSPECTION_SUBMIT';
  payload: any;
  timestamp: string;
  retryCount: number;
}

const STORAGE_KEY = 'nexttransit_offline_queue_v1';

class OfflineSyncService {
  private queue: PendingOfflineAction[] = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<(isOnline: boolean, pendingCount: number) => void> = new Set();

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleConnectivityChange(true));
      window.addEventListener('offline', () => this.handleConnectivityChange(false));
    }
  }

  private loadQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.queue = JSON.parse(stored);
        }
      }
    } catch (err) {
      logger.error('Failed to load offline queue from localStorage', err);
    }
  }

  private saveQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      }
    } catch (err) {
      logger.error('Failed to save offline queue to localStorage', err);
    }
  }

  private handleConnectivityChange(online: boolean) {
    this.isOnline = online;
    logger.info(`Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
    this.notifyListeners();

    if (online) {
      this.syncPendingActions();
    }
  }

  public subscribe(callback: (isOnline: boolean, pendingCount: number) => void): () => void {
    this.listeners.add(callback);
    callback(this.isOnline, this.queue.length);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.isOnline, this.queue.length));
  }

  public enqueueAction(type: PendingOfflineAction['type'], payload: any): PendingOfflineAction {
    const action: PendingOfflineAction = {
      id: `OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    this.queue.push(action);
    this.saveQueue();
    this.notifyListeners();
    logger.info(`Action enqueued for offline sync (${type})`, { actionId: action.id });

    if (this.isOnline) {
      this.syncPendingActions();
    }

    return action;
  }

  public async syncPendingActions(): Promise<{ synced: number; failed: number }> {
    if (this.queue.length === 0 || !this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    logger.info(`Attempting offline sync for ${this.queue.length} pending items...`);
    let synced = 0;
    let failed = 0;

    const remainingQueue: PendingOfflineAction[] = [];

    for (const action of this.queue) {
      try {
        // Simulated server sync
        await new Promise((res) => setTimeout(res, 200));
        synced++;
        logger.info(`Synced offline action ${action.id} (${action.type})`);
      } catch (err) {
        failed++;
        action.retryCount += 1;
        if (action.retryCount < 5) {
          remainingQueue.push(action);
        }
        logger.error(`Failed to sync offline action ${action.id}`, err);
      }
    }

    this.queue = remainingQueue;
    this.saveQueue();
    this.notifyListeners();

    return { synced, failed };
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }
}

export const offlineSyncService = new OfflineSyncService();
