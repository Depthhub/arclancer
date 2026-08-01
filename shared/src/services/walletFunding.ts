export type WalletFundingResult =
  | {
      mode: "faucet";
      network: "ARC-TESTNET";
      status: "requested";
      walletAddress: string;
      asset: "USDC";
    }
  | {
      mode: "payment_gateway";
      network: "ARC";
      status: "action_required";
      walletAddress: string;
      checkoutUrl: string;
    };

export async function fundWallet(walletAddress: string): Promise<WalletFundingResult> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error("A valid linked Arc wallet is required");
  }

  const network = process.env.ARC_NETWORK?.trim().toLowerCase() ?? "testnet";
  if (network === "mainnet") {
    const configuredUrl = process.env.CIRCLE_PAYMENT_GATEWAY_URL?.trim();
    if (!configuredUrl) {
      throw new Error("Circle Payment Gateway is not configured");
    }
    const checkout = new URL(configuredUrl);
    checkout.searchParams.set("walletAddress", walletAddress);
    return {
      mode: "payment_gateway",
      network: "ARC",
      status: "action_required",
      walletAddress,
      checkoutUrl: checkout.toString(),
    };
  }

  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  if (!apiKey) throw new Error("Circle API key is not configured");

  const response = await fetch("https://api.circle.com/v1/faucet/drips", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address: walletAddress,
      blockchain: "ARC-TESTNET",
      usdc: true,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : `Circle faucet request failed (${response.status})`;
    throw new Error(message);
  }

  return {
    mode: "faucet",
    network: "ARC-TESTNET",
    status: "requested",
    walletAddress,
    asset: "USDC",
  };
}
