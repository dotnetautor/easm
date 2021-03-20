import "core-js/stable";
import "regenerator-runtime/runtime";

import React from "react";
import { render } from "react-dom";

import { Header } from "./components/header";
import { Todo } from "./components/todo";
import { Footer } from "./components/footer";


const App: React.FC = () => {

  return (
    <>
      <Header />
      <Todo />
      <Footer />
    </>
  );
};

render(
  <App />,
  document.getElementById("app"),
);
