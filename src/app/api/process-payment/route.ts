import { NextResponse } from "next/server";
import braintree from "braintree";

export async function POST(request: Request) {
  // Get environment variables
  const merchantId = process.env.BRAINTREE_MERCHANT_ID;
  const publicKey = process.env.BRAINTREE_PUBLIC_KEY;
  const privateKey = process.env.BRAINTREE_PRIVATE_KEY;
  const environment =
    process.env.BRAINTREE_ENVIRONMENT === "sandbox"
      ? braintree.Environment.Sandbox
      : braintree.Environment.Production;

  // Validate required environment variables
  if (!merchantId || !publicKey || !privateKey) {
    return NextResponse.json(
      { error: "Braintree credentials not configured" },
      { status: 500 }
    );
  }

  // Initialize Braintree gateway
  const gateway = new braintree.BraintreeGateway({
    environment,
    merchantId,
    publicKey,
    privateKey,
  });

  try {
    const body = await request.json();
    const { paymentMethodNonce, amount } = body;

    // Validate the request
    if (!paymentMethodNonce || !amount) {
      return NextResponse.json(
        { error: "Payment method nonce and amount are required" },
        { status: 400 }
      );
    }

    // Process the transaction
    const result = await gateway.transaction.sale({
      amount: amount,
      paymentMethodNonce: paymentMethodNonce,
      options: {
        submitForSettlement: true,
        storeInVaultOnSuccess: true,
      },
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        transaction: {
          id: result.transaction.id,
          status: result.transaction.status,
        },
      });
    } else {
      return NextResponse.json(
        {
          error: "Transaction failed",
          details: result.message,
        },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Error processing payment:", err);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
