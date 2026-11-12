import React from "react";
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";

export type SfxEvent = {
  readonly src: string;
  readonly from: number;
  readonly volume?: number;
};

export const Sfx: React.FC<{ events: SfxEvent[] }> = ({ events }) => {
  return (
    <>
      {events.map((event, index) => (
        <Audio
          key={`${event.src}-${event.from}-${index}`}
          name={`SFX ${event.src.replace(/\.wav$/, "")} @ ${event.from}`}
          src={event.src.startsWith("http") ? event.src : staticFile(`sfx/${event.src}`)}
          from={event.from}
          volume={event.volume ?? 0.3}
        />
      ))}
    </>
  );
};
