import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, phone, email, eventId, type, displayName, templateId } = body;

        // ... (existing code)

        // 3. Create or Find Registration
        const registration = await prisma.registration.upsert({
            where: {
                eventId_customerId: {
                    eventId: targetEventId,
                    customerId: customer.id
                }
            },
            update: {
                displayName,
                templateId
            },
            create: {
                customerId: customer.id,
                eventId: targetEventId,
                displayName: displayName || name, // Fallback to full name if empty
                templateId: templateId || 'neon-fire', // Fallback
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

    } catch (error: any) {
        console.error('Registration Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Registration failed'
        }, { status: 500 });
    }
}
