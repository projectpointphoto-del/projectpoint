import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Ensure no caching for admin data

export async function GET() {
    try {
        const registrations = await prisma.registration.findMany({
            include: {
                customer: true,
                event: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        // Transform to flat structure for the UI
        const data = registrations.map(reg => ({
            id: reg.id,
            name: reg.customer.name,
            email: reg.customer.email,
            phone: reg.customer.phone,
            event: reg.event.name,
            eventType: reg.event.type,
            qrData: reg.qrCodeData,
            createdAt: reg.createdAt
        }));

        return NextResponse.json(data);

    } catch (error) {
        console.error('Fetch Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

}

export async function DELETE() {
    try {
        // 1. Delete ALL Photos
        await prisma.photo.deleteMany({});

        // 2. Delete ALL Registrations
        await prisma.registration.deleteMany({});

        // 3. Delete ALL Customers
        await prisma.customer.deleteMany({});

        return NextResponse.json({ success: true, message: 'All customers wiped' });
    } catch (error) {
        console.error('Delete All Error:', error);
        return NextResponse.json({ error: 'Failed to delete all' }, { status: 500 });
    }
}
