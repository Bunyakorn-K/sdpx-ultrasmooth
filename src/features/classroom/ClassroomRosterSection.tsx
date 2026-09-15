"use client";

import { useRef } from "react";
import { CsvImportPanel } from "#/features/classroom/CsvImportPanel";
import { RosterTable, type RosterTableHandle } from "#/features/classroom/RosterTable";

export function ClassroomRosterSection({ classroomId }: { classroomId: number }) {
  const rosterRef = useRef<RosterTableHandle>(null);

  return (
    <div className="flex flex-col gap-4">
      <CsvImportPanel classroomId={classroomId} onImported={() => rosterRef.current?.refresh()} />
      <RosterTable ref={rosterRef} classroomId={classroomId} />
    </div>
  );
}
