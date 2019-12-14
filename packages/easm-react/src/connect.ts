import * as React from 'react';

import { Store } from '@easm/core';


type ComponentDecoratorInfer<TMergedProps> = {
  <TProps>(wrappedComponent: React.ComponentType<TProps & TMergedProps>): React.ComponentClass<Omit<TProps & TMergedProps, keyof TMergedProps>>;
};

export type Connect<TStateProps extends (...args: any) => any> = ReturnType<TStateProps> & {

};

export function createAdapter<TStoreState extends (Store<TStoreState> | {})>(store: TStoreState): {
  connectStore: <TStateProps>(mapProps: (store: Store<TStoreState extends Store<infer StoreState> ? StoreState : TStoreState>) => TStateProps) => ComponentDecoratorInfer<TStateProps>,
  useStore: <TRes>(accessor: (store: Store<TStoreState extends Store<infer StoreState> ? StoreState : TStoreState>) => TRes) => ((store: Store<TStoreState extends Store<infer StoreState> ? StoreState : TStoreState>) => TRes),
  store: Store<TStoreState extends Store<infer StoreState> ? StoreState : TStoreState>
}

export function createAdapter<TStoreState>(store: Store<TStoreState>): any {

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
  function useStore<TStateProps>(mapProps?: (store: Store<TStoreState>) => TStateProps, deps?: any[]) {
    if (mapProps === undefined) {
      return store;
    }

    const depsRef = React.useRef({ deps: undefined as (undefined | any[]), state: {} as TStateProps});

    if (!depsRef.current.deps || (depsRef.current.deps.length > 0 && depsRef.current.deps.some((dep, ind) => dep !== depsRef.current.deps![ind]))) {
      depsRef.current.state = mapProps(store);
      depsRef.current.deps = deps;
    }

    const [, setState] = React.useState();

    const changeListener = () => {
      depsRef.current.state = mapProps(store);
      setState({});
    }

    React.useLayoutEffect(() => {
      store.addListener(changeListener);
      return () => {
        store.removeListener(changeListener);
      }
    }, []);

    return depsRef.current.state;

  }
  return useStore;
}
