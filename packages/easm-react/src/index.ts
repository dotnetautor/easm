/* eslint-disable func-names, max-len */
import * as React from "react";

import { Immutable, Store } from "@easm/core";
import { getPath, Key, PathSelector, pathSymbol } from "@easm/core/store";

type Primitive = boolean | number | bigint | string | symbol;

const createUpdateProxy = <T extends {}>(target: T, handler: (path: Key[], value: any) => void, path: Key[] = []): T => {
  const proxy = new Proxy<T>(target, {
    set(_target, key, value) {
      // console.log(path.join(".") + `.${String(key)} => ${value}`);
      handler([...path, key], value);
      return true;
    },
    // eslint-disable-next-line @typescript-eslint/no-shadow
    get(target: T, key: Key) {
      // eslint-disable-next-line no-nested-ternary
      return key === pathSymbol
        ? path
        : typeof (target as any)[key] === "object"
          ? createUpdateProxy((target as any)[key], handler, [...(path || []), key])
          : (target as any)[key];
    },
  });

  return proxy;
};

export type UseStoreHook<TStore> = {
  <TSlice>(pathSelector: PathSelector<TStore, TSlice>): [
    Immutable<TSlice>,
    (update: TSlice extends null
      ? null
      : TSlice extends undefined
        ? undefined
        : TSlice extends Primitive
          ? Primitive
          : ((value: TSlice) => void) | TSlice) => void,
  ];
};

export function createHook<TRootStoreState>(store: Store<TRootStoreState>): UseStoreHook<TRootStoreState>;
export function createHook<TRootStoreState, TSubStoreState>(store: Store<TRootStoreState>, subStoreSelector: PathSelector<TRootStoreState, TSubStoreState>): UseStoreHook<TSubStoreState>;
export function createHook<TRootStoreState, TSubStoreState>(store: Store<TRootStoreState>, subStoreSelector?: PathSelector<TRootStoreState, TSubStoreState>): UseStoreHook<TRootStoreState | TSubStoreState> {
  const currentStore: {
    get(): any;
    get(path: Key[]): any;
    update(path: Key[], value: any): void;
    addListener(path: Key[], changeListener: (newState: any) => void): (runPendingListener?: boolean) => void;
  } = subStoreSelector ? store.getSubStore(subStoreSelector) : store;

  return function <TSlice>(pathSelector: any) {
    const path = getPath(pathSelector);
    const initialState = currentStore.get(path) as TSlice;
    const [state, setState] = React.useState<TSlice>(initialState);
    const changeListener = (newState: TSlice) => {
      setState(newState);
      // if (state !== newState) {
      // }
    };

    React.useLayoutEffect(() => currentStore.addListener(path, changeListener), []);

    return [
      state,
      function (updateFunction: any): void {
        if (typeof updateFunction === "function") {
          // eslint-disable-next-line @typescript-eslint/no-shadow
          createUpdateProxy(state, (path, value) => {
            currentStore.update(path, value);
          }, path);
        } else {
          currentStore.update(path, updateFunction);
        }
      },
    ];
  };
}
