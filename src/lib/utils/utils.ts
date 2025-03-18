import { redirect } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string,
) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

/**
 * Utility function for merging class names with Tailwind CSS
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 * 
 * @example
 * ```tsx
 * // Basic usage
 * cn('px-2 py-1', 'bg-blue-500')
 * 
 * // With conditions
 * cn('base-class', {
 *   'active-class': isActive,
 *   'disabled-class': isDisabled
 * })
 * 
 * // With Tailwind conflicts resolution
 * cn('px-2 py-1 p-4') // -> 'p-4'
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely check if window.electron is available
 * 
 * @returns {boolean} True if window.electron is available, false otherwise
 */
export const isElectronAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.electron;
};

/**
 * Throws an error if window.electron is not available
 * 
 * @throws {Error} If window.electron is not available
 */
export const requireElectron = (): void => {
  if (!isElectronAvailable()) {
    throw new Error('Electron API not available');
  }
};

// Utility types
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type Nullable<T> = T | null;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};