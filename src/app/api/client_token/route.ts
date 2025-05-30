import { NextResponse } from "next/server";
import braintree from "braintree";

export async function GET() {
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
    // Generate client token
    const response = await gateway.clientToken.generate({});
    return NextResponse.json({ clientToken: response.clientToken });
  } catch (err) {
    console.error("Error generating client token:", err);
    return NextResponse.json(
      { error: "Failed to generate client token" },
      { status: 500 }
    );
  }
}
