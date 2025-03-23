import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";


export function buildRedirectUrl(
  type: "error" | "success",
  path: string,
  message: string,
): string {
  return `${path}?${type}=${encodeURIComponent(message)}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type Nullable<T> = T | null;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};