"use client";

import { explorerTx } from "@/lib/chains/arcTestnet";

type Props = {
  hash?: `0x${string}`;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  isReverted?: boolean;
  error?: Error | null;
};

// Full transaction lifecycle: pending -> confirming -> success / reverted / failed.
export function TxStatus({ hash, isPending, isConfirming, isConfirmed, isReverted, error }: Props) {
  if (error) {
    return (
      <div className="alert err">
        <span className="ai">✕</span>
        <span>Transaction failed: {error.message.split("\n")[0]}</span>
      </div>
    );
  }
  if (isReverted && hash) {
    return (
      <div className="alert err">
        <span className="ai">✕</span>
        <span>
          Transaction reverted on-chain.{" "}
          <a href={explorerTx(hash)} target="_blank" rel="noreferrer">
            View on explorer
          </a>
        </span>
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
          Transaction sent, waiting for confirmation…{" "}
          {hash && (
            <a href={explorerTx(hash)} target="_blank" rel="noreferrer">
              View on explorer
            </a>
          )}
        </span>
      </div>
    );
  }
  if (isConfirmed && hash && !isReverted) {
    return (
      <div className="alert ok">
        <span className="ai">✓</span>
        <span>
          Transaction confirmed.{" "}
          <a href={explorerTx(hash)} target="_blank" rel="noreferrer">
            View on explorer
          </a>
        </span>
      </div>
    );
  }
  return null;
}
