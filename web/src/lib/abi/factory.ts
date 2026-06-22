export const factoryAbi = [
  {
    type: "function",
    name: "createCircle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contributionAmount", type: "uint256" },
      { name: "memberCount", type: "uint8" },
      { name: "roundDuration", type: "uint256" },
      { name: "recruitingDuration", type: "uint256" },
    ],
    outputs: [{ name: "circleAddr", type: "address" }],
  },
  {
    type: "function",
    name: "circleCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getCircles",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      {
        name: "page",
        type: "tuple[]",
        components: [
          { name: "circle", type: "address" },
          { name: "creator", type: "address" },
          { name: "contributionAmount", type: "uint256" },
          { name: "memberCount", type: "uint8" },
          { name: "roundDuration", type: "uint256" },
          { name: "recruitingDuration", type: "uint256" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "CircleCreated",
    inputs: [
      { name: "circle", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "contributionAmount", type: "uint256", indexed: false },
      { name: "memberCount", type: "uint8", indexed: false },
      { name: "roundDuration", type: "uint256", indexed: false },
      { name: "recruitingDuration", type: "uint256", indexed: false },
    ],
  },
] as const;
