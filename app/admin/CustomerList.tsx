'use client';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function CustomerList() {
    const [customers, setCustomers] = useState<any[]>([]);

    const fetchCustomers = () => {
        fetch('/api/customers', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => setCustomers(data))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const [selectedQr, setSelectedQr] = useState<string | null>(null);

    const deleteCustomer = async (id: string) => {
        if (!confirm("Remove this customer?")) return;
        try {
            const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                // Remove from local state immediately for speed
                setCustomers(prev => prev.filter(c => c.id !== id));
            } else {
                alert("Failed to delete. Check server logs.");
            }
        } catch (e) {
            console.error(e);
            alert("Network error.");
        }
    };

    return (
        <div className="hud-border" style={{ padding: '2rem', background: '#111' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="text-neon">REGISTERED CUSTOMERS</h2>
                <button
                    onClick={async () => {
                        if (confirm("WARNING: THIS WILL DELETE ALL CUSTOMERS AND DATA.\n\nAre you sure?")) {
                            try {
                                const res = await fetch('/api/customers', { method: 'DELETE' });
                                if (res.ok) fetchCustomers();
                            } catch (e) {
                                alert("Failed to wipe data");
                            }
                        }
                    }}
                    style={{
                        padding: '5px 10px',
                        cursor: 'pointer',
                        background: 'darkred',
                        color: 'white',
                        border: '1px solid red',
                        fontWeight: 'bold'
                    }}>
                    DELETE ALL DATA
                </button>
            </div>

            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: 'white' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-crimson)' }}>
                        <th style={{ padding: '10px' }}>NAME</th>
                        <th style={{ padding: '10px' }}>EVENT</th>
                        <th style={{ padding: '10px' }}>CONTACT</th>
                        <th style={{ padding: '10px' }}>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {customers.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #333' }}>
                            <td style={{ padding: '10px' }}>
                                {c.name}
                                <br /><small style={{ color: 'gray' }}>#{c.id.substr(0, 8)}</small>
                            </td>
                            <td style={{ padding: '10px' }}>
                                {c.event}
                                <br /><span style={{ fontSize: '0.8rem', color: c.eventType === 'FIELD' ? 'var(--color-neon-green)' : 'var(--color-crimson)' }}>{c.eventType}</span>
                            </td>
                            <td style={{ padding: '10px' }}>{c.email}<br /><small>{c.phone}</small></td>
                            <td style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                                <button
                                    onClick={() => window.open(`/gallery/${c.id}`, '_blank')}
                                    style={{
                                        background: 'transparent',
                                        color: 'var(--color-neon-blue)',
                                        border: '1px solid var(--color-neon-blue)',
                                        padding: '5px 10px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}>
                                    GALLERY
                                </button>
                                <button
                                    onClick={() => setSelectedQr(c.qrData)}
                                    style={{
                                        background: '#333',
                                        color: 'white',
                                        border: '1px solid gray',
                                        padding: '5px 10px',
                                        cursor: 'pointer'
                                    }}>
                                    QR
                                </button>
                                <button
                                    onClick={() => deleteCustomer(c.id)}
                                    style={{
                                        background: 'var(--color-crimson)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '5px 10px',
                                        cursor: 'pointer'
                                    }}>
                                    X
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* QR Modal */}
            {
                selectedQr && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                    }} onClick={() => setSelectedQr(null)}>
                        <div style={{
                            background: '#111', padding: '2rem', border: '1px solid var(--color-crimson)',
                            textAlign: 'center', color: 'white'
                        }} onClick={e => e.stopPropagation()}>
                            <h3 className="text-neon" style={{ marginBottom: '1rem' }}>CUSTOMER ID</h3>
                            <div style={{ background: 'white', padding: '1rem', display: 'inline-block' }}>
                                <QRCodeSVG value={selectedQr} size={256} level="H" includeMargin />
                            </div>
                            <div style={{ marginTop: '1rem', fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: '300px' }}>
                                {selectedQr}
                            </div>
                            <button
                                onClick={() => setSelectedQr(null)}
                                style={{
                                    marginTop: '1.5rem',
                                    background: 'transparent',
                                    border: '1px solid var(--color-crimson)',
                                    color: 'var(--color-crimson)',
                                    padding: '10px 20px',
                                    cursor: 'pointer'
                                }}
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
