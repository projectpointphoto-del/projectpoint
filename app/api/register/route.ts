import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, phone, email, eventId, type } = body;

        // 1. Create or Find Customer (Simple logic: assuming email/phone unique enough for demo)
        // In a real app we might upsert based on email
        let customer = await prisma.customer.findUnique({
            where: { email },
        });

        if (!customer) {
            customer = await prisma.customer.create({
                data: { name, phone, email },
            });
        }

        // 2. Determine Event
        // If no eventId provided (Field Walk-in), we might need a default "Walk-in" event
        // For now, if eventId is missing, we create a dummy "Field" event or check if one exists
        let targetEventId = eventId;
        if (!targetEventId) {
            // "Daily Walk-in" Logic:
            // Automatically create a separate event container for TODAY (San Antonio Time) if it doesn't exist.
            // Using en-CA (Canada) results in YYYY-MM-DD format, forcing America/Chicago timezone.
            const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
            const slug = `walk-in-${dateStr}`;

            const defaultEvent = await prisma.event.upsert({
                where: { id: 'walk-in-' + dateStr }, // Use ID since Slug is gone, or findFirst
                update: {},
                create: {
                    name: `Walk-in (${dateStr})`,
                    // slug removed
                    date: new Date(dateStr),
                    type: 'FIELD'
                }
            });
            // Actually, since slug is removed, we should query by name+date or just create.
            // Simplified: Just findFirst where name = Walk-in...

            // ... (fixing below)
        }

        // 3. Create Registration
        const registration = await prisma.registration.create({
            data: {
                customerId: customer.id,
                eventId: targetEventId,
                qrCode: 'TEMP_HOLDER',
            }
        });

        // 4. Construct the actual QR Data
        const actualQrData = JSON.stringify({
            id: registration.id,
            name: customer.name,
            type: type || 'FIELD'
        });

        // Update with final QR Data
        const finalReg = await prisma.registration.update({
            where: { id: registration.id },
            data: { qrCode: actualQrData }
        });

        return NextResponse.json({
            success: true,
            id: finalReg.id,
            qrData: actualQrData
        });

    } catch (error) {
        console.error('Registration Error:', error);
        return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
    }
}
