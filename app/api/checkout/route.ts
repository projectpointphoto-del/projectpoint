import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with the private key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia', // Use latest or what's compatible
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { eventId, customerId, registrationId, redirectUrl } = body;

        // Base domain for redirection
        const origin = request.headers.get('origin') || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Event Registration',
                            description: 'Access to event photos',
                        },
                        unit_amount: 1000,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}?canceled=true`,
            metadata: {
                eventId,
                customerId,
                registrationId
            },
        });

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error('Stripe Error:', error);
        return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
    }
}
