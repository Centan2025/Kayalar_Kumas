import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

export default function OfflineSyncBadge() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    // Watch pending offline actions
    const pendingCount = useLiveQuery(
        () => db.offlineQueue.where('synced').equals('false').count(),
        []
    ) ?? 0;

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            triggerSync();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const triggerSync = async () => {
        if (pendingCount === 0 || !navigator.onLine) return;

        setIsSyncing(true);
        try {
            // In a real app we would send the data to Supabase here
            const pendingItems = await db.offlineQueue.where('synced').equals('false').toArray();
            console.log('Syncing items to server:', pendingItems);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mark as synced
            await Promise.all(
                pendingItems.map(item =>
                    db.offlineQueue.update(item.id!, { synced: true })
                )
            );

            // Clean up synced items
            await db.offlineQueue.where('synced').equals('true').delete();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isOnline) {
        return (
            <div className="badge badge-warning flex items-center gap-2">
                <WifiOff size={14} />
                <span>Çevrimdışı ({pendingCount} bekleyen)</span>
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div className="badge" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                <RefreshCw size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: '4px' }}>Senkronize ediliyor...</span>
            </div>
        );
    }

    return (
        <div className="badge badge-success flex items-center gap-2">
            <Wifi size={14} />
            <span>Çevrimiçi</span>
        </div>
    );
}
