import * as React from 'react';
import * as PropTypes from 'prop-types';

import { Store } from '@easm/core';

type FuncInfer<T> = {
  ([...args]: any): T;
};

type FunctionResult<T> = T extends FuncInfer<infer U> ? U : never;

type ComponentDecoratorInfer<TMergedProps> = {
  <TProps>(wrappedComponent: React.ComponentType<TProps & TMergedProps>): React.ComponentClass<TProps>;
};

export type Connect<TStateProps> = FunctionResult<TStateProps> & {

};

export function createAdapter<TStoreState extends (Store<TStoreState> | {})>(store: TStoreState): {
  connectStore: <TStateProps>(mapProps: (store: Store<TStoreState extends Store<infer StoreState> ? StoreState : TStoreState>) => TStateProps) => ComponentDecoratorInfer<TStateProps>,
  useStore: <TRes>(accessor: (store: Store<TStoreState extends Store<infer StoreState> ? StoreState : TStoreState>) => TRes) => ((store: Store<TStoreState extends Store<infer StoreState> ? StoreState : TStoreState>) => TRes),
  store: Store<TStoreState extends Store<infer StoreState> ? StoreState : TStoreState>
}

export function createAdapter<TStoreState>(store: Store<TStoreState>) {

  const connectStore = <TProps, TStateProps>(mapProps: (store: Store<TStoreState>) => TStateProps):
    ((WrappedComponent: React.ComponentType<TProps & TStateProps>) => React.ComponentType<TProps>) => {

    const injectApplicationStore = (WrappedComponent: React.ComponentType<TProps & TStateProps>): React.ComponentType<TProps> => {

      class StoreAdapter extends React.Component<TProps, {}> {

        render(): JSX.Element {
          return React.createElement(WrappedComponent, { ...(this.props as any), ...(mapProps(store) as any) });
        }

        componentDidMount(): void {
          store.addListener(this.handleStoreChanged);
        }

        componentWillUnmount(): void {
          store.removeListener(this.handleStoreChanged);
        }

        private handleStoreChanged = () => {
          this.forceUpdate();
        }
      }
      return StoreAdapter;
    }

    return injectApplicationStore;
  };

  const useStore = <TRes>(accessor: (store: Store<TStoreState>) => TRes) => accessor;

  return {
    connectStore,
    useStore,
    store
  };
}

export function createHook<TStoreState extends (Store<TStoreState> | {}), TStore = Store<TStoreState extends Store<infer StoreState> ? StoreState : TStoreState>>(store: TStoreState): {
  (): TStore;
  <TStateProps>(mapProps: (store: TStore) => TStateProps): TStateProps;
};

/** Creates a custom react hook to use the store state.
 * @param store Optional: The new root state property of a valid store state.
*/
export function createHook<TStoreState>(store: Store<TStoreState>) {

  /**
   * A custom react hook to use the state of the store.
   * @param mapProps Optional: A function to map the store state properties.
   */
  function useStore<TStateProps>(mapProps?: (store: Store<TStoreState>) => TStateProps) {
    if (mapProps === undefined) {
      return store;
    }

    const [state, setState] = React.useState(mapProps(store));
    const changeListener = () => setState(mapProps(store));

    React.useLayoutEffect(() => {
      store.addListener(changeListener);
      return () => {
        store.removeListener(changeListener);
      }
    }, [store]);

    return state;

  }
  return useStore;
}
