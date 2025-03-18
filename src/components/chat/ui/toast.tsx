

interface ToastProps {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

export function toast({ title, description, variant = 'default' }: ToastProps) {
  // For now, we'll just use console.log, but you can integrate a proper toast library like react-hot-toast
  console.log(`[${variant.toUpperCase()}] ${title}: ${description}`);
}
