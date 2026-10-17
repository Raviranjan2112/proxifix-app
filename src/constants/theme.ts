/**
 * ProxiFix Design System — mirrors index.css exactly
 * All colors, radii, shadows match the website's CSS tokens
 */

export const C = {
  // Brand
  brand: "#075c31",
  brandDark: "#064a28",
  brandDeep: "#08713d",

  // Backgrounds (website gradient equivalents)
  bgPage: "#effaf3",       // body bg start
  bgCard: "#ffffff",
  bgCardGradient1: "rgba(247,253,248,0.98)",  // card odd
  bgCardGradient2: "rgba(255,251,231,0.94)",  // card odd
  bgCardEven1: "rgba(250,253,244,0.98)",       // card even
  bgCardEven2: "rgba(239,250,246,0.96)",       // card even

  // Text
  textHeading: "#102a1c",
  textBody: "#61726a",
  textStrong: "#234534",
  textLink: "#075c31",

  // Borders
  border: "#e1e8e3",
  borderHover: "#78ad87",
  borderBrand: "#97bea0",

  // Status badges (matches .status-approved / .status-pending / .status-rejected)
  badgeApprovedBg: "#ddf2e4",
  badgeApprovedText: "#076332",
  badgePendingBg: "#fff3cf",
  badgePendingText: "#8b5c00",
  badgeRejectedBg: "#fee4e2",
  badgeRejectedText: "#a61b1b",

  // Service icon bg
  serviceIconBg: "#e4f4e8",
  serviceIconBgHover: "#cfeeda",

  // Avatar
  avatarBg: "#ddf2e4",
  avatarText: "#075c31",

  // Available badge
  availableBg: "#ddf2e4",
  availableText: "#076332",

  // Form
  inputBorder: "#bdccc3",
  inputFocusBorder: "#08713d",
  inputBg: "#ffffff",

  // Notification
  notifUnreadBg: "#eefaf0",
  notifCount: "#075c31",

  // Shadows
  shadowCard: "rgba(17,66,38,0.05)",
  shadowCardHover: "rgba(17,66,38,0.15)",
  shadowHero: "rgba(17,66,38,0.10)",

  // Error / success
  errorBg: "#fee4e2",
  errorText: "#b42318",
  successBg: "#ddf2e4",
  successText: "#076332",

  // Muted
  muted: "#61726a",
  mutedLight: "#94A3B8",

  // Eyebrow (uppercase label)
  eyebrow: "#08713d",
};

export const RADIUS = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  xxl: 20,
  pill: 999,
};

export const SHADOW = {
  card: {
    shadowColor: "#11423620",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4,
  },
  cardHover: {
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.15,
    shadowRadius: 38,
    elevation: 8,
  },
};
