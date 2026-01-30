'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { QRCodeSVG } from 'qrcode.react';

export default function Home() {
    const [mode, setMode] = useState<'SELECT' | 'FIELD' | 'OFFICE'>('SELECT');
    const [step, setStep] = useState<'FORM' | 'SUCCESS'>('FORM');

    // Updated Form Data with New Fields
    const [formData, setFormData] = useState({
        name: '',
        displayName: '',
        phone: '',
        email: '',
        eventId: '',
        templateId: 'neon-fire' // Default
    });
    const [qrData, setQrData] = useState('');

    // Terms State
    const [confirmedInfo, setConfirmedInfo] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Events State
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/events')
            .then(res => res.json())
            .then(data => {
                // Filter for OFFICE events for the dropdown
                if (Array.isArray(data)) {
                    setEvents(data.filter((e: any) => e.type === 'OFFICE'));
                }
            })
            .catch(err => console.error(err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    type: mode
                })
            });

            const data = await res.json();

            if (data.success) {
                // PHASE 2: REDIRECT TO STRIPE
                const checkoutRes = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        registrationId: data.id,
                    })
                });

                const checkoutData = await checkoutRes.json();

                if (checkoutData.url) {
                    window.location.href = checkoutData.url;
                } else {
                    alert('Payment Error: ' + (checkoutData.error || 'Could not initiate checkout'));
                }
            } else {
                alert('Registration Failed: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('Network Error. Please try again.');
        }
    };

    const reset = () => {
        setMode('SELECT');
        setStep('FORM');
        setFormData({
            name: '',
            displayName: '',
            phone: '',
            email: '',
            eventId: '',
            templateId: 'neon-fire'
        });
        setConfirmedInfo(false);
        setAgreedToTerms(false);
    };

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <div className="text-crimson">PROJECTPOINT</div>
                <div className="text-neon">PHOTO</div>
            </header>

            {mode === 'SELECT' && (
                <div className={`${styles.container} hud-border`}>
                    <h2 className={styles.title}>SELECT REGISTRATION TYPE</h2>
                    <button className={styles.button} onClick={() => setMode('FIELD')}>
                        WALK-IN (FIELD)
                    </button>
                    <button className={`${styles.button} ${styles.buttonOutline}`} onClick={() => setMode('OFFICE')}>
                        PRE-REGISTER (OFFICE)
                    </button>
                </div>
            )}

            {mode !== 'SELECT' && (
                <div className={`${styles.container} hud-border`}>
                    {step === 'FORM' ? (
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <h2 className={styles.title}>{mode} REGISTRATION</h2>

                            {/* Visual Confirmation for Walk-ins */}
                            {mode === 'FIELD' && (
                                <div style={{
                                    background: '#111',
                                    border: '1px solid var(--color-neon-green)',
                                    color: 'var(--color-neon-green)',
                                    padding: '10px',
                                    marginBottom: '1rem',
                                    fontSize: '0.9rem',
                                    textAlign: 'center'
                                }}>
                                    JOINING SESSION: <strong>Walk-in ({new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })})</strong>
                                </div>
                            )}

                            <div className={styles.inputGroup}>
                                <label>FULL NAME</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="JOHN DOE"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>DISPLAY NAME (ON CARD)</label>
                                <input
                                    type="text"
                                    placeholder="LIL MIKE (OPTIONAL)"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>SELECT YOUR STYLE</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '5px' }}>
                                    {[
                                        { id: 'neon-fire', label: 'NEON FIRE', color: '#ff003c' },
                                        { id: 'cyber-ice', label: 'CYBER ICE', color: '#00f3ff' },
                                        { id: 'trading-card-3', label: '3-POSE CARD', color: '#ccff00' }
                                    ].map(style => (
                                        <div
                                            key={style.id}
                                            onClick={() => setFormData({ ...formData, templateId: style.id })}
                                            style={{
                                                border: formData.templateId === style.id ? `2px solid ${style.color}` : '1px solid #333',
                                                background: formData.templateId === style.id ? '#222' : '#111',
                                                padding: '15px 5px',
                                                textAlign: 'center',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                color: formData.templateId === style.id ? 'white' : '#777',
                                                fontWeight: 'bold',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ width: '100%', height: '40px', background: style.color, marginBottom: '5px', opacity: 0.8 }}></div>
                                            {style.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>PHONE</label>
                                <input
                                    required
                                    type="tel"
                                    placeholder="555-0123"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>EMAIL</label>
                                <input
                                    required
                                    type="email"
                                    placeholder="JOHN@EXAMPLE.COM"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            {mode === 'OFFICE' && (
                                <div className={styles.inputGroup}>
                                    <label>SELECT EVENT DATE</label>
                                    <select
                                        required
                                        value={formData.eventId}
                                        onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                                        className={styles.select}
                                    >
                                        <option value="">-- CHOOSE EVENT --</option>
                                        {events.map(evt => (
                                            <option key={evt.id} value={evt.id}>
                                                {evt.date} - {evt.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={styles.inputGroup} style={{ marginTop: '2rem' }}>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={confirmedInfo}
                                        onChange={e => setConfirmedInfo(e.target.checked)}
                                        className={styles.checkbox}
                                    />
                                    <span style={{ textAlign: 'left', flex: 1, lineHeight: '1.2' }}>I CONFIRM THAT MY NAME, PHONE, AND EMAIL ARE CORRECT.</span>
                                </label>
                            </div>

                            <div style={{
                                margin: '2rem 0',
                                padding: '1.5rem',
                                background: '#111',
                                border: '1px solid var(--color-gray-grid)',
                                textAlign: 'left',
                                fontSize: '0.9rem',
                                color: '#ccc'
                            }}>
                                <h3 className="text-crimson" style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>TERMS & CONDITIONS</h3>
                                <p style={{ marginBottom: '0.8rem' }}>
                                    <strong>1. ARRIVAL POLICY:</strong> You MUST arrive <strong>15 minutes early</strong> or exactly on time.
                                </p>
                                <p style={{ marginBottom: '0.8rem' }}>
                                    <strong>2. LATE ARRIVALS:</strong> Late arrivals <strong>WILL NOT BE RESCHEDULED</strong>. If you miss your slot, you must make a new appointment (and pay again). <em style={{ color: 'var(--color-crimson)' }}>Strictly enforced.</em>
                                </p>
                                <p style={{ marginBottom: '0.8rem' }}>
                                    <strong>3. MODEL RELEASE:</strong> We reserve the right to use photographs for promotional material unless written notice is provided before the session.
                                </p>
                                <p>
                                    <strong>4. PAYMENT:</strong> By submitting payment, you explicitly agree to these terms.
                                </p>
                            </div>

                            <div className={styles.inputGroup}>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={e => setAgreedToTerms(e.target.checked)}
                                        className={styles.checkbox}
                                    />
                                    <span style={{ color: agreedToTerms ? 'var(--color-neon-green)' : 'white', fontWeight: 'bold', textAlign: 'left', flex: 1, lineHeight: '1.2' }}>
                                        I AGREE TO THE TERMS & CONDITIONS
                                    </span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                className={styles.button}
                                disabled={!confirmedInfo || !agreedToTerms}
                                style={{ opacity: (!confirmedInfo || !agreedToTerms) ? 0.5 : 1, cursor: (!confirmedInfo || !agreedToTerms) ? 'not-allowed' : 'pointer' }}
                            >
                                {mode === 'FIELD' ? 'PAY & GENERATE ID CARD' : 'PAY & COMPLETE REGISTRATION'}
                            </button>

                            <button type="button" onClick={reset} className={styles.textBtn}>
                                &lt; BACK
                            </button>
                        </form>
                    ) : (
                        <div className={styles.success}>
                            {mode === 'FIELD' ? (
                                <>
                                    <h2 className="text-neon">YOU'RE REGISTERED</h2>
                                    <div className={styles.qrContainer}>
                                        <QRCodeSVG value={qrData} size={256} className={styles.qr} level="H" includeMargin />
                                    </div>
                                    <p className={styles.instruction}>SHOW TIMECODE TO PHOTOGRAPHER</p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-neon" style={{ fontSize: '3rem' }}>DONE</h2>
                                    <p className={styles.instruction}>REGISTRATION CONFIRMED.</p>
                                    <p>PLEASE CHECK YOUR EMAIL FOR DETAILS.</p>
                                    <p className="text-crimson">SEE YOU ON SITE.</p>
                                </>
                            )}

                            <div className={styles.dataDisplay}>
                                <p>{formData.name}</p>
                            </div>

                            <button onClick={reset} className={styles.button} style={{ marginTop: '2rem' }}>
                                REGISTER ANOTHER
                            </button>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}

// Terms Modal Component (Internal) - NOT CURRENTLY USED BUT KEPT FOR REFERENCE
function TermsModal({ onClose }: { onClose: () => void }) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px'
        }} onClick={onClose}>
            {/* Modal Content - Omitted to save space as it repeats the inline terms logic */}
        </div>
    );
}
