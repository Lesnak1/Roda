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
      { ...baseRead, functionName: "creator" },
      { ...baseRead, functionName: "joinDeadline" },
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
  const creator = (data?.[8]?.result as `0x${string}`) ?? undefined;
  const joinDeadline = Number(data?.[9]?.result ?? 0);
 
  const isMember = account ? members.map((m) => m.toLowerCase()).includes(account.toLowerCase()) : false;
  const isCreator = account && creator ? account.toLowerCase() === creator.toLowerCase() : false;
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

  const roundQueries = useMemo(() => {
    if (!members || members.length === 0) return [];
    return members.flatMap((_, i) => [
      { ...baseRead, functionName: "roundClosed", args: [BigInt(i)] },
      { ...baseRead, functionName: "payoutClaimed", args: [BigInt(i)] },
      { ...baseRead, functionName: "claimablePayout", args: [BigInt(i)] },
      { ...baseRead, functionName: "withheldFromPayout", args: [BigInt(i)] },
    ]);
  }, [members, address]);

  const { data: allRoundsData, refetch: refetchAllRounds } = useReadContracts({
    contracts: roundQueries,
    query: { enabled: members.length > 0 },
  });

  const unclaimedRounds = useMemo(() => {
    if (!account || !members || !allRoundsData) return [];
    const list = [];
    for (let i = 0; i < members.length; i++) {
      const beneficiaryAddress = members[i];
      if (beneficiaryAddress.toLowerCase() !== account.toLowerCase()) continue;
      
      const closed = Boolean(allRoundsData[i * 4]?.result);
      const claimed = Boolean(allRoundsData[i * 4 + 1]?.result);
      if (closed && !claimed) {
        const netPayout = (allRoundsData[i * 4 + 2]?.result as bigint) ?? 0n;
        const withheld = (allRoundsData[i * 4 + 3]?.result as bigint) ?? 0n;
        list.push({
          roundIndex: i,
          netPayout,
          withheld,
        });
      }
    }
    return list;
  }, [account, members, allRoundsData]);

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
    refetchAllRounds();
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
  function call(functionName: "join" | "contribute" | "closeRound" | "withdrawCollateral" | "leave" | "cancelCircle") {
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
    if (state === CircleState.Cancelled) return <span className="badge red">Cancelled</span>;
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
          {state === CircleState.Recruiting && (
            <div className="stat">
              <div className="k">Deadline to join</div>
              <div className="v mono" style={{ color: "var(--accent)" }}>{fmtCountdown(joinDeadline)}</div>
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
              style={{ ...sActions, flexDirection: "column", alignItems: "stretch" }}
            >
              <div style={{ display: "flex", gap: 12, width: "100%", flexWrap: "wrap" }}>
                {isMember ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                    <div className="alert ok" style={{ width: "100%" }}>
                      <CheckCircle size={16} className="ai" />
                      <span>You have joined this circle. Waiting for other members to fill the remaining seats...</span>
                    </div>
                    <button
                      className="btn ghost sm"
                      disabled={busy}
                      onClick={() => call("leave")}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
                    >
                      {busy && <span className="btn-spin" />}
                      Leave Circle & Refund Collateral
                    </button>
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
              </div>
              {isCreator && (
                <button
                  className="btn danger ghost sm"
                  disabled={busy}
                  onClick={() => call("cancelCircle")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 12 }}
                >
                  Cancel Circle (Creator)
                </button>
              )}
            </motion.div>
          )}

          {state === CircleState.Cancelled && (
            <motion.div
              key="cancelled"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="row"
              style={{ ...sActions, flexDirection: "column", alignItems: "stretch" }}
            >
              <div className="alert warn" style={{ width: "100%" }}>
                <AlertTriangle size={16} className="ai" />
                <span>This savings circle has been cancelled by its creator.</span>
              </div>
              {isMember && (
                <button
                  className="btn success sm"
                  disabled={busy}
                  onClick={() => call("withdrawCollateral")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 12 }}
                >
                  {busy && <span className="btn-spin" />}
                  Withdraw My Collateral ({formatUsdc(collateral)} USDC)
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

        {unclaimedRounds.length > 0 && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {unclaimedRounds.map((ur) => {
              const remRounds = memberCount - 1 - ur.roundIndex;
              const liability = contribution * BigInt(remRounds);
              return (
                <div key={ur.roundIndex} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                  <div style={breakdownBox}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Award size={16} className="grad-text" />
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                        Claim Payout Breakdown (Round {ur.roundIndex + 1})
                      </h4>
                    </div>
                    <div style={breakdownRow}>
                      <span style={breakdownLabel}>Gross Pot ({memberCount} members)</span>
                      <span className="mono" style={breakdownVal}>{formatUsdc(pot)} USDC</span>
                    </div>
                    <div style={breakdownRow}>
                      <span style={breakdownLabel}>Future Liability ({remRounds} rounds)</span>
                      <span className="mono" style={breakdownVal}>{formatUsdc(liability)} USDC</span>
                    </div>
                    <div style={breakdownRow}>
                      <span style={breakdownLabel}>Current Collateral Locked</span>
                      <span className="mono" style={breakdownVal}>{formatUsdc(collateral)} USDC</span>
                    </div>
                    <div style={{ ...breakdownRow, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6, color: "#3b82f6" }}>
                      <span style={{ ...breakdownLabel, fontWeight: 700 }}>Retained to Collateral</span>
                      <span className="mono" style={{ ...breakdownVal, fontWeight: 700 }}>+{formatUsdc(ur.withheld)} USDC</span>
                    </div>
                    <div style={{ ...breakdownRow, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6, color: "#10b981" }}>
                      <span style={{ ...breakdownLabel, fontWeight: 800 }}>Net Payout to Wallet</span>
                      <span className="mono" style={{ ...breakdownVal, fontWeight: 800 }}>{formatUsdc(ur.netPayout)} USDC</span>
                    </div>
                  </div>
                  <button className="btn success" disabled={busy} onClick={() => claim(ur.roundIndex)} style={{ alignSelf: "flex-start" }}>
                    {busy && <span className="btn-spin" />}
                    Claim Payout (Net: {formatUsdc(ur.netPayout)} USDC)
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isConfirmed={isConfirmed} error={error} />

        <div style={gasWarningBox}>
          <ShieldCheck size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span>
            <b>Decimal Note:</b> Gas fees on Arc are settled in native gas USDC (18 decimals), while circle contributions use ERC-20 USDC (6 decimals).
          </span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <SchedulePanel address={address} members={members} currentRound={currentRound} state={state} allRoundsData={allRoundsData} />
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
  allRoundsData,
}: {
  address: `0x${string}`;
  members: `0x${string}`[];
  currentRound: number;
  state: number;
  allRoundsData: any;
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
          
          const closed = allRoundsData ? Boolean(allRoundsData[i * 4]?.result) : done;
          const claimed = allRoundsData ? Boolean(allRoundsData[i * 4 + 1]?.result) : false;
          
          return (
            <div key={m + i} className="tl-item">
              <div className="tl-node">
                <span className={"dot" + (closed ? " done" : active ? " active" : "")} />
                <span className="tl-round">Round {i + 1}</span>
              </div>
              <div className="spacer" />
              <span className="mono" style={{ fontWeight: mine ? 700 : 500 }}>
                {shortAddr(m)}{mine ? " (you)" : ""}
              </span>
              {closed ? (
                claimed ? (
                  <span className="badge green" style={{ padding: "3px 9px", fontSize: "11px" }}>claimed</span>
                ) : (
                  <span className="badge orange" style={{ padding: "3px 9px", fontSize: "11px" }}>unclaimed</span>
                )
              ) : active ? (
                <span className="badge blue" style={{ padding: "3px 9px", fontSize: "11px" }}>active</span>
              ) : null}
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

const breakdownBox: CSSProperties = {
  backgroundColor: "var(--bg-card-hover)",
  border: "1px solid var(--border-color)",
  borderRadius: "8px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  width: "100%",
};

const breakdownRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "13px",
};

const breakdownLabel: CSSProperties = {
  color: "var(--text-muted)",
};

const breakdownVal: CSSProperties = {
  fontWeight: 600,
};

const gasWarningBox: CSSProperties = {
  marginTop: 18,
  padding: "10px 12px",
  borderRadius: "8px",
  backgroundColor: "rgba(100, 108, 255, 0.06)",
  border: "1px solid rgba(100, 108, 255, 0.12)",
  fontSize: "12px",
  color: "var(--text-muted)",
  display: "flex",
  gap: 8,
  alignItems: "center",
  lineHeight: 1.4,
};
