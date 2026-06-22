"use client";

import { explorerTx } from "@/lib/chains/arcTestnet";

type Props = {
  hash?: `0x${string}`;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error?: Error | null;
};

// Full transaction lifecycle: pending -> confirming -> success (with explorer
// link) / failed. Mirrors the Arc guide UX checklist.
export function TxStatus({ hash, isPending, isConfirming, isConfirmed, error }: Props) {
  if (error) {
    return (
      <div className="alert err">
        <span className="ai">✕</span>
        <span>Transaction failed: {error.message.split("\n")[0]}</span>
      </div>
    );
  }
  if (isPending) {
    return (
      <div className="alert warn">
        <span className="btn-spin" />
        <span>Waiting for wallet confirmation…</span>
      </div>
    );
  }
  if (isConfirming) {
    return (
      <div className="alert warn">
        <span className="btn-spin" />
        <span>
          Transaction sent, waiting for finality…{" "}
          {hash && (
            <a href={explorerTx(hash)} target="_blank" rel="noreferrer">
              View on explorer
            </a>
          )}
        </span>
      </div>
    );
  }
  if (isConfirmed && hash) {
    return (
      <div className="alert ok">
        <span className="ai">✓</span>
        <span>
          Confirmed · sub-second finality.{" "}
          <a href={explorerTx(hash)} target="_blank" rel="noreferrer">
            View on explorer
          </a>
        </span>
      </div>
    );
  }
  return null;
}
