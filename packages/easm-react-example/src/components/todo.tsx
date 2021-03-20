import React from "react";

import { TodoItemModel } from "../model/todoItemModel";
import { useStore } from "../store";
import { TodoItem } from "./todoItem";

export const Todo: React.FC = () => {
  const [toDoItems, updateToDoItems] = useStore((state) => state.todoItems);
  const [newId, setNewId] = useStore((state) => state.newId);
  const [renameIndex, setRenameIndex] = React.useState<number | null>(null);
  const [newItemTitle, setNewItemTitle] = React.useState<string>("");

  const addItem = () => {
    const newTodoItem: TodoItemModel = {
      id: newId,
      title: newItemTitle,
      isFinished: false
    };

    updateToDoItems([...toDoItems, newTodoItem]);
    setNewId(newId + 1);

    setNewItemTitle("");
  };

  const changeItem = (index: number, isFinished: boolean) => {
    updateToDoItems((items) => {
      items[index].isFinished = isFinished;
    });
  };

  const beginRenameItem = (index: number) => {
    setRenameIndex(index);
  };

  const endRenameItem = (index: number, newTitle: string) => {
    updateToDoItems((items) => {
      items[index].title = newTitle;
    });
    setRenameIndex(null);
  };

  const cleanupFinished = () => {
    updateToDoItems(toDoItems.filter(item => !item.isFinished));
  }

  return (
    <div className="container content pt-2 pb-1">
      <div className="row">
        <div className="col input-group mb-3">
          <input type="text"
            className="form-control"
            placeholder="New Item"
            aria-label="New item"
            value={newItemTitle}
            onChange={e => setNewItemTitle(e.currentTarget.value)}
          />
          <div className="input-group-append">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={addItem}
              disabled={renameIndex !== null || newItemTitle === ""}
            >
              Add
            </button>
          </div>
        </div>
      </div>
      <div className="content scroll">
        {
          toDoItems.map((item, index) => (
            <TodoItem key={item.id}
              todoItem={item}
              readOnly={(renameIndex !== null && renameIndex !== index)}
              onChangeIsFinished={newIsFinished => changeItem(index, newIsFinished)}
              onRenameStart={() => beginRenameItem(index)}
              onRenameEnd={newTitle => endRenameItem(index, newTitle)}
            />
          ))
        }
      </div>
      <div className="row">
        <div className="col mt-3">
          <button className="btn btn-outline-secondary float-right" type="button" onClick={cleanupFinished}>
            Clean up
          </button>
        </div>
      </div>
    </div>
  );
};
