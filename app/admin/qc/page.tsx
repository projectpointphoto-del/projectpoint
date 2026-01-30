'use client';

import { useState, useEffect } from 'react';
import styles from './qc.module.css';
import jsQR from 'jsqr';

// Type for a local file being "staged"
type StagedPhoto = {
    id: string; // Temp local ID
    file: File;
    preview: string;
    status: 'IDLE' | 'UPLOADING' | 'DONE' | 'ERROR';
};

type PhotoGroup = {
    id: string; // Group ID
    customerId: string | null;
    customerName: string | null; // For display
    photos: StagedPhoto[];
    isSeparator: boolean; // Is the first photo a QR separator?
};

export default function AdminQCPoint() {
    const [groups, setGroups] = useState<PhotoGroup[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [scanning, setScanning] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Modal State
    const [modalImage, setModalImage] = useState<string | null>(null);

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

    // Helper: Scan a single file for QR
    const scanFileForQR = (file: File): Promise<{ id: string, name: string } | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    try {
                        const data = JSON.parse(code.data);
                        if (data.id && data.name) {
                            resolve({ id: data.id, name: data.name });
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        resolve(null); // Not our JSON format
                    }
                } else {
                    resolve(null);
                }
            };
            img.src = URL.createObjectURL(file);
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setScanning(true);

        const files = Array.from(e.target.files);
        // Sort by name to ensure sequence (camera naming usually sequential)
        files.sort((a, b) => a.name.localeCompare(b.name));

        const newGroups: PhotoGroup[] = [];
        let currentGroup: PhotoGroup | null = null;
        let unknownCounter = 1;

        // Process sequentially
        for (const file of files) {
            const qrData = await scanFileForQR(file);
            const preview = URL.createObjectURL(file);
            const photoObj: StagedPhoto = {
                id: Math.random().toString(36).substr(2, 9),
                file,
                preview,
                status: 'IDLE'
            };

            if (qrData) {
                // START NEW GROUP
                currentGroup = {
                    id: `group-${qrData.id}-${Date.now()}`,
                    customerId: qrData.id,
                    customerName: qrData.name,
                    photos: [photoObj], // Include the separator? User said "separated... but with button". Usually separator is distinct. Let's include it.
                    isSeparator: true
                };
                newGroups.push(currentGroup);
            } else {
                // ADD TO CURRENT GROUP
                if (!currentGroup) {
                    // Orphaned photos at start? Create a bucket.
                    currentGroup = {
                        id: `group-unknown-${unknownCounter++}`,
                        customerId: null,
                        customerName: "Unknown / Unassigned",
                        photos: [],
                        isSeparator: false
                    };
                    newGroups.push(currentGroup);
                }
                currentGroup.photos.push(photoObj);
            }
        }

        setGroups(prev => [...prev, ...newGroups]);
        setScanning(false);
        e.target.value = ''; // Reset
    };

    const assignGroupCustomer = (groupId: string, customerId: string) => {
        const cust = customers.find(c => c.id === customerId);
        setGroups(prev => prev.map(g =>
            g.id === groupId ? { ...g, customerId, customerName: cust?.name || 'Manual Assign' } : g
        ));
    };

    const removeGroup = (groupId: string) => {
        setGroups(prev => prev.filter(g => g.id !== groupId));
    };

    const removePhoto = (groupId: string, photoId: string) => {
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return { ...g, photos: g.photos.filter(p => p.id !== photoId) };
            }
            return g;
        }));
    };

    const uploadGroup = async (group: PhotoGroup) => {
        if (!group.customerId) return;

        // Set status
        setGroups(prev => prev.map(g => {
            if (g.id === group.id) {
                return {
                    ...g,
                    photos: g.photos.map(p => ({ ...p, status: 'UPLOADING' as const }))
                };
            }
            return g;
        }));

        // Upload loop
        for (const photo of group.photos) {
            try {
                const fd = new FormData();
                fd.append('file', photo.file);
                fd.append('customerId', group.customerId); // THE LINK

                const res = await fetch('/api/upload', { method: 'POST', body: fd });

                setGroups(prev => prev.map(g => {
                    if (g.id === group.id) {
                        return {
                            ...g,
                            photos: g.photos.map(p => p.id === photo.id ? { ...p, status: (res.ok ? 'DONE' : 'ERROR') as const } : p)
                        };
                    }
                    return g;
                }));
            } catch (e) {
                console.error(e);
            }
        }

    };

    const handleLinkAll = async () => {
        const readyGroups = groups.filter(g => g.customerId && g.photos.some(p => p.status === 'IDLE'));
        if (readyGroups.length === 0) return;

        setUploading(true);
        for (const group of readyGroups) {
            await uploadGroup(group);
        }
        setUploading(false);

        // Clear fully done groups?
        setTimeout(() => {
            setGroups(prev => prev.filter(g => g.photos.some(p => p.status !== 'DONE')));
        }, 2000);
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
                        {scanning ? '🔍 SCANNING QR CODES & SORTING...' : '1. Select Folder → 2. QR Sorting (Auto) → 3. Link All'}
                    </p>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {/* File Select */}
                        <label className={styles.uploadBtn}>
                            {scanning ? '⏳ PROCESSING...' : '📂 SELECT PHOTOS TO PROCESS'}
                            <input
                                type="file"
                                // @ts-ignore
                                webkitdirectory=""
                                directory=""
                                multiple
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                                disabled={scanning || uploading}
                            />
                        </label>

                        {/* Link All Button */}
                        {groups.some(g => g.customerId && g.photos.some(p => p.status === 'IDLE')) && (
                            <button
                                onClick={handleLinkAll}
                                className={styles.linkAllBtn}
                                disabled={uploading || scanning}
                            >
                                {uploading ? '💾 UPLOADING...' : '⚡ LINK ALL GROUPS'}
                            </button>
                        )}
                    </div>
                </div>
                <div className={styles.stats}>
                    STAGED: <span className="text-neon">{groups.reduce((acc, g) => acc + g.photos.length, 0)}</span>
                </div>
            </header>

            {/* Groups List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {groups.length === 0 && !scanning && (
                    <div className={styles.empty}>
                        <h2>READY TO SORT</h2>
                        <p>Select a folder. The engine will auto-group by QR code.</p>
                    </div>
                )}

                {groups.map(group => (
                    <div key={group.id} style={{ borderBottom: '1px solid #333', paddingBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h2 className="text-neon" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {group.customerId ? `✅ ${group.customerName}` :
                                    <select
                                        className={styles.select}
                                        style={{ fontSize: '1.2rem', padding: '5px 10px' }}
                                        onChange={(e) => assignGroupCustomer(group.id, e.target.value)}
                                    >
                                        <option>⚠️ Unknown / Select Owner</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                }
                            </h2>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {group.customerId && (
                                    <button
                                        className={styles.uploadBtn}
                                        onClick={() => uploadGroup(group)}
                                        disabled={uploading}
                                        style={{ fontSize: '0.8rem', padding: '5px 10px', borderColor: '#00cc00', color: '#00cc00' }}
                                    >
                                        UPLOAD GROUP
                                    </button>
                                )}
                                <button className={styles.iconBtn} onClick={() => removeGroup(group.id)}>🗑️</button>
                            </div>
                        </div>

                        <div className={styles.grid}>
                            {group.photos.map(photo => (
                                <div key={photo.id} className={`${styles.card} ${photo.status === 'DONE' ? styles.cardDone : ''}`}>
                                    <div className={styles.imageContainer} onClick={() => setModalImage(photo.preview)}>
                                        <img src={photo.preview} alt="Local Preview" />
                                        {photo.status === 'UPLOADING' && <div className={styles.overlay}>⏳</div>}
                                        {photo.status === 'DONE' && <div className={styles.overlay}>✅</div>}
                                        {photo.status === 'ERROR' && <div className={styles.overlay}>❌</div>}
                                    </div>
                                    <button
                                        className={styles.iconBtn}
                                        style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.5)', color: 'white', opacity: 0 }}
                                        onClick={(e) => { e.stopPropagation(); removePhoto(group.id, photo.id); }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
