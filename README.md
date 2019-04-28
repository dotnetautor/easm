# Essential application state manager

[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/dotnetautor)
[![License MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](https://github.com/dotnetautor/easm/blob/master/LICENSE.md)

## Introduction
The goal of the `essential application state manager` **(easm)** is to provide an easy way to manage the state of an application with ease. It can be used for small and large scale application as well. Basically it is inspired by the FLUX pattern and the idea of a unidirectional data flow.

Instead of using objects as actions, easm uses functions to manipulate the state of the application. Access to the data is made with the help of access functions such as get or set. Using multiple stores in one application implies a lot of coordination work between the stores and complicates the use of various sore states in certain components. One idea behind easm is to organize the whole applications state in one hierarchical store. The access can be subdivided later with the help of virtual data paths and different areas, which can be used independently of each other.

The application state is immutable from the point of view of the store user. This means that whenever any propery of an object changes, a new object is created and a new instance is created for all superordinate objects. In this way, a simple instance comparison can be used to determine whether a state has changed or not.

Easm is designed for proper typing with TypeScript as application state manager for a react application. All examples will show how to use it along with TypeScript and React. Anyhow you can use it with ES5/ES6 and with or without react or any other UI library as well.

## About
`easm` is developed and maintained by [MFICO Training](https://mfico.de). If you're interested in learning more about JavaScript/Typescript and/or React, please [get in touch](mailto:training@mfico.de)!

## Installation
### Using NPM
```
npm install -S -E @easm/core
npm install -S -E @easm/react
npm install -D -E @easm/babel-plugin-transform
```

### Using YARN
```
yarn add -E @easm/core
yarn add -E @easm/react
yarn add -D -E @easm/babel-plugin-transform
```

## Usage
### Configure babel
The essential application state manager needs its own babel transpiler provided in the package `@easm/babel-plugin-transform`. Please add this plugin to your `.babelrc` configuration file as plugin before using EASM. eg.:

```json
{
  "presets": [
      "@babel/preset-react",
      "@babel/preset-env"
  ],
  "plugins": [ "@easm/transform"]
}
```

## Create a store

Basically a store consists of an initial type description of the store state like:
```ts
import { Store } from '@easm/core';

export interface IApplicationStoreState {
  application: {
    isBusy: boolean;
    defautTimeOut: number;
    title: string;
  },
  usersManager: {
    users: { name: string }[];
    currentUserId: number | null
  }
  // ...
}
```

In that example are two main areas `application` and `userManger` each represent the state of one area of the application. The next step is to create the store and initialize it with the initial state.
```ts
// ...
export const applicationStore = new Store<IApplicationStoreState>({
  application: {
    isBusy: false,
    title: "User Manager",
    defautTimeOut: 400,
  },
  usersManager: {
    users: [],
    currentUserId: null
  }
});
```

### Read and Change some states
The state must be always accessed using the accessor methods provided by the easm core package like `get` or `set`.
```ts
import { get, set } from '@easm/core';
// ...
```
Furthermore the store provides a notification, if the state has changed.
Please note that the state will always be read using the accessor method `get`.
```ts
console.log(JSON.stringify(get(applicationStore.state), null, 2));

applicationStore.addListener(() => {
  console.log(JSON.stringify(get(applicationStore.state), null, 2));
});
```
To change some property of the state synchronously, the set accessor shall be used.
```ts
const changeTitleAction = (title: string) => {
  set(applicationStore.state.application.title, title);
}
changeTitleAction("New Title");
```
Asynchronous function results can be directly processed within the action using async/await or then.
```ts
const getTitleAsync = (time: number) => new Promise<string>((resolve, reject) => {
  window.setTimeout(() => {
    resolve("Deayed Title");
  }, time);
});

const asyncTitleAction = async (time: number = get(applicationStore.state.application.defautTimeOut)) => {
  set(applicationStore.state.application.isBusy, true);
  const title = await getTitleAsync(time);
  set(applicationStore.state.application.title, title);
  set(applicationStore.state.application.isBusy, false);
};

asyncTitleAction(2000);
```
## Using EASM with React Hooks >= 16.8
The react library of EASM provides a custom hook gennerator function `createHook`.
```ts
import { createHook } from '@easm/react';
// ...
export const { useStore } = createHook(applicationStore);
```

The generated hook can called without any parameter to get the store itself. This should be used within the actions to get access to the store.
```ts
const asyncTitleAction = async (time: number = 500) => {

  const applicationStore = useStore();

  set(applicationStore.state.application.isBusy, true);
  const title = await getTitleAsync(time);
  set(applicationStore.state.application.title, title);
  set(applicationStore.state.application.isBusy, false);
};
```

The same hook will be used in the component using a mapping function as parameter to create the mapping of the store state using the accessor methodes.
```ts
type TitleProps = {
  name: string;
};

const Title: React.SFC<TitleProps> = (props) => {

  const { title, state } = useStore((store) => ({
    title: get(store.state.title),
    state: get(store.state),
  }));

  return (
  <>
    <div onClick={() => asyncTitleAction(2000).catch(err => console.error(err))} >{title}</div>
    <pre>{JSON.stringify(state, null, 2)}</pre>
  </>
)};
```
Often only a part of the sore state is need. In this case the `createHook` function can also be used to provide access to a certain area of the store. To create such partial store just provide the store with the state property which shall become the root element of the new sub store. The created custom hook will automatically re-render the component it will be used in, in case of any property of the sub store has changed.

```ts
export const useUserStore = createHook(applicationStore.state.users);
```

Such partial store can be used the same way like the application store.

```ts
const asyncUserAction = async (time: number = 500) => {
  const store = useUserStore() ;
  const title = await getTitleAsync(time);
  set(store.state[1].name, title);
};


type UserProps = {
  title: string;
}

const User: React.FC<UserProps> = (props) => {
 const { name, state } = useUserStore((userStore) => {
    return {
      name: get(userStore.state[0].name),
      state: get(userStore.state),
    }
  });
  return (
    <>
      <div onClick={() => asyncUserAction(200)}>{props.title}</div>
      <div >{name}</div>
    </>
  );
}
```

## Using EASM with React < 16.8
To simplify access as much as possible, EASM provides an addtional generator function for the use of EASM with older REACT versions not supporting hook, for creating an connect adapter and granting access to the store.
```ts
import { createAdapter, Connect } from '@easm/react';
// ...
export const { connectStore, useStore, store } = createAdapter(applicationStore);
```
If only a part of the sores is need the createAdapter function can also be used to provide access to a certain area of the store. To create such partial store just provide the store with the state property which shall become the root element of the new store. The new sub store will provide a change event as well, which will only fire in case of changes within the scope of the sub store.
```ts
export const {
  connectStore: connectApplicationStore,
  useStore: useApplicationStore,
  store: applicationStore
} = createAdapter(applicationStore.state.application);

export const {
  connectStore: connectUserStore,
  useStore: useUserStore,
  store: userStore
} = createAdapter(applicationStore.state.usersManager);
```
To simplify the access to the application area of the sore you can use the generated helper `useApplicationSore`:
```ts
const asyncTitleAction = useApplicationStore(store => async (time: number = get(store.state.defautTimeOut)) => {
  set(store.state.isBusy, true);
  const title = await getTitleAsync(time);
  set(store.state.title, title);
  set(store.state.isBusy, false);
});
```
To prepare the connection between the store state and a react component a mapping between the store properties and the components props will be need. This can be done with the help of a mapper function. The same helper `useApplicationSore` can be used access the store within the mapper function. This function will map all need properties as well as all need actions. You can map a single properties or the complete state object:
```ts
const mapTitleComponentProps = useApplicationStore((store) => ({
  title: get(store.state.title),
  state: get(store.state),
}));
```
The type for the components props can be inferred with the type helper `Connect` using the type of the mapper function:
```ts
type TitleComponentProps = Connect<typeof mapTitleComponentProps> & {
  name: string; // additional property
};
```
In this example the **Title** component will use this those props:
```ts
const TitleComponent: React.SFC<TitleComponentProps> = (props) => (
  <>
    <div onClick={() => asyncTitleAction(2000).catch(err => console.error(err))} >{props.title}</div>
    <pre>{JSON.stringify(props.state, null, 2)}</pre>
  </>
);
```
Finally, the component needs to be connected with the store:
```ts
const Title = connectApplication(mapTitleCompnentProps)(TitleComponent);
```
The Title componment con be used like this:
```ts
const App: React.SFC = (props) => (
  <>
    <Title name="Matthias"> </Title>
  </>
);

ReactDOM.render(<App />, document.getElementById('app'));
```
