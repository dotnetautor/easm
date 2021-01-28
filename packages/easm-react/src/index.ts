/* eslint-disable max-len */
import React, { useReducer } from "react";

import { Immutable, Store, PathSelector, Key, getPath, pathSymbol } from "@easm/core";

export type Primitive = boolean | number | bigint | string | symbol;

const createUpdateProxy = <T extends {}>(targetObject: T, handler: (path: Key[], value: any) => void, path: Key[] = []): T => {
  const proxy = new Proxy<T>(targetObject, {
    set(_target, key, value) {
      handler([...path, key], value);
      return true;
    },
    get(targetProperty: any, key: Key) {
      return key === pathSymbol
        ? path
        : typeof targetProperty[key] === "object"
          ? createUpdateProxy(targetProperty[key], handler, [...(path || []), key])
          : targetProperty[key];
    },
  });

  return proxy;
};

export interface UseStoreHook<TStore> {
  <TSlice>(pathSelector: PathSelector<TStore, TSlice>): [
    Immutable<TSlice>,
    (update: TSlice extends Primitive | null | undefined
      ? TSlice
      : ((value: TSlice) => void) | Immutable<TSlice>) => void,
  ];
  (): [
    Immutable<TStore>,
    (update: TStore extends Primitive | null | undefined
      ? TStore
      : ((value: TStore) => void) | Immutable<TStore>) => void,
  ]
}

export function createHook<TRootStoreState>(store: Store<TRootStoreState>): UseStoreHook<TRootStoreState>;
export function createHook<TRootStoreState, TSubStoreState>(store: Store<TRootStoreState>, subStoreSelector: PathSelector<TRootStoreState, TSubStoreState>): UseStoreHook<TSubStoreState>;
export function createHook<TRootStoreState, TSubStoreState>(store: Store<TRootStoreState>, subStoreSelector?: PathSelector<TRootStoreState, TSubStoreState>) {
  const currentStore: {
    get(): any;
    get(path: Key[]): any;
    update(path: Key[], value: any): void;
    addListener(path: Key[], changeListener: (newState: any) => void): (runPendingListener?: boolean) => void;
  } = subStoreSelector ? store.getSubStore(subStoreSelector) : store;

  return <TSlice>(pathSelector?: any) => {
    const pathToStore = getPath(pathSelector || []);

    const [, forceUpdate] = useReducer((x) => x + 1, 0);

    const initialState = currentStore.get(pathToStore);
    const lastStateRef = React.useRef(initialState);

    const changeListener = (newState: TSlice) => {
      if (lastStateRef.current !== newState) {
        lastStateRef.current = newState;
        forceUpdate();
      }
    };

    React.useLayoutEffect(() => currentStore.addListener(pathToStore, changeListener), []);

    return [
      lastStateRef.current,
      (updateFunction: any) => {
        if (typeof updateFunction === "function") {
          updateFunction(
            createUpdateProxy(lastStateRef.current, (pathToUpdate, value) => {
              currentStore.update(pathToUpdate, value);
            }, pathToStore),
          );
        } else {
          currentStore.update(pathToStore, updateFunction);
        }
      },
    ];
  };
}
