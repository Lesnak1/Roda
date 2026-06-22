"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck, Award, Layers, ExternalLink } from "lucide-react";
import { USDC_ADDRESS, circleAbi, erc20Abi, CircleState } from "@/lib/contracts";
import { formatUsdc, fmtCountdown, shortAddr } from "@/lib/format";
import { explorerAddress } from "@/lib/chains/arcTestnet";
import { TxStatus } from "./TxStatus";
import { ReputationPanel } from "./ReputationPanel";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
} as const;

export function CircleDetail({
  address,
  onBack,
}: {
  address: `0x${string}`;
  onBack: () => void;
}) {
  const { address: account } = useAccount();

  const baseRead = { address, abi: circleAbi } as const;
  const { data, refetch, isLoading, isRefetching } = useReadContracts({
    contracts: [
      { ...baseRead, functionName: "state" },
      { ...baseRead, functionName: "contributionAmount" },
      { ...baseRead, functionName: "collateralAmount" },
      { ...baseRead, functionName: "memberCount" },
      { ...baseRead, functionName: "membersJoined" },
      { ...baseRead, functionName: "currentRound" },
      { ...baseRead, functionName: "roundDeadline" },
      { ...baseRead, functionName: "memberList" },
    ],
  });

  const state = Number(data?.[0]?.result ?? 0);
  const contribution = (data?.[1]?.result as bigint) ?? 0n;
  const collateral = (data?.[2]?.result as bigint) ?? 0n;
  const memberCount = Number(data?.[3]?.result ?? 0);
  const joined = Number(data?.[4]?.result ?? 0);
  const currentRound = Number(data?.[5]?.result ?? 0);
  const roundDeadline = Number(data?.[6]?.result ?? 0);
  const members = (data?.[7]?.result as `0x${string}`[]) ?? [];

  const isMember = account ? members.map((m) => m.toLowerCase()).includes(account.toLowerCase()) : false;
  const pot = contribution * BigInt(memberCount);

  const { data: roundData, refetch: refetchRound } = useReadContracts({
    contracts: [
      { ...baseRead, functionName: "hasContributed", args: account ? [BigInt(currentRound), account] : undefined },
      { ...baseRead, functionName: "roundClosed", args: [BigInt(currentRound)] },
      { ...baseRead, functionName: "beneficiaryOf", args: [BigInt(currentRound)] },
      { ...baseRead, functionName: "payoutClaimed", args: [BigInt(currentRound)] },
    ],
    query: { enabled: state === CircleState.Active },
  });
  const hasContributed = Boolean(roundData?.[0]?.result);
  const roundClosed = Boolean(roundData?.[1]?.result);
  const beneficiary = (roundData?.[2]?.result as `0x${string}`) ?? undefined;
  const payoutClaimed = Boolean(roundData?.[3]?.result);
  const isBeneficiary = account && beneficiary ? account.toLowerCase() === beneficiary.toLowerCase() : false;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: account ? [account, address] : undefined,
    query: { enabled: Boolean(account) },
  });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  function refreshAll() {
    refetch();
    refetchRound();
    refetchAllowance();
  }
  function onTx() {
    setTimeout(refreshAll, 2500);
  }
  function approve(amount: bigint) {
    reset();
    writeContract(
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: "approve", args: [address, amount] },
      { onSuccess: onTx }
    );
  }
  function call(functionName: "join" | "contribute" | "closeRound" | "withdrawCollateral") {
    reset();
    writeContract({ ...baseRead, functionName }, { onSuccess: onTx });
  }
  function claim(round: number) {
    reset();
    writeContract({ ...baseRead, functionName: "claimPayout", args: [BigInt(round)] }, { onSuccess: onTx });
  }

  const allowanceVal = (allowance as bigint) ?? 0n;
  const needApproveForJoin = allowanceVal < collateral;
  const needApproveForContribute = allowanceVal < contribution;
  const busy = isPending || isConfirming;

  const stateBadge = useMemo(() => {
    if (state === CircleState.Recruiting) return <span className="badge blue">Recruiting</span>;
    if (state === CircleState.Active) return <span className="badge green"><span className="live-dot" /> Active</span>;
    return <span className="badge gray">Completed</span>;
  }, [state]);

  if (isLoading) {
    return (
      <div className="card">
        <button className="btn ghost sm back-btn" onClick={onBack}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back
        </button>
        <div className="skeleton" style={sk1} />
        <div className="skeleton" style={sk2} />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ display: "flex", flexDirection: "column", gap: "20px" }}
    >
      <motion.div variants={itemVariants} className="back-btn">
        <button className="btn ghost sm" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={16} /> All circles
        </button>
      </motion.div>

      <motion.div variants={itemVariants} className="card">
        <div className="row" style={{ marginBottom: "16px" }}>
          {stateBadge}
          <div className="spacer" />
          <a
            className="link-addr"
            href={explorerAddress(address)}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {shortAddr(address)}
            <ExternalLink size={13} />
          </a>
        </div>

        <h2 style={sTitle}>
          {formatUsdc(contribution)} <span className="muted" style={{ fontWeight: 500 }}>USDC</span> × {memberCount} members
        </h2>

        <div className="stats">
          <div className="stat">
            <div className="k">Pot / round</div>
            <div className="v mono">{formatUsdc(pot)}</div>
          </div>
          <div className="stat">
            <div className="k">Collateral</div>
            <div className="v mono">{formatUsdc(collateral)}</div>
          </div>
          <div className="stat">
            <div className="k">Joined</div>
            <div className="v mono">{joined}/{memberCount}</div>
          </div>
          {state === CircleState.Active && (
            <div className="stat">
              <div className="k">Round {currentRound + 1} ends in</div>
              <div className="v mono" style={{ color: "var(--accent)" }}>{fmtCountdown(roundDeadline)}</div>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {state === CircleState.Recruiting && (
            <motion.div
              key="recruiting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="row"
              style={sActions}
            >
              {isMember ? (
                <div className="alert ok" style={{ width: "100%" }}>
                  <CheckCircle size={16} className="ai" />
                  <span>You have joined this circle. Waiting for other members to fill the remaining seats...</span>
                </div>
              ) : needApproveForJoin ? (
                <button className="btn" disabled={busy} onClick={() => approve(collateral)}>
                  {busy && <span className="btn-spin" />}1) Approve USDC ({formatUsdc(collateral)})
                </button>
              ) : (
                <button className="btn success" disabled={busy} onClick={() => call("join")}>
                  {busy && <span className="btn-spin" />}2) Join Circle
                </button>
              )}
            </motion.div>
          )}

          {state === CircleState.Active && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="row"
              style={sActions}
            >
              {!isMember && (
                <div className="alert warn" style={{ width: "100%" }}>
                  <AlertTriangle size={16} className="ai" />
                  <span>This circle is active and full. You are not a participant in this circle.</span>
                </div>
              )}
              {isMember && !hasContributed && (
                needApproveForContribute ? (
                  <button className="btn" disabled={busy} onClick={() => approve(contribution)}>
                    {busy && <span className="btn-spin" />}1) Approve USDC ({formatUsdc(contribution)})
                  </button>
                ) : (
                  <button className="btn success" disabled={busy} onClick={() => call("contribute")}>
                    {busy && <span className="btn-spin" />}2) Pay This Round ({formatUsdc(contribution)})
                  </button>
                )
              )}
              {isMember && hasContributed && (
                <div className="alert ok">
                  <CheckCircle size={16} className="ai" />
                  <span>Your contribution for Round {currentRound + 1} has been processed successfully.</span>
                </div>
              )}
              <button className="btn ghost" disabled={busy} onClick={() => call("closeRound")}>
                Close Round
              </button>
              {isBeneficiary && roundClosed && !payoutClaimed && (
                <button className="btn success" disabled={busy} onClick={() => claim(currentRound)}>
                  {busy && <span className="btn-spin" />}Claim Pot ({formatUsdc(pot)} USDC)
                </button>
              )}
            </motion.div>
          )}

          {state === CircleState.Completed && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="row"
              style={sActions}
            >
              <div className="alert ok" style={{ width: "100%" }}>
                <ShieldCheck size={16} className="ai" />
                <span>Circle completed successfully. All rounds are settled and closed.</span>
              </div>
              {isMember && (
                <button className="btn" disabled={busy} onClick={() => call("withdrawCollateral")}>
                  {busy && <span className="btn-spin" />}Withdraw Collateral
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isConfirmed={isConfirmed} error={error} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <SchedulePanel address={address} members={members} currentRound={currentRound} state={state} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <ReputationPanel address={address} members={members} />
      </motion.div>
    </motion.div>
  );
}

function SchedulePanel({
  members,
  currentRound,
  state,
}: {
  address: `0x${string}`;
  members: `0x${string}`[];
  currentRound: number;
  state: number;
}) {
  const { address: account } = useAccount();
  return (
    <div className="card">
      <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Layers size={18} className="grad-text" />
        Payout Schedule
      </h3>
      <p className="card-desc">The rotating order of beneficiaries is fixed by join order and registered publicly on-chain.</p>
      {members.length === 0 && <p className="muted">No members have joined yet.</p>}
      <div className="timeline">
        {members.map((m, i) => {
          const done = state === CircleState.Completed || i < currentRound;
          const active = state === CircleState.Active && i === currentRound;
          const mine = account && m.toLowerCase() === account.toLowerCase();
          return (
            <div key={m + i} className="tl-item">
              <div className="tl-node">
                <span className={"dot" + (done ? " done" : active ? " active" : "")} />
                <span className="tl-round">Round {i + 1}</span>
              </div>
              <div className="spacer" />
              <span className="mono" style={{ fontWeight: mine ? 700 : 500 }}>
                {shortAddr(m)}{mine ? " (you)" : ""}
              </span>
              {done && <span className="badge green" style={{ padding: "3px 9px", fontSize: "11px" }}>paid</span>}
              {active && <span className="badge blue" style={{ padding: "3px 9px", fontSize: "11px" }}>active</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const sTitle: CSSProperties = { margin: "14px 0 20px", fontSize: 28, letterSpacing: "-0.025em", fontWeight: 800 };
const sActions: CSSProperties = { marginTop: 22, gap: 12 };
const sk1: CSSProperties = { width: "40%", marginTop: 14 };
const sk2: CSSProperties = { width: "70%", marginTop: 16, height: 28 };
