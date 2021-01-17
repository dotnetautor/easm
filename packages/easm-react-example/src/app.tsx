import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { useStore, User, useUserStore } from './store/applicationStore';

import 'file-loader?name=[name].[ext]!./index.html';

type TitleProps = {
  name: string;
};

const getTitleAsync = (time: number) => new Promise<string>((resolve, _reject) => {
  window.setTimeout(resolve, time, "New Title");
});

const Title: React.FC<TitleProps> = (props) => {
  const { name } = props;
  const [isBusy, setIsBusy] = useStore(state => state.isBusy);
  const [title, setTitle] = useStore(state => state.title);
  const [users, setUsers] = useStore(state => state.users);
  const [currentUserId, setCurrentUserId] = useStore(state => state.currentUser);
  const [state, setState] = useStore(state => state);

  const [secondUser, setSecondUser] = useUserStore(state => state[1]);

  const asyncTitleAction = async (time: number = 500) => {
    setIsBusy(true);
    const newTitle = await getTitleAsync(time);
    setTitle(newTitle);
    setIsBusy(false);

    const newUsers = [
      ...users.slice(undefined, currentUserId),
      {...users[currentUserId], name: "Max"},
      ...users.slice(currentUserId + 1),
    ];

    console.log(newUsers);
    setUsers(newUsers);
  };

  return (
    <>
      <div onClick={ () => asyncTitleAction(2000).catch(err => console.error(err)) } >{ title || name }</div>
      <pre>{ JSON.stringify(state, null, 2) }</pre>
    </>
  )
};

type UserProps = {
  title: string;
}

const User: React.FC<UserProps> = (props) => {
  const { title } = props;

  const [users, setUsers] = useStore(state => state.users);
  const [name, setUserOneName] = useStore(state => state.users[1].name);

  const asyncUserAction = async (time: number = 500) => {
    const title = await getTitleAsync(time);

    const newUsers = [
      ...users.slice(0, 0),
      { ...users[1], name: title },
      ...users.slice(2),
    ];
    setUsers(newUsers);
  };

  return (
    <>
      <div onClick={ () => setUserOneName("User one Name") }>{ title }</div>
      <div >{ name }</div>
    </>
  );
}

const App: React.FC = () => (
  <>
    <Title name="Matthias" />
    <User title="Title" />
  </>
);



ReactDOM.render(<App />, document.getElementById('app'));
