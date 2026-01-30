import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

// Config (Will use environment variables)
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function POST(request: Request) {
    try {
        if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
            return NextResponse.json(
                { error: 'Server Misconfiguration: Missing Cloudinary Credentials' },
                { status: 500 }
            );
        }

        // 1. Parse Multipart Form Data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const customerId = formData.get('customerId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 2. Prepare Cloudinary Upload Parameters
        const timestamp = Math.round((new Date()).getTime() / 1000);
        const params: Record<string, string> = {
            timestamp: timestamp.toString(),
            folder: 'project-point_raw', // Keep organized
        };

        // 3. Generate Signature (SHA1 of sorted parameters + API_SECRET)
        // Sort keys
        const sortedKeys = Object.keys(params).sort();
        const signatureString = sortedKeys.map(key => `${key}=${params[key]}`).join('&') + API_SECRET;

        const signature = crypto
            .createHash('sha1')
            .update(signatureString)
            .digest('hex');

        // 4. Send to Cloudinary via REST API
        // We need to send 'file', 'api_key', 'timestamp', 'signature', etc.
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', file);
        cloudinaryFormData.append('api_key', API_KEY);
        cloudinaryFormData.append('timestamp', timestamp.toString());
        cloudinaryFormData.append('signature', signature);
        cloudinaryFormData.append('folder', params.folder);

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

        console.log(`📤 Uploading to Cloudinary [${CLOUD_NAME}]...`);

        const response = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: cloudinaryFormData,
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Cloudinary Error:', data);
            throw new Error(data.error?.message || 'Cloudinary upload failed');
        }

        // 5. Success! Save to Database

        // Find a default event for "Field Uploads" if none specified
        // For now, we'll just grab the most recent FIELD event or create one for today
        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
        const defaultEventId = 'walk-in-' + dateStr;

        // Ensure the event exists (idempotent)
        await prisma.event.upsert({
            where: { id: defaultEventId },
            update: {},
            create: {
                id: defaultEventId,
                name: `Walk-in (${dateStr})`,
                date: new Date(),
                type: 'FIELD'
            }
        });

        const newPhoto = await prisma.photo.create({
            data: {
                url: data.secure_url,
                publicId: data.public_id,
                format: data.format,
                width: data.width,
                height: data.height,
                status: customerId ? 'APPROVED' : 'PENDING_REVIEW', // Auto-approve if linked immediately
                eventId: defaultEventId,
                customerId: customerId || null
            }
        });

        return NextResponse.json({
            success: true,
            status: 'SAVED_TO_DB',
            photoId: newPhoto.id,
            cloudData: {
                public_id: data.public_id,
                url: data.secure_url
            }
        });

    } catch (error: any) {
        console.error('Upload API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
