import Dexie, { Table } from 'dexie';

export interface OfflineAction {
    id?: number;
    order_id: string;
    station_id: string;
    user_id: string;
    action_type: 'SCANNED_IN' | 'COMPLETED' | 'REJECTED' | 'PHOTO_UPLOADED';
    photo_url?: string;
    created_at: string;
    synced: boolean;
}

export class CurtainTrackerDB extends Dexie {
    offlineQueue!: Table<OfflineAction>;

    constructor() {
        super('CurtainTrackerDB');
        this.version(1).stores({
            offlineQueue: '++id, order_id, synced' // Primary key and indexed props
        });
    }
}

export const db = new CurtainTrackerDB();
