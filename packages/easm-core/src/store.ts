import { EventEmitter } from "events";
import { Immutable } from "./types";

const pathSymbol = Symbol("Object path");

type ObjectPathProxy<TRoot, T> = {
  [P in keyof T]: ObjectPathProxy<TRoot, T[P]>;
};

type ObjectProxyArg<R, T> = ObjectPathProxy<R, T> | ((p: ObjectPathProxy<R, R>) => ObjectPathProxy<R, T>);

export const createProxy = <T>(path: (string | symbol)[] = []): ObjectPathProxy<T, T> => {
  const proxy = new Proxy<ObjectPathProxy<T, T>>({ [pathSymbol]: path } as any, {
    get(target: ObjectPathProxy<T, T>, key: string | symbol) {
      return key === pathSymbol
        ? (target as any)[pathSymbol]
        : createProxy([...(path || []), key]);
    },
  });
  return proxy;
};

const getPath = <R, T>(proxy: ObjectProxyArg<R, T>) => {
  if (typeof proxy === "function") {
    proxy = proxy(createProxy<R>());
  }
  return (proxy as any)[pathSymbol] as (string | symbol)[];
}

type SubStore = {
  vPath: (string | symbol)[];
  vState: {};
  STATE_CHANGED: symbol;
  get(this: SubStore, vPath: string[]): {}
}

export class Store<TStoreState>  {

  private eventEmitter = new EventEmitter();

  private SubStore: any;

  constructor(initialState: Partial<TStoreState>) {

    const base = this;

    this.SubStore = function (this: SubStore, vPath: (string | symbol)[]) {
      this.vPath = vPath;
      this.vState = base.readByPath(this.vPath);
      this.STATE_CHANGED = Symbol(`$${this.vPath.join("/")}$$`);

      base.addListener(() => {
        const oldState = this.vState;
        this.vState = base.readByPath(this.vPath);
        if (oldState !== this.vState) {
          base.eventEmitter.emit(this.STATE_CHANGED);
        }
      });
    }

    this.SubStore.prototype.updateByPath = function (this: SubStore, vPath: (string | symbol)[], updateFunction: (parent: [] | {}, key: string | symbol) => {}) {
      base.updateByPath(this.vPath.concat(vPath), updateFunction);
    }

    this.SubStore.prototype.get = function <R, T>(this: SubStore, proxy: ObjectProxyArg<R, T>) {
      const vPath = getPath(proxy);
      return base.readByPath(this.vPath.concat(vPath));
    }

    this.SubStore.prototype.addListener = function (this: SubStore, listener: (...args: any[]) => void) {
      base.eventEmitter.addListener(this.STATE_CHANGED, listener);
    }

    this.SubStore.prototype.removeListener = function (this: SubStore, listener: (...args: any[]) => void) {
      base.eventEmitter.removeListener(this.STATE_CHANGED, listener);
    }

    Object.setPrototypeOf(this.SubStore.prototype, this);

    this._state = initialState as TStoreState;
  }

  public addListener(listener: (...args: any[]) => void) {
    this.eventEmitter.addListener(Store.STATE_CHANGED, listener);
  }

  public removeListener(listener: (...args: any[]) => void) {
    this.eventEmitter.removeListener(Store.STATE_CHANGED, listener);
  }

  private static STATE_CHANGED = Symbol("$$store_state_changed$$");

  public get state(): Immutable<TStoreState> {
    return this._state;
  }

  private timeOutStateChanged: number | null = null;
  private onStateChanged = () => {
    this.eventEmitter.emit(Store.STATE_CHANGED);
  }

  private subStores: { [path: string]: SubStore } = {};

  public getSubStore<T>(proxy: ObjectProxyArg<TStoreState, T>): Store<T> {
    const vPath = getPath(proxy);
    const path = vPath.join('/');
    return (this.subStores[path] || (this.subStores[path] = new this.SubStore(vPath))) as any;
  }

  private updateByPath(vPath: (string | symbol)[], updateFunction: (parent: [] | {}, key: string | symbol) => {}) {
    let oldState: {} = this._state;
    let pos = 0;

    const createNewStateObject = (state: any, key: string | symbol, newValue: any) => {
      if (state && state[key] === newValue) {
        return state;
      }

      const newStateObject = Array.isArray(state)
        ? state.slice(0)
        : Object.assign(Object.create(state && state.__proto__ || null), state);

      newStateObject[key] = newValue;
      return newStateObject;
    }

    const updatePath = (state: any, key: string | symbol): any => {
      if (pos >= vPath.length) {

        const newValue = updateFunction(state, key);
        return createNewStateObject(state, key, newValue);

      } else {
        const newKey = vPath[pos++];
        const oldState = state[key];
        return createNewStateObject(state, key, updatePath(oldState, newKey))
      }
    }

    this._state = updatePath(oldState, vPath[pos++]);

    // handle state change
    if (this._state !== oldState) {
      if (!this.timeOutStateChanged) {
        this.timeOutStateChanged = window.setTimeout(() => {
          this.timeOutStateChanged = null;
          this.onStateChanged();
        });
      }
    }
  }

  private readByPath(vPath: (string | symbol)[]) {
    let result: any = this._state;
    vPath && vPath.forEach(prop => {
      result = result && result[prop];
    });
    return result;
  }

  public get<T>(proxy: ObjectProxyArg<TStoreState, T>): T {
    return this.readByPath(getPath(proxy));
  }

  public set<T, V extends T>(proxy: ObjectProxyArg<TStoreState, T>, value: V): V {
    this.updateByPath(getPath(proxy), (parent: any = {}, key) => value);
    return value;
  }

  public merge<T>(proxy: ObjectProxyArg<TStoreState, T>, value: T): T {
    let result: any;
    this.updateByPath(getPath(proxy), (parent: any = {}, key) => {
      result = { ...(parent[key] || {}), ...value };
      return result;
    });
    return result;
  }

  public pop<R, T extends Array<R>>(proxy: ObjectProxyArg<TStoreState, T>): R {
    let result: R;
    this.updateByPath(getPath(proxy), (parent: any = {}, key) => {
      const orig = parent[key] as any[];
      if (orig !== undefined) {
        const arr = [...orig];
        result = arr.pop();
        return arr;
      }
      return orig;
    });
    // @ts-ignore
    return result;
  }

  public unshift<R, T extends Array<R>>(proxy: ObjectProxyArg<TStoreState, T>, value: R): number {
    let result: number;
    this.updateByPath(getPath(proxy), (parent: any = {}, key) => {
      const orig = parent[key] as any[];
      if (orig !== undefined) {
        const arr = [...orig];
        result = arr.unshift(value);
        return arr;
      }
      return orig;
    });
    // @ts-ignore
    return result;
  }

  public shift<R, T extends Array<R>>(proxy: ObjectProxyArg<TStoreState, T>): R {
    let result: R;
    this.updateByPath(getPath(proxy), (parent: any = {}, key) => {
      const orig = parent[key] as any[];
      if (orig !== undefined) {
        const arr = [...orig];
        result = arr.shift();
        return arr;
      }
      return orig;
    });
    // @ts-ignore
    return result;
  }

  public push<R, T extends Array<R>>(proxy: ObjectProxyArg<TStoreState, T>, value: R): number {
    let result: number = 0;
    this.updateByPath(getPath(proxy), (parent: any = {}, key) => {
      const orig = parent[key] as R[];
      if (orig !== undefined) {
        result = 1;
        return [...orig, value];
      }
      return orig;
    });
    return result;
  }

  private _state: TStoreState;

}
