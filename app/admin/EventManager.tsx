'use client';
import { useState, useEffect } from 'react';

interface Event {
    id: string;
    name: string;
    date: string;
    type: string;
    slug?: string;
}

export default function EventManager() {
    const [events, setEvents] = useState<Event[]>([]);
    const [newEvent, setNewEvent] = useState({ name: '', date: '', type: 'OFFICE' });
    // Modal State
    const [selectedEventForView, setSelectedEventForView] = useState<Event | null>(null);

    // Fetch Events
    const fecthEvents = async () => {
        const res = await fetch('/api/events');
        if (res.ok) setEvents(await res.json());
    };

    useEffect(() => {
        fecthEvents();
    }, []);

    // Check if today's walk-in exists (San Antonio Time)
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const todaySlug = `walk-in-${dateStr}`;

    // Find absolute "Today's Walk-in" db record if it exists
    const walkInEvent = events.find(e => e.slug === todaySlug);
    // Filter out today's walk-in from the main list so it doesn't show twice
    const otherEvents = events.filter(e => e.slug !== todaySlug);

    const addEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEvent)
        });

        if (res.ok) {
            fecthEvents();
            setNewEvent({ name: '', date: '', type: 'OFFICE' });
        }
    };

    const deleteEvent = async (id: string) => {
        if (!confirm('Are you sure? This might delete associated registrations.')) return;
        const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });

        if (res.ok) {
            fecthEvents();
        } else {
            alert('Failed to delete event. Check if it has related data.');
        }
    };

    return (
        <div className="hud-border" style={{ padding: '2rem', background: '#111' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="text-neon" style={{ margin: 0 }}>EVENT MANAGEMENT</h2>
                <button
                    onClick={async () => {
                        if (confirm("WARNING: DELETE ALL EVENTS?\n\nThis wipes Registrations and Photos too.")) {
                            await fetch('/api/events', { method: 'DELETE' });
                            fecthEvents();
                        }
                    }}
                    style={{
                        background: 'darkred',
                        color: 'white',
                        border: '1px solid red',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    DELETE ALL SESSIONS
                </button>
            </div>

            {/* SECTION 1: TODAY'S WALK-IN (ALWAYS VISIBLE) */}
            <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ color: 'var(--color-neon-green)', borderBottom: '1px solid var(--color-neon-green)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    TODAY'S WALK-IN SESSION
                </h3>

                <div style={{
                    padding: '1.5rem',
                    border: '1px solid var(--color-neon-green)',
                    background: 'rgba(57, 255, 20, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <strong style={{ fontSize: '1.4rem', color: 'white', display: 'block' }}>Walk-in ({dateStr})</strong>
                        <div style={{ color: 'var(--color-neon-green)', marginTop: '5px', fontWeight: 'bold' }}>
                            STATUS: ACTIVE
                        </div>
                        <div style={{ color: 'gray', marginTop: '5px' }}>
                            {walkInEvent ? `${(walkInEvent as any).registrations?.length || 0} ATTENDEES` : '0 ATTENDEES (Waiting for first registration)'}
                        </div>
                    </div>

                    {walkInEvent && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setSelectedEventForView(walkInEvent)}
                                style={{ background: '#333', border: '1px solid gray', color: 'white', padding: '10px 20px', cursor: 'pointer' }}
                            >
                                VIEW ATTENDEES
                            </button>
                            <button
                                onClick={() => deleteEvent(walkInEvent.id)}
                                style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}
                            >
                                CLEAR
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION 2: PLAN OFFICE SESSION */}
            <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>PLAN OFFICE SESSION</h3>
                <form onSubmit={addEvent} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1.5rem', border: '1px solid #333', background: '#1a1a1a' }}>
                    <input
                        placeholder="SESSION NAME (e.g. Seniors 2026)"
                        value={newEvent.name}
                        onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                        style={{ padding: '10px', flex: 1, background: '#222', border: '1px solid #444', color: 'white' }}
                        required
                    />
                    <input
                        type="date"
                        value={newEvent.date}
                        onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                        style={{ padding: '10px', background: '#222', border: '1px solid #444', color: 'white' }}
                        required
                    />
                    {/* Type is hidden/forced to OFFICE */}
                    <button type="submit" style={{ background: 'var(--color-crimson)', color: 'white', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>
                        SCHEDULE
                    </button>
                </form>
            </div>

            {/* SECTION 3: SCHEDULED SESSIONS */}
            <div>
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>SCHEDULED SESSIONS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {otherEvents.map((evt: any) => (
                        <div key={evt.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', border: '1px solid #333', alignItems: 'center', background: '#1a1a1a' }}>
                            <div>
                                <strong style={{ fontSize: '1.2rem' }}>{evt.name}</strong>
                                {/* Slice to YYYY-MM-DD to avoid timezone shift to previous day */}
                                <div style={{ color: 'gray' }}>{String(evt.date).split('T')[0]} • {evt.type}</div>
                                <div style={{ fontSize: '0.8rem', color: 'gray', marginTop: '5px' }}>
                                    {evt.registrations?.length || 0} ATTENDEES
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setSelectedEventForView(evt)}
                                    style={{ background: '#333', border: '1px solid gray', color: 'white', padding: '5px 10px', cursor: 'pointer' }}
                                >
                                    VIEW ATTENDEES
                                </button>
                                <button
                                    onClick={() => deleteEvent(evt.id)}
                                    style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}
                                >
                                    DELETE
                                </button>
                            </div>
                        </div>
                    ))}
                    {otherEvents.length === 0 && (
                        <div style={{ color: 'gray', fontStyle: 'italic' }}>No other scheduled sessions.</div>
                    )}
                </div>
            </div>

            {/* Attendees Modal */}
            {selectedEventForView && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'
                }} onClick={() => setSelectedEventForView(null)}>
                    <div style={{
                        background: '#111', border: '1px solid var(--color-neon-green)', padding: '2rem',
                        width: '600px', maxHeight: '80vh', overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 className="text-neon" style={{ marginBottom: '1rem' }}>{selectedEventForView.name}</h2>
                        <h4 style={{ color: 'gray', marginBottom: '1rem' }}>ATTENDEE LIST</h4>

                        <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                                    <th style={{ padding: '5px' }}>NAME</th>
                                    <th style={{ padding: '5px' }}>EMAIL</th>
                                    <th style={{ padding: '5px' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(selectedEventForView as any).registrations?.map((reg: any) => (
                                    <tr key={reg.id} style={{ borderBottom: '1px solid #222' }}>
                                        <td style={{ padding: '8px' }}>{reg.customer.name}</td>
                                        <td style={{ padding: '8px', color: 'gray' }}>{reg.customer.email}</td>
                                        <td style={{ padding: '8px' }}>
                                            <button
                                                onClick={() => {
                                                    // Hack: Reuse standard JS alert or console if we don't want another modal within modal.
                                                    // Better: Add a "Show QR" state.
                                                    alert(`QR CONTENT:\n${reg.qrCodeData}`);
                                                }}
                                                style={{ background: '#333', color: 'var(--color-neon-green)', border: '1px solid var(--color-neon-green)', cursor: 'pointer', padding: '2px 5px', fontSize: '0.8rem' }}
                                            >
                                                CHECK DATA
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(!selectedEventForView as any).registrations?.length && (
                                    <tr><td colSpan={3} style={{ padding: '1rem', textAlign: 'center' }}>NO ATTENDEES YET</td></tr>
                                )}
                            </tbody>
                        </table>

                        <button
                            onClick={() => setSelectedEventForView(null)}
                            style={{ marginTop: '1rem', width: '100%', padding: '10px', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}
                        >
                            CLOSE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
