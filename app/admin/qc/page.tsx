'use client';

import { useState, useEffect } from 'react';
import styles from './qc.module.css'; // We'll create this next

export default function AdminQCPoint() {
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch pending photos
    useEffect(() => {
        fetchPhotos();

        // Poll for new photos every 5 seconds (simulates real-time)
        const interval = setInterval(fetchPhotos, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchPhotos = async () => {
        try {
            // We need an API route for this. For now, let's assume one exists or we build it.
            // Let's create `app/api/admin/photos/route.ts` next.
            const res = await fetch('/api/admin/photos?status=PENDING_REVIEW');
            const data = await res.json();
            if (data.photos) {
                // Deduplicate based on ID to prevent UI flickering
                setPhotos(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPhotos = data.photos.filter((p: any) => !existingIds.has(p.id));
                    if (newPhotos.length === 0 && data.photos.length === prev.length) return prev;
                    return [...newPhotos, ...prev].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (photoId: string, action: 'APPROVE' | 'REJECT') => {
        // Optimistic UI update
        setPhotos(prev => prev.filter(p => p.id !== photoId));

        try {
            await fetch('/api/admin/photos', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: photoId, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' })
            });
        } catch (err) {
            console.error(err);
            alert('Action failed');
            fetchPhotos(); // Revert
        }
    };

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <h1>QC <span className="text-neon">STATION</span></h1>
                <div className={styles.stats}>
                    PENDING: <span className="text-crimson">{photos.length}</span>
                </div>
            </header>

            <div className={styles.grid}>
                {photos.length === 0 && !loading && (
                    <div className={styles.empty}>
                        <h2>NO PHOTOS PENDING</h2>
                        <p>Waiting for Uploads in `watched-photos`...</p>
                    </div>
                )}

                {photos.map(photo => (
                    <div key={photo.id} className={styles.card}>
                        <div className={styles.imageContainer}>
                            <img src={photo.url} alt="QC Pending" />
                            <div className={styles.meta}>
                                {new Date(photo.uploadedAt).toLocaleTimeString()}
                            </div>
                        </div>
                        <div className={styles.actions}>
                            <button
                                onClick={() => handleAction(photo.id, 'REJECT')}
                                className={styles.rejectBtn}
                            >
                                ✕
                            </button>
                            <button
                                onClick={() => handleAction(photo.id, 'APPROVE')}
                                className={styles.approveBtn}
                            >
                                ✓
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
