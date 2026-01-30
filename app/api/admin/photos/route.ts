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
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing ID or Status' }, { status: 400 });
        }

        const updatedPhoto = await prisma.photo.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({ success: true, photo: updatedPhoto });

    } catch (error: any) {
        console.error('Update Photo Error:', error);
        return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }
}
