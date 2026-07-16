import React from "react";
import { CardSize, CardWrapper } from "~/components/card";

export default function FaceDownHand(props: { size: number }) {
  const { size } = props;

  return (
    <div className="flex">
      {Array.from({ length: size }).map((_, i) => (
        <CardWrapper key={i} className="mr1" color="gray-light" size={CardSize.MEDIUM} />
      ))}
    </div>
  );
}
