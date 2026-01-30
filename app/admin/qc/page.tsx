'use client';

import { useState, useEffect } from 'react';
import styles from './qc.module.css'; // We'll create this next

export default function AdminQCPoint() {
    const [photos, setPhotos] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [selectedCustomer, setSelectedCustomer] = useState<{ [key: string]: string }>({});

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
        const files = Array.from(e.target.files);

        setUploading(true);
        setUploadProgress({ current: 0, total: files.length });

        // Loop client side
        let successCount = 0;
        let errors: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setUploadProgress({ current: i + 1, total: files.length });

                const fd = new FormData();
                fd.append('file', file);

                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: fd
                });

                if (res.ok) {
                    successCount++;
                } else {
                    const errData = await res.json().catch(() => ({}));
                    const errMsg = errData.error || res.statusText || 'Unknown Error';
                    errors.push(`${file.name}: ${errMsg}`);
                    console.error(`Upload failed for ${file.name}:`, errMsg);
                }
            }

            // Refresh grid
            fetchPhotos();

            // Feedback
            if (successCount === files.length) {
                // All good
            } else if (successCount === 0) {
                // Total failure
                const uniqueErrors = Array.from(new Set(errors)).slice(0, 3).join('\n');
                alert(`UPLOAD FAILED ❌\n\nReason:\n${uniqueErrors}`);
            } else {
                // Partial
                alert(`Uploaded ${successCount}/${files.length} photos.\n\nFailures:\n${errors.slice(0, 3).join('\n')}`);
            }

        } catch (err: any) {
            console.error(err);
            alert(`CRITICAL ERROR: ${err.message}`);
        } finally {
            setUploading(false);
            setUploadProgress({ current: 0, total: 0 });
            e.target.value = '';
        }
    };

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <div>
                    <h1>QC <span className="text-neon">STATION</span></h1>
                    <div style={{ marginTop: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {/* File Upload */}
                            <label className={styles.uploadBtn}>
                                {uploading ? `⏳ ${uploadProgress.current}/${uploadProgress.total}` : '⚡ UPLOAD FILES'}
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleManualUpload}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                            </label>

                            {/* Folder Upload (Chrome/Edge Only) */}
                            <label className={styles.uploadBtn} style={{ background: '#333', border: '1px solid gray', color: 'white' }}>
                                📁 UPLOAD FOLDER
                                <input
                                    type="file"
                                    // @ts-ignore
                                    webkitdirectory=""
                                    directory=""
                                    multiple
                                    onChange={handleManualUpload}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        <small style={{ display: 'block', color: 'gray', marginTop: '5px', fontSize: '0.7rem' }}>
                            Select files or a folder to process.
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
                        <div style={{ padding: '10px', borderTop: '1px solid #333', display: 'flex', gap: '5px' }}>
                            <select
                                value={selectedCustomer[photo.id] || ""}
                                onChange={(e) => setSelectedCustomer(prev => ({ ...prev, [photo.id]: e.target.value }))}
                                style={{ flex: 1, padding: '5px', background: '#222', color: 'white', border: '1px solid #444' }}
                            >
                                <option value="">Select Customer...</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.event})</option>
                                ))}
                            </select>
                            <button
                                disabled={!selectedCustomer[photo.id]}
                                onClick={() => handleAssign(photo.id, selectedCustomer[photo.id])}
                                style={{
                                    background: selectedCustomer[photo.id] ? '#00f3ff' : '#333',
                                    color: selectedCustomer[photo.id] ? 'black' : 'gray',
                                    border: 'none',
                                    fontWeight: 'bold',
                                    cursor: selectedCustomer[photo.id] ? 'pointer' : 'not-allowed',
                                    padding: '0 10px'
                                }}
                            >
                                LINK
                            </button>
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
