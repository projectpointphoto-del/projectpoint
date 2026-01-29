import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
});

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    try {
        // 1. Retrieve the session from Stripe to verify it actually exists and is paid
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return NextResponse.json({ success: false, message: 'Payment not completed' });
        }

        const registrationId = session.metadata?.registrationId;

        if (!registrationId) {
            return NextResponse.json({ error: 'No registration linked to this payment' }, { status: 400 });
        }

        // 2. Update Database: Mark as PAID (Unlock the QR)
        const updatedReg = await prisma.registration.update({
            where: { id: registrationId },
            data: {
                status: 'PAID',
                stripeSessionId: sessionId
            },
            include: {
                customer: true,
                event: true
            }
        });

        // 3. Return the unlocked Data (QR Code)
        return NextResponse.json({
            success: true,
            qrCode: updatedReg.qrCode,
            customerName: updatedReg.customer.name,
            eventName: updatedReg.event.name
        });

    } catch (error) {
        console.error('Verification Error:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
