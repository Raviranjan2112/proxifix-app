/**
 * ProxiFix Design System — Option 3: Minimalist Enterprise & Security Focus
 * High-density metrics, STRIDE badge highlights, fast accordion cards, and integrated mini-map coordinates.
 */

export const C = {
  // Brand
  brand: "#075c31",
  brandDark: "#064a28",
  brandDeep: "#08713d",
  brandLight: "#ddf2e4",
  brandSubtle: "#effaf3",

  // Enterprise Dark & Slate
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",

  // Backgrounds
  bgPage: "#f4f8f5",
  bgCard: "#ffffff",
  bgSurface: "#f8fafc",

  // Text
  textHeading: "#0f172a",
  textBody: "#475569",
  textStrong: "#1e293b",
  textLink: "#075c31",
  textMuted: "#64748b",

  // Borders
  border: "#e2e8f0",
  borderDark: "#cbd5e1",
  borderBrand: "#97bea0",
  borderFocus: "#075c31",

  // Status Badges
  statusApprovedBg: "#dcfce7",
  statusApprovedText: "#15803d",
  statusPendingBg: "#fef3c7",
  statusPendingText: "#b45309",
  statusRejectedBg: "#fee2e2",
  statusRejectedText: "#b91c1c",

  // STRIDE Threat Model Vectors
  strideS: { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd", name: "Spoofing" },
  strideT: { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa", name: "Tampering" },
  strideR: { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff", name: "Repudiation" },
  strideI: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0", name: "Info Disclosure" },
  strideD: { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca", name: "Denial of Service" },
  strideE: { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8", name: "Privilege Elevation" },

  // GPS & Map Accents
  gpsBg: "#ecfdf5",
  gpsText: "#047857",
  gpsBorder: "#86efac",
  ipBg: "#f0f9ff",
  ipText: "#0284c7",
  ipBorder: "#bae6fd",

  // Forms
  inputBorder: "#cbd5e1",
  inputFocusBorder: "#075c31",
  inputBg: "#ffffff",

  // Shadows
  shadowSm: "rgba(15, 23, 42, 0.04)",
  shadowMd: "rgba(15, 23, 42, 0.08)",
  shadowLg: "rgba(15, 23, 42, 0.12)",
};

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const SHADOW = {
  card: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHover: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  modal: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 10,
  },
};
