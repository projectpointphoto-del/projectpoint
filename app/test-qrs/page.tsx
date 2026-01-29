'use client';
import { QRCodeSVG } from 'qrcode.react';

export default function TestQRPage() {
    const users = [
        { id: 'mock_001', name: 'MOCK_ALICE', type: 'FIELD' },
        { id: 'mock_002', name: 'MOCK_BOB', type: 'OFFICE' },
        { id: 'mock_003', name: 'MOCK_CHARLIE', type: 'FIELD' }
    ];

    return (
        <div style={{ display: 'flex', gap: '50px', padding: '50px', background: 'white' }}>
            {users.map(u => (
                <div key={u.id} id={`qr-${u.id}`}>
                    <h1>{u.name}</h1>
                    <QRCodeSVG value={JSON.stringify(u)} size={400} />
                </div>
            ))}
        </div>
    );
}
