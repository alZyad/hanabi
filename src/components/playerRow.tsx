import classnames from "classnames";
import React, { HTMLAttributes, ReactNode } from "react";

export function HandStrip(props: { children: ReactNode }) {
  return <div className="flex justify-end self-end flex-grow-1 dib">{props.children}</div>;
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  vertical?: boolean;
}

export default function PlayerRow(props: Props) {
  const { vertical, className, children, ...attributes } = props;

  return (
    <div
      className={classnames(
        "cards flex justify-between bg-main-dark pa2 pv2-l ph6.5-m relative",
        { "flex-column": vertical },
        className
      )}
      {...attributes}
    >
      {children}
    </div>
  );
}
