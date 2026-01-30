'use client';
import { useState } from 'react';
import '@/app/globals.css';
import AdminQCPoint from './qc/page';
import EventManager from './EventManager';
import CustomerList from './CustomerList';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'PROCESS' | 'EVENTS' | 'CUSTOMERS'>('PROCESS');

    return (
        <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: 'white' }}>
            <header style={{ marginBottom: '3rem', borderBottom: '1px solid var(--color-gray-grid)', paddingBottom: '1rem' }}>
                <h1 className="text-crimson" style={{ fontSize: '3rem' }}>ADMIN CONSOLE</h1>
                <div style={{ color: 'gray' }}>PROJECTPOINT PHOTO SYSTEM V1.0</div>
            </header>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('PROCESS')}
                    style={{
                        padding: '1rem 2rem',
                        background: activeTab === 'PROCESS' ? 'var(--color-crimson)' : 'transparent',
                        border: activeTab === 'PROCESS' ? 'none' : '1px solid gray',
                        color: 'white',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-header)',
                        fontSize: '1.2rem'
                    }}
                >
                    QC STATION
                </button>
                <button
                    onClick={() => setActiveTab('EVENTS')}
                    style={{
                        padding: '1rem 2rem',
                        background: activeTab === 'EVENTS' ? 'var(--color-crimson)' : 'transparent',
                        border: activeTab === 'EVENTS' ? 'none' : '1px solid gray',
                        color: 'white',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-header)',
                        fontSize: '1.2rem'
                    }}
                >
                    MANAGE EVENTS
                </button>
                <button
                    onClick={() => setActiveTab('CUSTOMERS')}
                    style={{
                        padding: '1rem 2rem',
                        background: activeTab === 'CUSTOMERS' ? 'var(--color-crimson)' : 'transparent',
                        border: activeTab === 'CUSTOMERS' ? 'none' : '1px solid gray',
                        color: 'white',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-header)',
                        fontSize: '1.2rem'
                    }}
                >
                    CUSTOMERS
                </button>
            </div>

            {/* Content Area */}
            <div>
                {activeTab === 'PROCESS' && <AdminQCPoint />}
                {activeTab === 'EVENTS' && <EventManager />}
                {activeTab === 'CUSTOMERS' && <CustomerList />}
            </div>
        </div>
    );
}
