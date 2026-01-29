'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import styles from '../page.module.css'; // Reusing main styles for consistency

function SuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');

    const [status, setStatus] = useState<'VERIFYING' | 'SUCCESS' | 'ERROR'>('VERIFYING');
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (!sessionId) {
            setStatus('ERROR');
            return;
        }

        // Verify the payment with our backend
        fetch(`/api/verify-payment?session_id=${sessionId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setData(data);
                    setStatus('SUCCESS');
                } else {
                    setStatus('ERROR');
                }
            })
            .catch(err => {
                console.error(err);
                setStatus('ERROR');
            });
    }, [sessionId]);

    if (status === 'VERIFYING') {
        return (
            <div className={styles.container} style={{ textAlign: 'center', marginTop: '100px' }}>
                <h2 className="text-neon" style={{ animation: 'pulse 1s infinite' }}>VERIFYING PAYMENT...</h2>
            </div>
        );
    }

    if (status === 'ERROR') {
        return (
            <div className={styles.container} style={{ textAlign: 'center', marginTop: '100px', borderColor: 'var(--color-crimson)' }}>
                <h2 className="text-crimson">PAYMENT VERIFICATION FAILED</h2>
                <p>Please contact support if you were charged.</p>
                <a href="/" className={styles.button} style={{ marginTop: '20px', display: 'inline-block' }}>RETURN HOME</a>
            </div>
        );
    }

    return (
        <div className={`${styles.container} hud-border`}>
            <div className={styles.success}>
                <h2 className="text-neon" style={{ fontSize: '2rem', marginBottom: '10px' }}>PAYMENT CONFIRMED</h2>
                <div style={{ color: 'var(--color-neon-blue)', marginBottom: '20px', fontSize: '1.2rem' }}>
                    {data.customerName} • {data.eventName}
                </div>

                <div className={styles.qrContainer}>
                    <QRCodeSVG value={data.qrCode} size={256} className={styles.qr} level="H" includeMargin />
                </div>

                <p className={styles.instruction} style={{ marginTop: '20px' }}>SHOW TIMECODE TO PHOTOGRAPHER</p>

                <a href="/" className={styles.button} style={{ marginTop: '30px' }}>
                    DONE
                </a>
            </div>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <div className="text-crimson">PROJECTPOINT</div>
                <div className="text-neon">PHOTO</div>
            </header>
            <Suspense fallback={<div className="text-white text-center mt-20">Loading...</div>}>
                <SuccessContent />
            </Suspense>
        </main>
    );
}
