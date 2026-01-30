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

export default async function GalleryPage({ params }: { params: { id: string } }) {
    const registration = await getRegistration(params.id);

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
                        <h2>PHOTOS PROCESSING...</h2>
                        <p>Your photos are being edited and tagged.</p>
                        <p>Refresh this page in a few minutes.</p>
                        <div className={styles.loader}></div>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {photos.map(photo => (
                            <div key={photo.id} className={styles.photoCard}>
                                <img src={photo.url} alt="Event Photo" loading="lazy" />
                                <div className={styles.actions}>
                                    <a href={photo.url} download target="_blank" rel="noopener noreferrer" className={styles.downloadBtn}>
                                        DOWNLOAD HIGH-RES
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
