import { EventEmitter } from 'events';

type SubStore = {
  vPath: string[];
  vState: {};
  STATE_CHANGED: symbol;
  get(this: SubStore, vPath: string[]): {}
}

export class Store<TStoreState>  {

  private eventEmitter = new EventEmitter();

  private SubStore: any;

  constructor (initialState: Partial<TStoreState>) {

    const base = this;

    this.SubStore = function (this: SubStore, vPath: string[]) {
      this.vPath = vPath;
      this.vState = base.get(this.vPath);
      this.STATE_CHANGED = Symbol(`$${vPath.join("/")}$$`);

      base.addListener(() => {
        const oldState = this.vState;
        this.vState = base.get(this.vPath);
        if (oldState !== this.vState) {
          base.eventEmitter.emit(this.STATE_CHANGED);
        }
      });
    }

    this.SubStore.prototype.updateByPath = function (this: SubStore, vPath: string[], updateFunction: (parent: [] | {}, key: string) => {}) {
      base.updateByPath(this.vPath.concat(vPath.slice(1)), updateFunction);
    }

    this.SubStore.prototype.get = function (this: SubStore, vPath: string[]) {
      return base.get(this.vPath.concat(vPath.slice(1)));
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

  public get state(): TStoreState {
    throw new Error("Do never directly access the state without get or set.")
  }

  private timeOutStateChanged: number | null = null;
  private onStateChanged = () => {
    this.eventEmitter.emit(Store.STATE_CHANGED);
  }

  private subStores: { [path: string]: SubStore } = {};
  private getSubStore(vPath: string[]) {
    const path = vPath.join('/');
    return (this.subStores[path] ||
      (this.subStores[path] = new this.SubStore(vPath)));
  }

  private updateByPath(vPath: string[], updateFunction: (parent: [] | {}, key: string) => {}) {
    let oldState: {} = this._state;
    let pos = 1;

    const updatePath = (state: any, key: string): any => {
      if (pos >= vPath.length) {
        return updateFunction(state, key);
      } else {
        const newKey = vPath[pos++];
        const oldState = state[key];
        const newState = updatePath(oldState, newKey);
        return oldState !== newState
          ? Object.assign(Array.isArray(state) ? [...state] : { ...state }, { [key]: newState })
          : state
      }
    }

    this._state = updatePath(oldState, vPath[pos++]);

    if (this._state !== oldState && !this.timeOutStateChanged) {
      this.timeOutStateChanged = window.setTimeout(() => {
        this.timeOutStateChanged = null;
        this.onStateChanged();
      });
    }
  }

  private get(vPath: string[]) {
    let result: any = vPath[0] === "state" ? this._state : undefined;
    vPath && vPath.slice(1).forEach(prop => {
      result = result && result[prop];
    });
    return result;
  }

  private set(vPath: string[], value: any) {
    vPath[0] === "state" && this.updateByPath(vPath, (parent: any = {}, key) => {
      return (
        parent[key] !== value
        ? Object.assign(Array.isArray(parent) ? [...parent] : { ...parent }, { [key]: value })
          : parent
      );
    });
    return value;
  }

  private merge(vPath: string[], value: any): any {
    let result: any;
    vPath[0] === "state" && this.updateByPath(vPath, (parent: any = {}, key) => {
      result = { ...(parent[key] || {}), ...value };
      return Object.assign(Array.isArray(parent) ? [...parent] : { ...parent }, { [key]: result });
    });
    return result;
  }

  private pop(vPath: string[]) {
    let result: any;
    vPath[0] === "state" && this.updateByPath(vPath, (parent: any = {}, key) => {
      const orig = parent[key] as any[];
      if (orig !== undefined) {
        result = orig.pop();
        return Object.assign(Array.isArray(parent) ? [...parent] : { ...parent }, { [key]: [...orig] })
      }
      return parent;
    });
    return result;
  }

  private unshift(vPath: string[], value: any) {
    let result: any;
    vPath[0] === "state" && this.updateByPath(vPath, (parent: any = {}, key) => {
      const orig = parent[key] as any[];
      if (orig !== undefined) {
        result = orig.unshift(value);
        return Object.assign(Array.isArray(parent) ? [...parent] : { ...parent }, { [key]: [...orig] })
      }
      return parent;
    });
    return result;
  }

  private shift(vPath: string[]) {
    let result: any;
    vPath[0] === "state" && this.updateByPath(vPath, (parent: any = {}, key) => {
      const orig = parent[key] as any[];
      if (orig !== undefined) {
        result = orig.shift();
        return Object.assign(Array.isArray(parent) ? [...parent] : { ...parent }, { [key]: [...orig] })
      }
      return parent;
    });
    return result;
  }

  private push(vPath: string[], value: any) {
    let result: any;
    vPath[0] === "state" && this.updateByPath(vPath, (parent: any = {}, key) => {
      const orig = parent[key] as any[];
      if (orig !== undefined) {
        result = orig.push(value);
        return Object.assign(Array.isArray(parent) ? [...parent] : { ...parent }, { [key]: [...orig] })
      }
      return parent;
    });
    return result;
  }

  // map / reduce / filter ???
  private _state: TStoreState;

}

