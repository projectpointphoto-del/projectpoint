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

        // Use provided slug or generate one
        let slug = body.slug;
        if (!slug) {
            slug = body.name.toLowerCase().replace(/ /g, '-') + '-' + Math.floor(Math.random() * 1000);
        }

        // Use upsert to prevent duplicates if slug matches (Essential for Walk-in days)
        const event = await prisma.event.upsert({
            where: { slug: slug },
            update: {}, // No updates, just return existing
            create: {
                name: body.name,
                date: new Date(body.date),
                type: body.type,
                slug: slug
            }
        });

        return NextResponse.json(event);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
