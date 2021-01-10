import React from 'react';

import { Store, Immutable } from "@easm/core";
import { pathSymbol, getPath } from "@easm/core/store";

type TKey = string | number | symbol;

const createUpdateProxy = <T extends { [key: string]: any;[key: number]: any; }>(target: T, handler: (path: TKey[], value: any) => void, path: TKey[] = []): T => {
  return new Proxy<T>(target, {
    set(target, key, value, receiver) {
      // console.log(path.join(".") + `.${String(key)} => ${value}`);
      handler([...path, key], value);
      return true;
    },
    get(target: T, key: TKey) {
      return key === pathSymbol
        ? path
        : typeof key !== "symbol" && typeof target[key] === "object"
          ? createUpdateProxy(target[key], handler, [...(path || []), key])
          : target[key as any];
    },
  });
};

export type UseStoreHook<TStore> = {
  <TSlice>(pathSelector: (state: TStore) => TSlice): [Immutable<TSlice>, (updateFunction: (value: TSlice) => void) => void];
}

export function createHook<TRootStoreState>(store: Store<TRootStoreState>): UseStoreHook<TRootStoreState>;
export function createHook<TRootStoreState, TSubStoreState>(store: Store<TRootStoreState>, subStoreSelector: (state: TRootStoreState) => TSubStoreState): UseStoreHook<TSubStoreState>;
export function createHook<TRootStoreState, TSubStoreState>(store: Store<TRootStoreState>, subStoreSelector?: (state: TRootStoreState) => TSubStoreState): UseStoreHook<TRootStoreState | TSubStoreState> {

  const currentStore = subStoreSelector ? store.getSubStore(subStoreSelector) : store;

  return function <TSlice>(pathSelector: (state: TSubStoreState | TRootStoreState) => TSlice) {
    const path = getPath(pathSelector);

    const [state, setState] = React.useState<TSlice>(currentStore.get(path as unknown as TSlice));

    const changeListener = (newState: TSlice) => {
      if (state !== newState) {
        setState(newState);
      }
    };

    React.useLayoutEffect(() => {
      return currentStore.addListener(path, changeListener);
    }, []);

    return [
      state,
      function (updateFunction: (value: TSlice) => void) {
        updateFunction(createUpdateProxy(state, (path, value) => {
          currentStore.set(path, value);
        }, path));
      },
    ];
  };
}