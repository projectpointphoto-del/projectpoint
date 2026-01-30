'use client';

import { useEffect } from 'react';
import styles from './gallery.module.css';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Gallery Error:', error);
    }, [error]);

    return (
        <main className={styles.main} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{ color: '#ff003c' }}>SOMETHING WENT WRONG</h2>
            <p style={{ color: '#888', marginBottom: '20px' }}>{error.message || 'Unknown Server Error'}</p>
            {error.digest && <p style={{ fontSize: '0.8rem', color: '#444' }}>Error Code: {error.digest}</p>}

            <button
                onClick={() => reset()}
                style={{
                    padding: '10px 20px',
                    background: '#00f3ff',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                TRY AGAIN
            </button>
        </main>
    );
}
