import { EventEmitter } from "events";
import { Immutable } from "./types";

export const pathSymbol = Symbol("Object path");

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
  addListener(listener: (state: Immutable<TSubStoreState>) => void): (runPendingListener?: boolean) => void;
  addListener<T>(proxy: ObjectProxyArg<TSubStoreState, T>, listener: (state: Immutable<T>) => void): (runPendingListener?: boolean) => void;
};

export function createPathProxy<TRoot, T>(path: Key[] = []): ObjectPathProxy<TRoot, T> {
  const proxy = new Proxy<ObjectPathProxy<TRoot, T>>({ [pathSymbol]: path } as ObjectPathProxy<TRoot, T>, {
    get(target: ObjectPathProxy<TRoot, T>, key: Key) {
      return key === pathSymbol
        ? target[pathSymbol]
        : createPathProxy([...path, key]);
    },
  });

  return proxy;
}

export function getPath<TRoot, T>(proxy: ObjectProxyArg<TRoot, T>): Key[] {
  if (typeof proxy === "object" && Array.isArray(proxy)) {
    return proxy;
  }

  if (typeof proxy === "function") {
    return (proxy as any)(createPathProxy<TRoot, TRoot>())[pathSymbol];
  }

  return proxy[pathSymbol];
}

export class Store<TRootStoreState> {
  private static STATE_CHANGED = Symbol("$$store_state_changed$$");

  private eventEmitter = new EventEmitter();

  private subStores: { [path: string]: SubStore<any> } = {};

  private _state: TRootStoreState;

  private timeoutStateChangedHandle: number | null = null;

  get state(): Immutable<TRootStoreState> {
    return this._state;
  }

  constructor(initialState: Partial<TRootStoreState> | SubStore<any>) {
    this._state = initialState as TRootStoreState;
  }

  private onStateChanged = () => {
    this.eventEmitter.emit(Store.STATE_CHANGED);
  };

  getSubStore<TSubStoreState>(subStoreStateProxy: ObjectProxyArg<TRootStoreState, TSubStoreState>): SubStore<TSubStoreState> {
    const base = this;
    const vPath = getPath(subStoreStateProxy);
    const path = vPath.join("/");

    if (!this.subStores[path]) {
      const subStore = Object.create(null, {
        vPath: {
          configurable: false,
          enumerable: true,
          writable: false,
          value: vPath,
        },
        STATE_CHANGED: {
          configurable: false,
          enumerable: true,
          writable: false,
          value: Symbol(`$$${vPath.join("/")}$$`),
        },
        get: {
          configurable: false,
          enumerable: true,
          writable: false,
          value: function get(this: SubStore<TSubStoreState>, proxy?: ObjectProxyArg<TSubStoreState, TSubStoreState>) {
            return proxy ? base.readByPath([...this.vPath, ...getPath(proxy)]) : base.readByPath(this.vPath);
          },
        },
        update: {
          configurable: false,
          enumerable: true,
          writable: false,
          value: function update<TObjectState>(this: SubStore<TSubStoreState>, proxy: ObjectProxyArg<TSubStoreState, TObjectState>, value: TObjectState) {
            base.updateByPath([...this.vPath, ...getPath(proxy)], value);
          },
        },
        addListener: {
          configurable: false,
          enumerable: true,
          writable: false,
          // eslint-disable-next-line max-len
          value: function addListener<T>(this: SubStore<TSubStoreState>, first: ObjectProxyArg<TSubStoreState, T> | ((state: Immutable<T>) => void), second?: (state: Immutable<T>) => void) {
            const proxy = second != null ? first as ObjectProxyArg<TSubStoreState, T> : undefined;
            const listener = proxy != null ? second! : first as (state: Immutable<T>) => void;

            return (proxy != null)
              ? base.addListener([...this.vPath, ...getPath(proxy)], listener)
              : base.addListener(this.vPath, listener);
          },
        },
      });

      this.subStores[path] = subStore;
    }

    return this.subStores[path];
  }

  private readByPath(vPath: Key[]) {
    let result: any = this._state;

    if (vPath) {
      vPath.forEach((prop: Key) => {
        result = result && result[prop];
      });
    }

    return result;
  }

  private updateByPath<TObjectState>(vPath: Key[], value: TObjectState): void {
    const oldState: TRootStoreState = this._state;
    let pos = 0;

    function createNewStateObject(state: any, key: Key, newValue: any): any {
      if (state && state[key] === newValue) {
        return state;
      }

      const newStateObject = Array.isArray(state)
        ? state.slice(0)
        : Object.assign(Object.create((state && Object.getPrototypeOf(state)) || null), state);

      newStateObject[key] = newValue;
      return newStateObject;
    }

    function updatePath(state: any, key: Key): any {
      if (pos >= vPath.length) {
        const newValue = value;
        return createNewStateObject(state, key, newValue);
      }
      // eslint-disable-next-line no-plusplus
      const newKey = vPath[pos++];
      const oldUpdateState = state[key];
      return createNewStateObject(state, key, updatePath(oldUpdateState, newKey));
    }

    // eslint-disable-next-line no-plusplus
    this._state = updatePath(oldState, vPath[pos++]);

    // handle state change
    if (this._state !== oldState) {
      if (!this.timeoutStateChangedHandle) {
        this.timeoutStateChangedHandle = window.setTimeout(() => {
          this.timeoutStateChangedHandle = null;
          this.onStateChanged();
        });
      }
    }
  }

  addListener(listener: (state: Immutable<TRootStoreState>) => void): (runPendingListener?: boolean) => void;
  addListener<T>(proxy: ObjectProxyArg<TRootStoreState, T>, listener: (state: Immutable<T>) => void): (runPendingListener?: boolean) => void;
  addListener<T>(first: ObjectProxyArg<TRootStoreState, T> | ((state: Immutable<T>) => void), second?: (state: Immutable<T>) => void) {
    const proxy = second != null ? first as ObjectProxyArg<TRootStoreState, T> : undefined;
    const listener = proxy != null ? second! : first as (state: Immutable<T>) => void;

    let lastState: any = proxy != null ? this.get(proxy) : this.get();

    const changeHandler = () => {
      const newState = proxy != null ? this.get(proxy) : this.get();
      if (newState !== lastState && typeof listener === "function") {
        listener(newState as any);
        lastState = newState;
      }
    };

    this.eventEmitter.addListener(Store.STATE_CHANGED, changeHandler);

    return (runPendingListener: boolean = false) => {
      if (runPendingListener && this.timeoutStateChangedHandle) {
        window.clearTimeout(this.timeoutStateChangedHandle);
        this.timeoutStateChangedHandle = null;
        this.onStateChanged();
      }
      this.eventEmitter.removeListener(Store.STATE_CHANGED, changeHandler);
    };
  }

  get(): Immutable<TRootStoreState>;
  get<TObjectState>(proxy: ObjectProxyArg<TRootStoreState, TObjectState>): Immutable<TObjectState>;
  get<TObjectState>(proxy?: ObjectProxyArg<TRootStoreState, TObjectState>) {
    if (proxy === undefined) {
      return this._state;
    }
    return this.readByPath(getPath(proxy));
  }

  update<TObjectState>(proxy: ObjectProxyArg<TRootStoreState, TObjectState>, value: TObjectState): void {
    this.updateByPath(getPath(proxy), value);
  }
}
