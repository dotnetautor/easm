import { Store } from '@easm/core';
import { createHook } from '@easm/react';

export type User = {
  name: string;
};

export interface IApplicationStoreState {
  isBusy: boolean;
  defautTimeOut: number;
  title: string;
  users: User[];
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

export const useStore = createHook(applicationStore);
export const useUserStore = createHook(applicationStore, state => state.users);
