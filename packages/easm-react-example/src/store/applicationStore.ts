import { Store } from '@easm/core';
import { createHook } from '@easm/react';

export interface IApplicationStoreState {
  isBusy: boolean;
  defautTimeOut: number;
  title: string;
  users: { name: string }[];
  currentUser: number;
  windows?: {
    [id: string]: {
      name: string
    }
  }
}

const applicationStore = new Store<IApplicationStoreState>({
  isBusy: false,
  title: "User Manager",
  users: [],
  defautTimeOut: 400,
  currentUser: 0
});

// export const { connectStore, useStore, store } = createAdapter(applicationStore);
// export const { connectStore: connectUserStore, useStore: useUserStore, store: userStore } = createAdapter(applicationStore.state.users);

export const useStore = createHook(applicationStore);
export const useUserStore = createHook(applicationStore.state.users);
