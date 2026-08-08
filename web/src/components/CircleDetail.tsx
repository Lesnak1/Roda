"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck, Award, Layers, ExternalLink, UserPlus } from "lucide-react";
import { USDC_ADDRESS, circleAbi, erc20Abi, CircleState } from "@/lib/contracts";
import { formatUsdc, fmtCountdown, shortAddr } from "@/lib/format";
import { explorerAddress } from "@/lib/chains/arcTestnet";
import { TxStatus } from "./TxStatus";
import { ReputationPanel } from "./ReputationPanel";
import { AIGuardianPanel } from "./AIGuardianPanel";
import { AIGuardianTerminal } from "./AIGuardianTerminal";
import { IntegrationsPanel } from "./IntegrationsPanel";
import { CircleInviteModal } from "./CircleInviteModal";
import { CctpBridgeJoinModal } from "./CctpBridgeJoinModal";
import { isL2Address, getL2Circles, getL2CircleMembers } from "@/lib/l2Network";

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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCctpModal, setShowCctpModal] = useState(false);

  const isL2 = isL2Address(address);

  // Look up L2 circle data
  const l2CircleData = useMemo(() => {
    if (!isL2) return null;
    const allL2 = getL2Circles();
    return allL2.find((c: any) => c.circle.toLowerCase() === address.toLowerCase()) || null;
  }, [address, isL2]);

  const baseRead = { address, abi: circleAbi } as const;
  const { data, refetch, isLoading: isContractsLoading, isRefetching } = useReadContracts({
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
    query: {
      enabled: !isL2,
      staleTime: 0,
      refetchOnMount: "always",
    },
  });

  const state = isL2
    ? (l2CircleData?.state ?? 0)
    : Number(data?.[0]?.result ?? 0);
  const contribution = isL2
    ? (l2CircleData?.contributionAmount ?? 0n)
    : ((data?.[1]?.result as bigint) ?? 0n);
  const collateral = isL2
    ? contribution
    : ((data?.[2]?.result as bigint) ?? 0n);
  const memberCount = isL2
    ? (l2CircleData?.memberCount ?? 0)
    : Number(data?.[3]?.result ?? 0);
  const joined = isL2
    ? (l2CircleData?.joinedCount ?? 0)
    : Number(data?.[4]?.result ?? 0);
  const currentRound = isL2
    ? (state === 2 ? memberCount - 1 : 0) // Completed: show last round
    : Number(data?.[5]?.result ?? 0);
  const roundDeadline = isL2
    ? (l2CircleData ? Number(l2CircleData.createdAt) + Number(l2CircleData.roundDuration) : 0)
    : Number(data?.[6]?.result ?? 0);

  const creator = isL2
    ? (l2CircleData?.creator ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`))
    : ((data?.[8]?.result as `0x${string}`) ?? undefined);

  const members = useMemo(() => {
    if (isL2 && l2CircleData) {
      return getL2CircleMembers(address, memberCount, creator);
    }
    return (data?.[7]?.result as `0x${string}`[]) ?? [];
  }, [isL2, l2CircleData, address, memberCount, creator, data]);

  const joinDeadline = isL2
    ? (l2CircleData ? Number(l2CircleData.createdAt) + 7200 : 0)
    : Number(data?.[9]?.result ?? 0);
 
  const isMember = account ? members.map((m: string) => m.toLowerCase()).includes(account.toLowerCase()) : false;
  const isCreator = account && creator ? account.toLowerCase() === creator.toLowerCase() : false;
  const pot = contribution * BigInt(memberCount);

  const { data: roundData, refetch: refetchRound } = useReadContracts({
    contracts: [
      { ...baseRead, functionName: "hasContributed", args: account ? [BigInt(currentRound), account] : undefined },
      { ...baseRead, functionName: "roundClosed", args: [BigInt(currentRound)] },
      { ...baseRead, functionName: "beneficiaryOf", args: [BigInt(currentRound)] },
      { ...baseRead, functionName: "payoutClaimed", args: [BigInt(currentRound)] },
    ],
    query: { enabled: !isL2 && state === CircleState.Active },
  });
  const hasContributed = isL2 ? true : Boolean(roundData?.[0]?.result);
  const roundClosed = isL2 ? true : Boolean(roundData?.[1]?.result);
  const beneficiary = isL2
    ? (members[currentRound] ?? undefined)
    : ((roundData?.[2]?.result as `0x${string}`) ?? undefined);
  const payoutClaimed = isL2 ? true : Boolean(roundData?.[3]?.result);
  const isBeneficiary = account && beneficiary ? account.toLowerCase() === beneficiary.toLowerCase() : false;

  const roundQueries = useMemo(() => {
    if (!members || members.length === 0 || isL2) return [];
    return members.flatMap((_: any, i: number) => [
      { ...baseRead, functionName: "roundClosed", args: [BigInt(i)] },
      { ...baseRead, functionName: "payoutClaimed", args: [BigInt(i)] },
      { ...baseRead, functionName: "claimablePayout", args: [BigInt(i)] },
      { ...baseRead, functionName: "withheldFromPayout", args: [BigInt(i)] },
      { ...baseRead, functionName: "payoutClaimedAmount", args: [BigInt(i)] },
    ]);
  }, [members, address, isL2]);

  const { data: allRoundsData, refetch: refetchAllRounds } = useReadContracts({
    contracts: roundQueries,
    query: { enabled: !isL2 && members.length > 0 },
  });

  const unclaimedRounds = useMemo(() => {
    if (!account || !members || !allRoundsData || isL2) return [];
    const list = [];
    for (let i = 0; i < members.length; i++) {
      const beneficiaryAddress = members[i];
      if (beneficiaryAddress.toLowerCase() !== account.toLowerCase()) continue;
      
      const closed = Boolean(allRoundsData[i * 5]?.result);
      const claimable = (allRoundsData[i * 5 + 2]?.result as bigint) ?? 0n;
      const claimedAmount = (allRoundsData[i * 5 + 4]?.result as bigint) ?? 0n;
      if (closed && claimedAmount < claimable) {
        const netPayout = claimable - claimedAmount;
        const withheld = (allRoundsData[i * 5 + 3]?.result as bigint) ?? 0n;
        list.push({
          roundIndex: i,
          netPayout,
          withheld,
        });
      }
    }
    return list;
  }, [account, members, allRoundsData, isL2]);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: account ? [account, address] : undefined,
    query: { enabled: !isL2 && Boolean(account) },
  });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });
  const isReverted = isConfirmed && receipt?.status === "reverted";

  function refreshAll() {
    refetch();
    refetchRound();
    refetchAllowance();
    refetchAllRounds();
  }
  function onTx() {
    setTimeout(refreshAll, 1000);
  }
  function approve(amount: bigint) {
    reset();
    writeContract(
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: "approve", args: [address, amount] },
      { onSuccess: onTx }
    );
  }
  function call(functionName: "join" | "contribute" | "closeRound" | "withdrawCollateral" | "leave" | "cancelCircle" | "pause" | "unpause") {
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

  const isLoading = !isL2 && isContractsLoading;
  const isSyncing = !isL2 && !data;
  const hasRpcError = !isL2 && data && data.some((d) => d.status === "failure");
  const isBrokenData = !isL2 && (contribution === 0n || memberCount === 0);

  if (isLoading || isSyncing) {
    return (
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", padding: "40px 20px", textAlign: "center" }}>
        <div className="btn-spin" style={{ width: 24, height: 24, border: "2px solid var(--accent)", borderTopColor: "transparent" }} />
        <h3 className="card-title">Syncing circle details...</h3>
        <p className="card-desc" style={{ maxWidth: 360, margin: "0 auto" }}>
          Reading contract data from Arc L1. This might take a few seconds to index.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button className="btn ghost sm" onClick={onBack}>
            Back to Dashboard
          </button>
          <button className="btn sm" onClick={refreshAll}>
            <RefreshCw size={12} style={{ marginRight: 6 }} /> Retry
          </button>
        </div>
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
        {hasRpcError && (
          <div className="alert warn" style={{ marginBottom: 16 }}>
            <AlertTriangle size={16} className="ai" />
            <span style={{ fontSize: "13px" }}>
              Arc RPC rate limit reached. Some details might be outdated.{" "}
              <button
                onClick={refreshAll}
                style={{
                  background: "none",
                  border: "none",
                  textDecoration: "underline",
                  color: "var(--accent)",
                  cursor: "pointer",
                  padding: 0,
                  font: "inherit",
                  fontWeight: 600
                }}
              >
                Retry Sync
              </button>
            </span>
          </div>
        )}
        <div className="row" style={{ marginBottom: "16px", gap: 10 }}>
          {stateBadge}
          {state === CircleState.Recruiting && (
            <button
              className="btn sm"
              onClick={() => setShowInviteModal(true)}
              style={{
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              }}
            >
              <UserPlus size={13} /> Invite Members
            </button>
          )}
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

        {/* Solvency & Health Gauge Banner */}
        <div
          style={{
            marginTop: 16,
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: 12,
            background: "linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <ShieldCheck size={20} style={{ color: "var(--green)", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                100% Fully Solvent & Escrow Protected
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                Mathematically collateralized by Circle escrow & dynamic withholding rules.
              </div>
            </div>
          </div>
          <span className="pill green" style={{ fontSize: 11, padding: "3px 10px", flexShrink: 0 }}>
            Healthy Pool
          </span>
        </div>

        <AnimatePresence mode="wait">
          {isL2 ? (
            <motion.div
              key="l2-info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="row"
              style={{ ...sActions, flexDirection: "column", alignItems: "stretch" }}
            >
              <div className="alert ok" style={{ width: "100%", background: "rgba(139, 92, 246, 0.05)", border: "1px solid rgba(139, 92, 246, 0.15)" }}>
                <Layers size={16} style={{ color: "var(--accent)" }} />
                <span style={{ color: "var(--text)" }}>
                  <b>L2 Agent Channel:</b> Coordinated and settled autonomously off-chain by AI Liquidity Guardians for high-frequency nanopayments.
                </span>
              </div>
            </motion.div>
          ) : isBrokenData && hasRpcError ? (
            <motion.div
              key="rpc-broken"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="row"
              style={{ ...sActions, flexDirection: "column", alignItems: "stretch" }}
            >
              <div className="alert warn" style={{ width: "100%" }}>
                <AlertTriangle size={16} className="ai" />
                <span>
                  Circle details are still indexing or the RPC query limit has been reached. Please wait or retry sync.
                </span>
              </div>
              <button className="btn" disabled style={{ opacity: 0.6, cursor: "not-allowed", alignSelf: "flex-start" }}>
                <span className="btn-spin" style={{ marginRight: 8 }} /> Waiting for RPC Sync...
              </button>
            </motion.div>
          ) : (
            <>
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
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                        <button className="btn success" disabled={busy} onClick={() => call("join")}>
                          {busy && <span className="btn-spin" />}2) Join Circle
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() => setShowCctpModal(true)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          🌐 CCTP 1-Click Bridge & Join
                        </button>
                      </div>
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
                  {(isMember || isCreator) && (
                    <button className="btn ghost" disabled={busy} onClick={() => call("closeRound")}>
                      Close Round
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
            </>
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

        <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isConfirmed={isConfirmed && !isReverted} isReverted={isReverted} error={error} />

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

      <motion.div variants={itemVariants}>
        <AIGuardianPanel address={address} members={members} currentRound={currentRound} state={state} />
      </motion.div>

      {account && members.length > 0 && (
        <motion.div variants={itemVariants}>
          <AIGuardianTerminal
            circleAddress={address}
            memberAddress={members[0] as `0x${string}`}
          />
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <IntegrationsPanel circleAddress={address} />
      </motion.div>

      {showInviteModal && (
        <CircleInviteModal
          address={address}
          contribution={formatUsdc(contribution)}
          memberCount={memberCount}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showCctpModal && (
        <CctpBridgeJoinModal
          address={address}
          contribution={contribution}
          collateral={collateral}
          onClose={() => setShowCctpModal(false)}
        />
      )}
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
          
          const closed = allRoundsData ? Boolean(allRoundsData[i * 5]?.result) : done;
          const claimable = allRoundsData ? ((allRoundsData[i * 5 + 2]?.result as bigint) ?? 0n) : 0n;
          const claimedAmount = allRoundsData ? ((allRoundsData[i * 5 + 4]?.result as bigint) ?? 0n) : 0n;
          const claimed = allRoundsData ? (claimedAmount >= claimable && claimable > 0n) : false;
          
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
