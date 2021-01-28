# Essential application state manager

[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/dotnetautor)
[![License MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](https://github.com/dotnetautor/easm/blob/master/LICENSE.md)
[![Build](https://travis-ci.org/dotnetautor/easm.svg?branch=master)](https://travis-ci.org/dotnetautor/easm)

## Introduction
The goal of the `essential application state manager` **(easm)** is to provide an easy way to manage the state of an application with ease. It can be used for small and large scale application as well. Basically it is inspired by the FLUX pattern and the idea of a unidirectional data flow.

Instead of using objects as actions, easm uses functions to manipulate the state of the application. Access to the data is made with the help of access functions such as get or set. Using multiple stores in one application implies a lot of coordination work between the stores and complicates the use of various sore states in certain components. One idea behind easm is to organize the whole applications state in one hierarchical store. The access can be subdivided later with the help of virtual data paths and different areas, which can be used independently of each other.

The application state is immutable from the point of view of the store user. This means that whenever any propery of an object changes, a new object is created and a new instance is created for all superordinate objects. In this way, a simple instance comparison can be used to determine whether a state has changed or not.

Easm is designed for proper typing with TypeScript as application state manager for a react application. All examples will show how to use it along with TypeScript and React. Anyhow you can use it with ES5/ES6 and with or without react or any other UI library as well.

## About
`easm` is developed and maintained by [MFICO Training](https://mfico.de) and supported by [AFE-GmdG](mailto:afe-gmdg@gmx.de). If you're interested in learning more about JavaScript/Typescript and/or React, please [get in touch](mailto:training@mfico.de)!

## Installation
### Using NPM
```
npm install -S -E @easm/core
npm install -S -E @easm/react
```

### Using YARN
```
yarn add -E @easm/core
yarn add -E @easm/react

```

## Usage
### Create a store
Basically a store consists of an initial type description of the store state like:
```ts
import { Store } from '@easm/core';

export interface IApplicationStoreState {
  application: {
    isBusy: boolean;
    title: string;
  },
  authors: {
    name: string;
    books: {
      title: string;
      isbn: number;
    }[];
  }[];
  usersManager: {
    users: { name: string }[];
    currentUserId: number | null
  }
  // ...
}
```

In that example are three main areas `application`, `authors` and `userManger` each represent the state or some data of one area of the application. The next step is to create the store and initialize it.
```ts
// ...
export const applicationStore = new Store<IApplicationStoreState>({
  application: {
    isBusy: false,
    title: "Number One Book Store",
  },
  authors: [],
  usersManager: {
    users: [],
    currentUserId: null,
  },
});
```

### Read and update or write some states
The state must be always accessed using the store accessor methods like `get` or `set`.
To change some property of the state synchronously, the set accessor shall be used.

```ts
const completeState = applicationStore.get();
const isBusy = applicationStore.get(state => state.application.isBusy);
applicationStore.set(state => state.application.isBusy, true);
// ...
```
### Get notified of changes
Furthermore the store provides a notification, if the state has changed.
Please note that the state will always be read using the accessor method `get`.

```ts
function logObject<T>(state: T) {
  console.log(JSON.stringify(state, null, 2));
}

logObject(applicationStore.get());
logObject(applicationStore.get(state => state.application));

applicationStore.addListener(applicationStoreState => {
  logObject(applicationStoreState);
});
applicationStore.addListener(state => state.application.isBusy, isBusy => {
  logObject(isBusy);
});

```

## Usage with React Hooks (React >= 16.8.)
The react library of EASM provides a custom hook generator function `createHook`.
You can create hooks either for the complete store state or for a specific sub store state:
```ts
import { createHook } from '@easm/react';
// ...
const useApplicationStore = createHook(applicationStore);

const useAuthorsStore = createHooke(applicationStore,
  state => state.authors);

const useUsersManagerStore = createHook(applicationStore,
  state => state.usersManager);
```

The generated hook will be used in the component to get access of the store state.
```ts
const BookStoreTitle: React.FC = () => {

  const [app, updateApp] = useApplicationStore(state => state.application);
  // app is a immutable object, containing the current app data of the store state.
  // updateApp is a function to update the app data inside the store state.

  const setANewStoreTitle = () => {
    updateApp((app) => { app.title = "The best bookstore in the world!" });
  };

  return (
  <>
    <h1>{ title }</h1>
    <button type="button" onClick={ setANewStoreTitle }>
      Update the store title
    </button>
  </>
)};
```
