import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const events = await prisma.event.findMany({
            include: {
                registrations: {
                    include: {
                        customer: true
                    }
                }
            },
            orderBy: { date: 'asc' }
        });
        return NextResponse.json(events);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        // Cascade delete everything related to events
        await prisma.photo.deleteMany({});
        await prisma.registration.deleteMany({});
        await prisma.event.deleteMany({});

        return NextResponse.json({ success: true, message: 'All events wiped' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete all' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // If ID is provided (e.g. "walk-in-2023-10-27"), upsert it.
        // Otherwise, create new auto-ID event.
        if (body.id) {
            const event = await prisma.event.upsert({
                where: { id: body.id },
                update: {},
                create: {
                    id: body.id,
                    name: body.name,
                    date: new Date(body.date),
                    type: body.type
                }
            });
            return NextResponse.json(event);
        } else {
            const event = await prisma.event.create({
                data: {
                    name: body.name,
                    date: new Date(body.date),
                    type: body.type
                }
            });
            return NextResponse.json(event);
        }

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
