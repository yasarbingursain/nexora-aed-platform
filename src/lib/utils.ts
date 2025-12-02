import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for proper class merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format numbers with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

/**
 * Calculate risk score color based on value
 */
export function getRiskScoreColor(score: number): string {
  if (score >= 80) return 'text-red-500';
  if (score >= 60) return 'text-orange-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * Get threat level styling
 */
export function getThreatLevelStyle(level: 'critical' | 'high' | 'medium' | 'low' | 'info'): string {
  const styles = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    low: 'bg-green-500/10 text-green-400 border-green-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return styles[level];
}

/**
 * Format time ago
 */
export function timeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get entity type icon and color
 */
export function getEntityTypeStyle(type: string): { icon: string; color: string } {
  const styles: Record<string, { icon: string; color: string }> = {
    'api-key': { icon: 'Key', color: 'text-blue-500' },
    'service-account': { icon: 'User', color: 'text-green-500' },
    'ai-agent': { icon: 'Bot', color: 'text-purple-500' },
    'oauth-token': { icon: 'Shield', color: 'text-orange-500' },
    'certificate': { icon: 'Certificate', color: 'text-yellow-500' },
    'ssh-key': { icon: 'Terminal', color: 'text-red-500' },
  };
  return styles[type] || { icon: 'HelpCircle', color: 'text-gray-500' };
}

/**
 * Format compliance score
 */
export function formatComplianceScore(score: number): string {
  return `${Math.round(score)}%`;
}

/**
 * Get compliance framework color
 */
export function getComplianceFrameworkColor(framework: string): string {
  const colors: Record<string, string> = {
    'SOC2': 'text-blue-500',
    'ISO27001': 'text-green-500',
    'HIPAA': 'text-purple-500',
    'PCI-DSS': 'text-orange-500',
    'NIST': 'text-red-500',
    'GDPR': 'text-yellow-500',
  };
  return colors[framework] || 'text-gray-500';
}
