import * as React from 'react';

import { Immutable, Store } from '@easm/core';

export type UseStoreHook<TStore> = {
  <TSlice>(pathSelector: (state: Immutable<TStore>) => TSlice): [TSlice, (value: TSlice) => void];
}

export function createHook<TRootStoreState>(store: Store<TRootStoreState>): UseStoreHook<TRootStoreState>;
export function createHook<TRootStoreState, TSubStoreState>(store: Store<TRootStoreState>, subStoreSelector: (state: TRootStoreState) => TSubStoreState): UseStoreHook<TSubStoreState>;
export function createHook<TRootStoreState, TSubStoreState>(store: Store<TRootStoreState>, subStoreSelector?: (state: TRootStoreState) => TSubStoreState): UseStoreHook<TRootStoreState | TSubStoreState> {
  const currentStore = subStoreSelector ? store.getSubStore(subStoreSelector) : store;

  return function<TSlice>(pathSelector: (state: Immutable<TSubStoreState | TRootStoreState>) => TSlice) {
    const [, setState] = React.useState<{}>();
    const slice = currentStore.get(pathSelector) as unknown as TSlice;
    const sliceRef = React.useRef(slice);

    const changeListener = () => {
      sliceRef.current = currentStore.get(pathSelector) as unknown as TSlice;
      setState({});
    };

    React.useLayoutEffect(() => {
      currentStore.addListener(changeListener);
      return () => {
        currentStore.removeListener(changeListener);
      }
    }, []);

    return [
      sliceRef.current,
      function(value: TSlice) {
        currentStore.set(pathSelector, value);
      },
    ];
  };
}
