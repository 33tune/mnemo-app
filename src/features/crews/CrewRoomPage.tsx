"use client";
/** myland.lol/c/<slug>: the room, refreshed in place after a notice, a pin… */
import { useCallback, useState } from "react";
import CrewHouseView from "./CrewHouseView";
import { crewApi } from "./crewApi";
import type { CrewHouse } from "./crewTypes";

export default function CrewRoomPage({ initial, joinedNumber }: { initial: CrewHouse; joinedNumber: number | null }) {
  const [house, setHouse] = useState(initial);
  const reload = useCallback(() => {
    crewApi.house(initial.crew.slug).then(h => { if (h) setHouse(h); }).catch(() => {});
  }, [initial.crew.slug]);
  return <CrewHouseView house={house} reload={reload} joinedNumber={joinedNumber} onLeft={reload} />;
}
