import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency formatting ───────────────────────────────────────────────────

export function formatCurrency(
  value: number,
  currency = "USD",
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

export function formatCurrencyJa(value: number, currency = "JPY"): string {
  if (currency === "JPY") {
    return `¥${new Intl.NumberFormat("ja-JP").format(value)}`;
  }
  return formatCurrency(value, currency);
}

export function formatMillions(value: number, currency = "USD"): string {
  const millions = value / 1_000_000;
  const symbol = getCurrencySymbol(currency);
  if (millions >= 1000) {
    return `${symbol}${(millions / 1000).toFixed(1)}B`;
  }
  return `${symbol}${millions.toFixed(1)}M`;
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    AUD: "A$",
    SGD: "S$",
    HKD: "HK$",
    CAD: "C$",
  };
  return symbols[currency] ?? currency;
}

// ─── Number formatting ─────────────────────────────────────────────────────

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatBps(value: number): string {
  return `${(value * 10000).toFixed(0)} bps`;
}

// ─── Date formatting ───────────────────────────────────────────────────────

export function formatDate(
  date: Date | string | null | undefined,
  format: "short" | "medium" | "long" | "iso" = "medium"
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  switch (format) {
    case "short":
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    case "medium":
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    case "long":
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    case "iso":
      return d.toISOString().split("T")[0];
    default:
      return d.toLocaleDateString("en-US");
  }
}

export function formatDateJa(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatRelative(date: Date | string | null | undefined): string {
  const days = daysUntil(date);
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0 && days <= 7) return `In ${days} days`;
  if (days > 7 && days <= 30) return `In ${Math.ceil(days / 7)} weeks`;
  if (days > 30 && days <= 365) return `In ${Math.ceil(days / 30)} months`;
  if (days > 365) return `In ${Math.ceil(days / 365)} years`;
  if (days < 0 && days >= -7) return `${Math.abs(days)} days ago`;
  if (days < -7 && days >= -30) return `${Math.ceil(Math.abs(days) / 7)} weeks ago`;
  return `${Math.ceil(Math.abs(days) / 30)} months ago`;
}

// ─── Score utilities ───────────────────────────────────────────────────────

export function scoreClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return "score-ring-low";
  if (score >= 75) return "score-ring-high";
  if (score >= 50) return "score-ring-medium";
  return "score-ring-low";
}

export function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "var(--color-slate-400)";
  if (score >= 75) return "var(--color-status-green)";
  if (score >= 50) return "var(--color-status-amber)";
  return "var(--color-status-red)";
}

// ─── Covenant & status utilities ───────────────────────────────────────────

export function covenantBadgeClass(status: string): string {
  switch (status) {
    case "COMPLIANT": return "badge-green";
    case "WATCH":     return "badge-amber";
    case "BREACH":    return "badge-red";
    case "WAIVED":    return "badge-gray";
    default:          return "badge-gray";
  }
}

export function covenantLabel(status: string): string {
  switch (status) {
    case "COMPLIANT": return "Compliant";
    case "WATCH":     return "Watch";
    case "BREACH":    return "Breach";
    case "WAIVED":    return "Waived";
    default:          return "Unknown";
  }
}

export function alertSeverityClass(severity: string): string {
  switch (severity) {
    case "CRITICAL": return "alert-critical";
    case "HIGH":     return "alert-high";
    case "MEDIUM":   return "alert-medium";
    default:         return "alert-medium";
  }
}

export function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "CRITICAL": return "badge-red";
    case "HIGH":     return "badge-amber";
    case "MEDIUM":   return "badge-blue";
    case "LOW":      return "badge-gray";
    default:         return "badge-gray";
  }
}

export function taskStatusBadgeClass(status: string): string {
  switch (status) {
    case "COMPLETE":    return "badge-green";
    case "IN_PROGRESS": return "badge-blue";
    case "BLOCKED":     return "badge-red";
    case "OPEN":        return "badge-gray";
    case "CANCELLED":   return "badge-gray";
    default:            return "badge-gray";
  }
}

// ─── Asset type labels ─────────────────────────────────────────────────────

export function assetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    OFFICE:         "Office",
    RESIDENTIAL:    "Residential",
    RETAIL:         "Retail",
    LOGISTICS:      "Logistics",
    HOTEL:          "Hotel",
    MIXED_USE:      "Mixed Use",
    INDUSTRIAL:     "Industrial",
    INFRASTRUCTURE: "Infrastructure",
    LAND:           "Land",
    OTHER:          "Other",
  };
  return labels[type] ?? type;
}

export function assetStatusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE":             return "badge-green";
    case "REFINANCING":        return "badge-amber";
    case "UNDER_DD":           return "badge-blue";
    case "UNDER_CONSTRUCTION": return "badge-navy";
    case "DISPOSAL":           return "badge-amber";
    case "DISPOSED":           return "badge-gray";
    default:                   return "badge-gray";
  }
}

export function assetStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE:             "Active",
    REFINANCING:        "Refinancing",
    UNDER_DD:           "Under DD",
    UNDER_CONSTRUCTION: "Construction",
    DISPOSAL:           "For Disposal",
    DISPOSED:           "Disposed",
  };
  return labels[status] ?? status;
}

// ─── Document type labels ──────────────────────────────────────────────────

export function docTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    LOAN_AGREEMENT:      "Loan Agreement",
    LEASE_AGREEMENT:     "Lease Agreement",
    VALUATION_REPORT:    "Valuation Report",
    PM_REPORT:           "PM Report",
    INSURANCE_POLICY:    "Insurance Policy",
    TAX_DOCUMENT:        "Tax Document",
    CORPORATE_DOCUMENT:  "Corporate Document",
    BOARD_RESOLUTION:    "Board Resolution",
    CAPEX_QUOTE:         "CAPEX Quote",
    INVOICE:             "Invoice",
    FINANCIAL_STATEMENT: "Financial Statement",
    LENDER_STATEMENT:    "Lender Statement",
    RENT_ROLL:           "Rent Roll",
    LEGAL_OPINION:       "Legal Opinion",
    ENVIRONMENTAL_REPORT:"Environmental Report",
    OTHER:               "Other",
  };
  return labels[type] ?? type;
}

// ─── Country utilities ─────────────────────────────────────────────────────

export function countryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    US: "🇺🇸",
    GB: "🇬🇧",
    AU: "🇦🇺",
    DE: "🇩🇪",
    FR: "🇫🇷",
    SG: "🇸🇬",
    HK: "🇭🇰",
    JP: "🇯🇵",
    NZ: "🇳🇿",
    CA: "🇨🇦",
  };
  return flags[countryCode] ?? "🌐";
}

export function countryName(countryCode: string): string {
  const names: Record<string, string> = {
    US: "United States",
    GB: "United Kingdom",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
    SG: "Singapore",
    HK: "Hong Kong",
    JP: "Japan",
    NZ: "New Zealand",
    CA: "Canada",
  };
  return names[countryCode] ?? countryCode;
}
