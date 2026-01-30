'use client';

import { useState, useEffect } from 'react';
import styles from './qc.module.css';

// Type for a local file being "staged"
type StagedPhoto = {
    id: string; // Temp local ID
    file: File;
    preview: string;
    customerId: string | null;
    status: 'IDLE' | 'UPLOADING' | 'DONE' | 'ERROR';
};

export default function AdminQCPoint() {
    const [stagingItems, setStagingItems] = useState<StagedPhoto[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Modal State
    const [modalImage, setModalImage] = useState<string | null>(null);

    // Fetch customers only (Server photos are less relevant in this mode, but we can keep fetching them for history)
    useEffect(() => {
        fetchCustomers();
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        const newItems: StagedPhoto[] = Array.from(e.target.files).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file), // Local blob preview
            customerId: null,
            status: 'IDLE'
        }));

        setStagingItems(prev => [...prev, ...newItems]);
        e.target.value = ''; // Reset input
    };

    const assignCustomer = (itemId: string, customerId: string) => {
        setStagingItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, customerId } : item
        ));
    };

    const assignAll = (customerId: string) => {
        // Assign ALL idle items to this customer
        setStagingItems(prev => prev.map(item =>
            item.status === 'IDLE' ? { ...item, customerId } : item
        ));
    };

    const removeItem = (itemId: string) => {
        setStagingItems(prev => prev.filter(item => item.id !== itemId));
    };

    const uploadItem = async (item: StagedPhoto) => {
        if (item.status !== 'IDLE' || !item.customerId) return; // Must have customer to upload in this flow

        // Update status to UPLOADING
        setStagingItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'UPLOADING' } : p));

        try {
            const fd = new FormData();
            fd.append('file', item.file);
            fd.append('customerId', item.customerId); // Send link immediately

            const res = await fetch('/api/upload', { method: 'POST', body: fd });

            if (res.ok) {
                setStagingItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'DONE' } : p));
                // Auto-remove done items after 2 seconds? Or keep them as "Done"?
                // Let's keep them briefly then remove implies "Moved to Server"
                setTimeout(() => removeItem(item.id), 2000);
            } else {
                setStagingItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'ERROR' } : p));
            }
        } catch (e) {
            setStagingItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'ERROR' } : p));
        }
    };

    const handleLinkAll = async () => {
        const toUpload = stagingItems.filter(i => i.status === 'IDLE' && i.customerId);
        if (toUpload.length === 0) {
            alert("No photos assigned to customers yet.");
            return;
        }

        setUploading(true);
        // Process sequentially
        for (const item of toUpload) {
            await uploadItem(item);
        }
        setUploading(false);
    };

    return (
        <main className={styles.main}>
            {/* Modal */}
            {modalImage && (
                <div className={styles.modal} onClick={() => setModalImage(null)}>
                    <img src={modalImage} alt="Full View" />
                </div>
            )}

            <header className={styles.header}>
                <div>
                    <h1>QC <span className="text-neon">STATION</span></h1>
                    <p style={{ color: 'gray', fontSize: '0.9rem', marginBottom: '20px' }}>
                        1. Select Files -> 2. Review & Assign -> 3. Link & Upload
                    </p>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {/* File Select */}
                        <label className={styles.uploadBtn}>
                            📂 SELECT PHOTOS TO PROCESS
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </label>

                        {/* Link All Button */}
                        {stagingItems.some(i => i.status === 'IDLE' && i.customerId) && (
                            <button
                                onClick={handleLinkAll}
                                className={styles.linkAllBtn}
                                disabled={uploading}
                            >
                                {uploading ? 'UPLOADING...' : '⚡ LINK ALL ASSIGNED'}
                            </button>
                        )}
                    </div>
                </div>
                <div className={styles.stats}>
                    STAGED: <span className="text-neon">{stagingItems.length}</span>
                </div>
            </header>

            {/* Staging Grid */}
            <div className={styles.grid}>
                {stagingItems.length === 0 && (
                    <div className={styles.empty}>
                        <h2>READY TO PROCESS</h2>
                        <p>Select photos to begin local review.</p>
                    </div>
                )}

                {stagingItems.map(item => (
                    <div key={item.id} className={`${styles.card} ${item.status === 'DONE' ? styles.cardDone : ''}`}>
                        <div className={styles.imageContainer} onClick={() => setModalImage(item.preview)}>
                            <img src={item.preview} alt="Local Preview" />
                            {item.status === 'UPLOADING' && <div className={styles.overlay}>⏳</div>}
                            {item.status === 'DONE' && <div className={styles.overlay}>✅</div>}
                            {item.status === 'ERROR' && <div className={styles.overlay}>❌</div>}
                        </div>

                        {/* Controls */}
                        <div style={{ padding: '10px', background: '#111' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <button className={styles.iconBtn} onClick={() => removeItem(item.id)}>🗑️</button>
                                <button className={styles.iconBtn} onClick={() => setModalImage(item.preview)}>🔍</button>
                            </div>

                            <select
                                value={item.customerId || ""}
                                onChange={(e) => assignCustomer(item.id, e.target.value)}
                                className={styles.select}
                                disabled={item.status !== 'IDLE'}
                            >
                                <option value="">Select Customer...</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            <button
                                disabled={!item.customerId || item.status !== 'IDLE'}
                                onClick={() => uploadItem(item)}
                                style={{
                                    width: '100%',
                                    marginTop: '8px',
                                    padding: '8px',
                                    background: item.customerId ? '#00f3ff' : '#222',
                                    color: item.customerId ? 'black' : 'gray',
                                    border: 'none',
                                    fontWeight: 'bold',
                                    cursor: item.customerId ? 'pointer' : 'not-allowed',
                                    opacity: item.customerId ? 1 : 0.5
                                }}
                            >
                                {item.status === 'DONE' ? 'UPLOADED' : 'LINK & UPLOAD'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
