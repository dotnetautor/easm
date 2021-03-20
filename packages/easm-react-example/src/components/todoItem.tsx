import React from "react";
import { TodoItemModel } from "../model/todoItemModel";

export type TodoItemProps = {
  todoItem: TodoItemModel;
  readOnly: boolean;
  onChangeIsFinished: (newIsFinished: boolean) => void;
  onRenameStart: () => void;
  onRenameEnd: (newTitle: string) => void;
};

export const TodoItem: React.FC<TodoItemProps> = (props) => {
  const {
    todoItem,
    readOnly,
    onChangeIsFinished,
    onRenameStart,
    onRenameEnd
  } = props;

  const [isRenaming, setIsRenaming] = React.useState(false);
  const [currentTitle, setCurrentTitle] = React.useState(todoItem.title);
  const titleRef = React.createRef<HTMLInputElement>();

  const onRenameButtonClick = () => {
    if (!isRenaming) {
      onRenameStart();
      setIsRenaming(true);
    } else {
      onRenameEnd(titleRef.current?.value || "");
      setIsRenaming(false);
    }
  };

  return (
    <div className="row">
      <div className="col input-group">
        <div className="input-group-prepend">
          <div className="input-group-text">
            <input type="checkbox"
              checked={todoItem.isFinished}
              onChange={() => onChangeIsFinished(!todoItem.isFinished)}
              aria-label="ToDo item" />
          </div>
        </div>
        <input ref={titleRef}
          type="text"
          className="form-control"
          style={{ textDecoration: todoItem.isFinished ? "line-through" : "none" }}
          readOnly={(readOnly || !isRenaming)}
          value={currentTitle}
          onChange={(e) => setCurrentTitle(e.currentTarget.value)} />
        <div className="input-group-append">
          <button className="btn btn-outline-secondary"
            type="button"
            disabled={readOnly}
            onClick={onRenameButtonClick}>
            {isRenaming ? "Save" : "Rename"}
          </button>
        </div>
      </div>
    </div>
  );
};
