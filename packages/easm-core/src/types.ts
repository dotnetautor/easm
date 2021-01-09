export type Immutable<T> = {
  readonly [P in keyof T]: Immutable<T[P]>;
} & T;

export type Mutable<T> = {
  -readonly [P in keyof T]: Mutable<T[P]>;
};
