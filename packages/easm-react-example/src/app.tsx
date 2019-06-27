import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { get, set } from '@easm/core';
import { get as xGet } from '@easm/core';
import * as proxy from '@easm/core';

import { useStore, useUserStore } from './store/applicationStore';

import 'file-loader?name=[name].[ext]!./index.html';

const getTitleAsync = (time: number) => new Promise<string>((resolve, reject) => {
  window.setTimeout(() => {
    resolve("New Title");
  }, time);
});

const asyncTitleAction = async (time: number = 500) => {
  const store = useStore();
  set(store.state.isBusy, true);
  const title = await getTitleAsync(time);
  set(store.state.title, title);
  set(store.state.isBusy, false);
  set(store.state.users[xGet(store.state.currentUser)].name, "Max");
  proxy.set(store.state.users[xGet(store.state.currentUser)], { ...xGet(store.state.users[xGet(store.state.currentUser)]) });
};


type TitleProps = {
  name: string;
};

const Title: React.SFC<TitleProps> = (props) => {
  const { title, state } = useStore((store) => ({
    title: xGet(store.state.title),
    state: xGet(store.state),
  }));

  // state.currentUser = "";

  return (
  <>
    <div onClick={() => asyncTitleAction(2000).catch(err => console.error(err))} >{title}</div>
    <pre>{JSON.stringify(state, null, 2)}</pre>
  </>
)};



const asyncUserAction = async (time: number = 500) => {
  const store = useUserStore() ;
  const title = await getTitleAsync(time);
  set(store.state[1].name, title);
};


type UserProps = {
  title: string;
}

const User: React.FC<UserProps> = (props) => {
 const { name } = useUserStore((userStore) => {
    return {
      name: xGet(userStore.state[0].name),
    }
  });
  return (
    <>
      <div onClick={() => asyncUserAction(200)}>{props.title}</div>
      <div >{name}</div>
    </>
  );
}

const App: React.SFC = (props) => (
  <>
    <Title name="Matthias"> </Title>
    <User title="Title" />
  </>
);

ReactDOM.render(<App />, document.getElementById('app'));