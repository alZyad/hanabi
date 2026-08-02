import classnames from "classnames";
import React, { HTMLAttributes, ReactNode } from "react";

export function HandStrip(props: { children: ReactNode; className?: string }) {
  return (
    <div className={classnames("flex justify-end flex-grow-1 dib", props.className ?? "self-end")}>
      {props.children}
    </div>
  );
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
