/** Tailwind v3 preset bridge */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        "display": ["var(--font-display)"],
        "body": ["var(--font-body)"],
        "mono": ["var(--font-mono)"],
        "systemDisplay": ["var(--font-systemDisplay)"],
        "systemBody": ["var(--font-systemBody)"],
        "systemMono": ["var(--font-systemMono)"],
        "handwritingNormal": ["var(--font-handwritingNormal)"],
        "handwritingAdult": ["var(--font-handwritingAdult)"],
        "handwritingChild": ["var(--font-handwritingChild)"]
      },
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        border: "var(--border)",
      },
      boxShadow: {

      },
    },
  },
};
