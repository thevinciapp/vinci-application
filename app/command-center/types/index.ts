export type ProviderComponentProps = {
  searchQuery: string;
  onSelect?: (item: any) => void;
  onAction?: (action: string, data: any) => void;
};

export type DialogComponentProps = {
  data: any;
  onClose: () => void;
  onConfirm?: (data: any) => void;
};

export interface ProviderRegistry {
  [key: string]: React.FC<ProviderComponentProps>;
}

export interface DialogRegistry {
  [key: string]: React.FC<DialogComponentProps>;
}
