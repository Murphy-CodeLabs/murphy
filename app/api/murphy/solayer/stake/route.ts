// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';

/**
 * Route handler for Solayer stake API
 * Acts as a proxy to avoid CORS errors
 */
export async function POST(request: NextRequest) {
  try {
    // Retrieve the amount parameter from the URL
    const searchParams = request.nextUrl.searchParams;
    const amount = searchParams.get('amount');

    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }

    // Retrieve account information from the request body
    const body = await request.json();
    const { account } = body;

    if (!account) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Call Solayer API
    const response = await fetch(
      `https://app.solayer.org/api/action/restake/ssol?amount=${amount}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account,
        }),
      }
    );

    // Retrieve the result from Solayer API
    const data = await response.json();

    // If the request is unsuccessful, return an error
    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Stake request failed' },
        { status: response.status }
      );
    }

    // Return the successful result
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in Solayer stake API route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}