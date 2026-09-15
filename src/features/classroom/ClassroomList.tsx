"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@heroui/react";

interface ClassroomRow {
  id: number;
  name: string;
  slug: string;
  role: "INSTRUCTOR" | "STUDENT";
}

export function ClassroomList() {
  const [classrooms, setClassrooms] = useState<ClassroomRow[] | null>(null);

  useEffect(() => {
    fetch("/api/classrooms")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => setClassrooms(body.classrooms))
      .catch(() => setClassrooms([]));
  }, []);

  if (classrooms === null) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (classrooms.length === 0) {
    return <p className="text-sm text-zinc-500">No classrooms yet — create one to get started.</p>;
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      {classrooms.map((classroom) => (
        <Link key={classroom.id} href={`/classrooms/${classroom.id}`}>
          <Card className="border border-black/10 bg-white p-4 transition-colors hover:border-indigo-400 dark:border-white/12 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="font-medium">{classroom.name}</span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                {classroom.role}
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function CreateClassroomButton() {
  return (
    <Link href="/classrooms/new">
      <Button variant="primary" size="sm">
        New classroom
      </Button>
    </Link>
  );
}
