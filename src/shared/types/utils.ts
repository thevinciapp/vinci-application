export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type Nullable<T> = T | null;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};