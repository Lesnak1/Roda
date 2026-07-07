# Roda Workspace Rules

## CSS Layouts & Background Animations
- When implementing absolute or fixed background elements (such as glowing halos, rotating rings, or frame animations) with negative z-index:
  - Do NOT apply background colors directly to the `body` element.
  - Apply the background color (`var(--bg)`) to the `html` element and set the `body` background to `transparent`. This prevents the body background from painting over the negative z-index elements in the stacking context.

## ERC-8004 Trustless Agents Specification
- When writing risk assessment or reputation logs to the `ReputationRegistry`:
  - Never trigger `giveFeedback` using the wallet that registered the agent (`AI_AGENT_WALLET_ID`).
  - Always use a separate, secondary wallet (`AI_AGENT_VALIDATOR_WALLET_ID`) to submit feedback. The contract reverts if the agent's owner address attempts to record its own reputation logs.
