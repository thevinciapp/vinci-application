import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function encodedRedirect(
  type: "error" | "success",
  pathname: string,
  message?: string,
) {
  const searchParams = new URLSearchParams()
  if (message) {
    searchParams.set(type, message)
  }
  const search = searchParams.toString()
  return (
    pathname +
    (search
      ? `${pathname.includes("?") ? "&" : "?"}${search}`
      : "")
  )
}
