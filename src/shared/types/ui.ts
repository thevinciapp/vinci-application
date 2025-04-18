export interface DialogComponentProps<T = object> {
  /**
   * Optional data passed to the dialog, type varies by dialog.
   * Can be used to pass initial values or context.
   */
  data?: T;
  /**
   * Function to call when the dialog requests to be closed
   * (e.g., clicking Cancel, X button, or overlay).
   */
  onClose: () => void;
  /**
   * Optional function to call when the primary action is confirmed.
   * Can be used to pass back data from the dialog.
   */
  onConfirm?: (result?: T) => void;
}