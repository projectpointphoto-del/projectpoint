import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const whereClause = status ? { status } : {};

        const photos = await prisma.photo.findMany({
            where: whereClause,
            orderBy: { uploadedAt: 'desc' },
            include: {
                event: true,
                customer: true
            }
        });

        return NextResponse.json({ success: true, photos });
    } catch (error: any) {
        console.error('Fetch Photos Error:', error);
        return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status, customerId } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const updateData: any = {};
        if (status) updateData.status = status;
        if (customerId) updateData.customerId = customerId;

        const updatedPhoto = await prisma.photo.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true, photo: updatedPhoto });

    } catch (error: any) {
        console.error('Update Photo Error:', error);
        return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }
}
