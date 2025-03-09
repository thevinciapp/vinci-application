import * as React from "react";
import { ToastActionElement, ToastProps } from "./toast";

export type ToastVariant = 'default' | 'destructive' | 'success';

export interface ToasterToast extends ToastProps {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: ToastVariant;
}

export type Toast = Omit<ToasterToast, "id">;

export interface UseToastResult {
  toasts: ToasterToast[];
  toast: (props: Toast) => {
    id: string;
    dismiss: () => void;
    update: (props: ToasterToast) => void;
  };
  dismiss: (toastId?: string) => void;
}

export function useToast(): UseToastResult;
export function toast(props: Toast): {
  id: string;
  dismiss: () => void;
  update: (props: ToasterToast) => void;
};
