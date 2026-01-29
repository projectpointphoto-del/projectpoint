import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Manual Cascade Delete: Remove all registrations linked to this event first
        await prisma.registration.deleteMany({
            where: { eventId: id }
        });

        await prisma.photo.deleteMany({
            where: { eventId: id }
        });

        await prisma.event.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
