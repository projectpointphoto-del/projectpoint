'use client';

import { useState, useEffect } from 'react';
import styles from './qc.module.css'; // We'll create this next

export default function AdminQCPoint() {
    const [photos, setPhotos] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Fetch pending photos AND customers
    useEffect(() => {
        fetchPhotos();
        fetchCustomers();

        // Poll for new photos every 5 seconds (simulates real-time)
        const interval = setInterval(fetchPhotos, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            setCustomers(data);
        } catch (e) {
            console.error(e);
        }
    };

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

    const handleAssign = async (photoId: string, customerId: string) => {
        // Optimistic: Remove from pending list (assuming it's now "processed" enough to hide, or keep it?)
        // Let's keep it visible but maybe show a success indicator?
        // Actually, users might want to verify.
        // For now, let's just make the API call and maybe flash the card green.
        try {
            const res = await fetch('/api/admin/photos', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: photoId, customerId, status: 'APPROVED' }) // Auto-approve on link
            });
            if (res.ok) {
                // Remove from list as it is now APPROVED and assigned
                setPhotos(prev => prev.filter(p => p.id !== photoId));
            }
        } catch (e) {
            console.error(e);
            alert("Failed to link customer");
        }
    };

    const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);

        const formData = new FormData();
        Array.from(e.target.files).forEach(file => {
            formData.append('file', file);
            // Note: Our current API handles one file at a time or we need to update it?
            // The API expects 'file' field. If we send multiple, we might need to loop.
            // Let's loop for simplicity to ensure each gets a signature.
        });

        // Actually, let's loop client side to be safe with our simple API
        try {
            for (const file of Array.from(e.target.files)) {
                const fd = new FormData();
                fd.append('file', file);
                await fetch('/api/upload', {
                    method: 'POST',
                    body: fd
                });
            }
            // Refresh
            fetchPhotos();
        } catch (err) {
            console.error(err);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <div>
                    <h1>QC <span className="text-neon">STATION</span></h1>
                    <div style={{ marginTop: '15px' }}>
                        <label className={styles.uploadBtn}>
                            {uploading ? '⏳ UPLOADING...' : '⚡ UPLOAD PHOTOS'}
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleManualUpload}
                                style={{ display: 'none' }}
                                disabled={uploading}
                            />
                        </label>
                        <small style={{ display: 'block', color: 'gray', marginTop: '5px', fontSize: '0.7rem' }}>
                            Select files to process & assign
                        </small>
                    </div>
                </div>
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

                        {/* Customer Linker */}
                        <div style={{ padding: '10px', borderTop: '1px solid #333' }}>
                            <select
                                onChange={async (e) => {
                                    if (e.target.value) {
                                        await handleAssign(photo.id, e.target.value);
                                    }
                                }}
                                style={{ width: '100%', padding: '5px', background: '#222', color: 'white', border: '1px solid #444' }}
                            >
                                <option value="">Select Customer...</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.event})</option>
                                ))}
                            </select>
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
