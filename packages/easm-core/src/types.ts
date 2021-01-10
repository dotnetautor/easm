export type Immutable<T> = {
  readonly [P in keyof T]: Immutable<T[P]>;
};

export type Mutable<T> = {
  -readonly [P in keyof T]: Mutable<T[P]>;
};