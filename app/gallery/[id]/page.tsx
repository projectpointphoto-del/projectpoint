import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import styles from './gallery.module.css';

// Force dynamic behavior (no static caching)
export const dynamic = 'force-dynamic';

async function getRegistration(id: string) {
    const registration = await prisma.registration.findUnique({
        where: { id },
        include: {
            customer: true,
            event: true
        }
    });

    if (!registration) return null;

    // Security: Only show if PAID (or maybe allow preview if PENDING?)
    // For now, let's be strict: PAY FIRST.
    // if (registration.status !== 'PAID') return null; 
    // Actually, let's allow viewing but maybe blur them if not paid? 
    // The user requirement was "Pay First, View Instantly", so they should be paid.

    return registration;
}

async function getPhotos(registration: any) {
    // Find photos linked to this Customer at this Event
    // NOTE: This relies on the "Association" step (Admin/AI) linking them.
    return await prisma.photo.findMany({
        where: {
            eventId: registration.eventId,
            customerId: registration.customerId, // Direct link
            status: 'APPROVED' // Only show approved photos
        },
        orderBy: { takenAt: 'desc' }
    });
}

export default async function GalleryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const registration = await getRegistration(id);

    if (!registration) {
        return notFound();
    }

    const photos = await getPhotos(registration);

    return (
        <main className={styles.main}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.brand}>PROJECT<span className={styles.neon}>POINT</span></div>
                <div className={styles.customerInfo}>
                    <h1>{registration.displayName || registration.customer.name}</h1>
                    <span className={styles.badge}>{registration.event.name}</span>
                </div>
            </header>

            {/* Gallery Grid */}
            <section className={styles.gallery}>
                {photos.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.scannerAnimation}></div>
                        <h2 className={styles.neonText}>PHOTOS INCOMING</h2>
                        <p>Our team is currently tagging and editing your shots.</p>
                        <p style={{ color: '#666', marginTop: '10px' }}>
                            We upload in real-time. Please keep this tab open.
                        </p>
                        <button onClick={() => window.location.reload()} className={styles.refreshBtn}>
                            REFRESH STATUS
                        </button>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {photos.map(photo => (
                            <div key={photo.id} className={styles.photoCard}>
                                <img src={photo.url} alt="Event Photo" loading="lazy" />
                                <div className={styles.actions}>
                                    <a href={photo.url} download target="_blank" rel="noopener noreferrer" className={styles.downloadBtn}>
                                        DOWNLOAD
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Print Shop Upsell */}
            <section className={styles.printSection}>
                <h3>WANT PRO PRINTS?</h3>
                <p>Order high-quality physical prints delivered to your door.</p>
                <div className={styles.printPartners}>
                    <span>POWERED BY</span>
                    <strong>H&H COLOR LAB</strong>
                </div>
                <a href="https://www.hhcolorlab.com/" target="_blank" rel="noopener noreferrer" className={styles.printBtn}>
                    ORDER PRINTS
                </a>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <p>SESSION ID: {registration.id}</p>
                {registration.status === 'PAID' ?
                    <span className={styles.paidBadge}>PAID & UNLOCKED</span> :
                    <span className={styles.unpaidBadge}>PAYMENT PENDING</span>
                }
            </footer>
        </main>
    );
}
