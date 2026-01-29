import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Cascade delete is usually handled by DB, but here registrations delete is tricky depending on schema.
    // Our schema doesn't specify ON DELETE CASCADE explicitly in the relations shown in previous prompt (implied default RESTRICT often).
    // Safest to delete Registration first then Customer.
    const { id } = await params;

    // 0. Check if exists (optional but good for debugging)
    const exists = await prisma.customer.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ success: true, message: 'Already deleted' });
    }

    // 1. Delete associated Photos
    await prisma.photo.deleteMany({
      where: { customerId: id }
    });

    // 2. Delete associated Registrations
    await prisma.registration.deleteMany({
      where: { customerId: id }
    });

    // 3. Delete Customer
    await prisma.customer.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
