import classnames from "classnames";
import React from "react";

interface Props {
  active: boolean;
  onToggle: () => void;
}

export default function ChopMoveButton(props: Props) {
  const { active, onToggle } = props;

  return (
    <button
      className={classnames("cm-button", { "cm-button--active": active })}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      cm
    </button>
  );
}
