export const pathSymbol = Symbol("Object path");

export type Immutable<T> = T extends Function ? T : {
  readonly [P in keyof T]: Immutable<T[P]>;
};

export type Mutable<T> = T extends Function ? T : {
  -readonly [P in keyof T]: Mutable<T[P]>;
};

export type Key = string | number | symbol;

export type ObjectPathProxy<TRoot, T> = {
  [P in keyof T]-?: ObjectPathProxy<TRoot, T[P]>;
} & {
  [pathSymbol]: Key[];
};

export type PathSelector<TRoot, T> = (p: TRoot) => T;
export type ObjectProxyArg<TRoot, T> = Key[] | ObjectPathProxy<TRoot, T> | PathSelector<TRoot, T>;

export type SubStore<TSubStoreState extends {}> = {
  vPath: Key[];
  STATE_CHANGED: symbol;

  get(this: SubStore<TSubStoreState>): Immutable<TSubStoreState>;
  get<TObjectState>(this: SubStore<TSubStoreState>, proxy: ObjectProxyArg<TSubStoreState, TObjectState>): Immutable<TObjectState>;
  update<TObjectState>(this: SubStore<TSubStoreState>, proxy: ObjectProxyArg<TSubStoreState, TObjectState>, value: TObjectState): void;
  update<TObjectState>(this: SubStore<TSubStoreState>, proxy: ObjectProxyArg<TSubStoreState, TObjectState>, value: Immutable<TObjectState>): void;
  addListener(listener: (state: Immutable<TSubStoreState>) => void): (runPendingListener?: boolean) => void;
  addListener<T>(proxy: ObjectProxyArg<TSubStoreState, T>, listener: (state: Immutable<T>) => void): (runPendingListener?: boolean) => void;
};
