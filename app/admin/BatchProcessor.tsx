'use client';

import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import exifr from 'exifr';

interface ProcessedImage {
    file: File;
    previewUrl: string;
    timestamp: number;
    qrData: string | null;
}

interface ImageGroup {
    subjectId: string;
    qrImage: ProcessedImage | null;
    photos: ProcessedImage[];
}

export default function BatchProcessor() {
    const [status, setStatus] = useState<string>('IDLE');
    const [groups, setGroups] = useState<ImageGroup[]>([]);
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Smart Scan Strategy
    const scanImage = async (file: File): Promise<string | null> => {
        const previewUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = previewUrl;
        await new Promise((resolve) => (img.onload = resolve));

        // STRATEGY 1: Native BarcodeDetector (Fastest & Most Robust)
        // @ts-ignore
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            try {
                // @ts-ignore
                const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
                const barcodes = await barcodeDetector.detect(img);
                if (barcodes.length > 0) {
                    return barcodes[0].rawValue;
                }
            } catch (e) {
                // Native failed, fall back to JS
            }
        }

        // Helper for jsQR
        const scanCanvas = (width: number, height: number, transform?: (ctx: CanvasRenderingContext2D) => void) => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            ctx.drawImage(img, 0, 0, width, height);
            if (transform) transform(ctx);

            const imageData = ctx.getImageData(0, 0, width, height);
            // Inversion attempts built-in to robust config
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
            return code ? code.data : null;
        };

        // STRATEGY 2: Resampled (800px) - Good balance
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800;
        if (width > MAX_SIZE || height > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
            width *= ratio;
            height *= ratio;
        }

        // Fast Pass
        let result = scanCanvas(width, height);
        if (result) return result;

        // STRATEGY 3: High Contrast / Grayscale (800px) - Helps with screens
        result = scanCanvas(width, height, (ctx) => {
            ctx.filter = 'contrast(200%) grayscale(100%)';
            ctx.drawImage(img, 0, 0, width, height);
        });
        if (result) return result;

        // STRATEGY 4: Full Resolution (Slowest, Last Resort)
        // Only run if image isn't massive (cap at 3000px to prevent crash)
        if (img.width < 3000 && img.height < 3000) {
            result = scanCanvas(img.width, img.height);
            if (result) return result;
        }

        return null;
    };

    const processFiles = async (files: FileList) => {
        setGroups([]);
        setElapsedTime(0);
        setStatus('STARTING...');

        const startTime = Date.now();
        const timerInterval = setInterval(() => {
            setElapsedTime((Date.now() - startTime) / 1000);
        }, 100);

        const images: ProcessedImage[] = [];
        const fileArray = Array.from(files);

        // Batch Processing (Concurrency: 3)
        const BATCH_SIZE = 3;
        for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
            const chunk = fileArray.slice(i, i + BATCH_SIZE);
            setStatus(`PROCESSING ${Math.min(i + BATCH_SIZE, fileArray.length)}/${fileArray.length}...`);

            const promises = chunk.map(async (file) => {
                const previewUrl = URL.createObjectURL(file);
                let timestamp = file.lastModified;

                // Exif (Fast)
                try {
                    const exifData = await exifr.parse(file).catch(() => null);
                    if (exifData?.DateTimeOriginal) {
                        timestamp = new Date(exifData.DateTimeOriginal).getTime();
                    }
                } catch (e) { }

                // Smart Scan
                const qrData = await scanImage(file);
                return { file, previewUrl, timestamp, qrData };
            });

            const processedChunk = await Promise.all(promises);
            images.push(...processedChunk);

            // Yield briefly
            await new Promise(r => setTimeout(r, 0));
        }

        clearInterval(timerInterval);
        setStatus('SORTING...');

        // Sort & Group
        images.sort((a, b) => a.timestamp - b.timestamp);
        const newGroups: ImageGroup[] = [];
        let currentGroup: ImageGroup = { subjectId: 'UNKNOWN', qrImage: null, photos: [] };

        images.forEach(img => {
            if (img.qrData) {
                // Check if valid JSON from our system
                let cleanId = img.qrData;
                let isValidSystemQR = false;
                try {
                    const parsed = JSON.parse(img.qrData);
                    if (parsed.id || parsed.type || parsed.name) {
                        cleanId = parsed.name || parsed.id;
                        isValidSystemQR = true;
                    }
                } catch (e) {
                    // Not JSON? Use raw string if it looks like an ID, otherwise treat as photo?
                    // For now, accept ANY QR as a separator to be safe.
                }

                if (currentGroup.photos.length > 0 || currentGroup.qrImage) {
                    newGroups.push(currentGroup);
                }

                currentGroup = {
                    subjectId: cleanId,
                    qrImage: img,
                    photos: []
                };
            } else {
                currentGroup.photos.push(img);
            }
        });

        if (currentGroup.photos.length > 0 || currentGroup.qrImage) {
            newGroups.push(currentGroup);
        }

        setGroups(newGroups);
        setStatus('DONE');
    };

    return (
        <div className="hud-border" style={{ padding: '2rem', background: '#111' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="text-neon" style={{ margin: 0 }}>IMAGE PROCESSING ENGINE</h2>
                <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--color-neon-green)' }}>
                    TIME: {elapsedTime.toFixed(1)}s
                </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
                    Select Folder or Files:
                </label>
                <input
                    type="file"
                    multiple
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    accept="image/jpeg, image/png"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files && processFiles(e.target.files)}
                    style={{ color: 'white' }}
                />
            </div>

            <div style={{ marginBottom: '1rem', color: status === 'DONE' ? 'var(--color-neon-green)' : 'var(--color-crimson)' }}>
                STATUS: {status}
            </div>

            <div style={{ marginTop: '2rem' }}>
                {groups.map((grp, idx) => (
                    <div key={idx} style={{ marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                        <h3 className="text-neon">GROUP {idx + 1}: {grp.subjectId}</h3>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '1rem' }}>
                            {grp.qrImage && (
                                <div style={{ border: '2px solid var(--color-crimson)', position: 'relative' }}>
                                    <img src={grp.qrImage.previewUrl} style={{ height: '100px', display: 'block' }} />
                                    <div style={{ position: 'absolute', top: 0, left: 0, background: 'var(--color-crimson)', color: 'white', fontSize: '10px', padding: '2px' }}>SEPARATOR</div>
                                </div>
                            )}

                            {grp.photos.map((p, pIdx) => (
                                <div key={pIdx} style={{ position: 'relative' }}>
                                    <img src={p.previewUrl} style={{ height: '100px', display: 'block' }} />
                                    <div style={{ fontSize: '10px', color: 'gray', marginTop: '2px' }}>
                                        {new Date(p.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {groups.length === 0 && status === 'DONE' && <p>No groups found. Did you upload a QR separator?</p>}
            </div>
        </div>
    );
}
