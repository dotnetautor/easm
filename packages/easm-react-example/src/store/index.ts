import { Store } from "@easm/core";
import { createHook } from "@easm/react";

import { TodoItemModel } from "../model/todoItemModel";

export interface ToDoApplicationState {
  todoItems: TodoItemModel[];
  newId: number;
}

export const applictationStore = new Store<ToDoApplicationState>({
  todoItems: [
    { id: 1, title: "Buy milk", isFinished: true },
    { id: 2, title: "Learn react", isFinished: false },
  ],
  newId: 3,
});

export const useStore = createHook(applictationStore);
