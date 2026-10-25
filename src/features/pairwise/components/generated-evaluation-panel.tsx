"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Stack,
  Tab,
  Tabs,
  Typography,
  Paper,
} from "@mui/material";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import type { ComparisonChoice } from "../types";
import { PairwiseCard } from "./pairwise-card";
import { useDeadline } from "@/features/assignments/hooks/use-deadline";
import { generatedResult } from "../domain/generated-results";

export function GeneratedEvaluationPanel({
  active,
  user,
  busy,
  action,
}: {
  active: Assignment;
  user: User | null;
  busy: boolean;
  action: (command: string, input?: Record<string, unknown>) => Promise<void>;
}) {
  const [tab, setTab] = useState(0);
  const [choices, setChoices] = useState<Record<string, ComparisonChoice>>({});
  const [started] = useState(() => Date.now());
  const expired = useDeadline(active.deadline);
  const pairs =
    active.pairs?.filter((p) => p.evaluator_user_id === user?.id) ?? [];
  const selected = pairs.filter(
    (p) => p.side === (tab === 0 ? "GROUP" : "INDIVIDUAL"),
  );
  const ownGroup = active.groups.find((g) =>
    g.members.some((m) => m.id === user?.id),
  );
  const showIndividual =
    (active.individualMaxScore ?? 5) > 0 && (ownGroup?.members.length ?? 0) > 2;
  const result = active.pairResult ?? generatedResult(active, user?.id ?? "");
  const name = (id: string, groups = active.groups) =>
    groups.find((g) => g.id === id)?.name ??
    groups.flatMap((g) => g.members).find((m) => m.id === id)?.name ??
    "รายการเดิม";
  return (
    <Stack spacing={2}>
      <Typography variant="h6">
        คู่ประเมิน Generation {active.pairGeneration}
      </Typography>
      {(active.status === "closed" || active.status === "finalized") && (
        <Alert severity="info">
          คะแนนกลุ่มของคุณ: {result.groupScore} · คะแนนรายบุคคล:{" "}
          {result.individualScore ?? "ยังมีข้อมูลไม่พอ"} · คะแนนรวมหลัง
          participation: {result.finalScore ?? "ยังมีข้อมูลไม่พอ"}
        </Alert>
      )}
      <Tabs
        value={showIndividual ? tab : 0}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
      >
        <Tab label="ประเมินผลงานกลุ่ม" />
        {showIndividual && <Tab label="ประเมินเพื่อนในกลุ่ม" />}
      </Tabs>
      {!showIndividual && (
        <Alert severity="info">
          ไม่มีการประเมินรายบุคคลเมื่อสมาชิกไม่เกิน 2 คน
          หรือคะแนนเต็มรายบุคคลเป็น 0
        </Alert>
      )}
      <Typography>
        ส่งแล้ว{" "}
        {
          selected.filter((p) =>
            active.comparisons?.some((c) => c.pair_assignment_id === p.id),
          ).length
        }{" "}
        / {selected.length} คู่
      </Typography>
      {(active.status !== "active" || expired) && (
        <Alert severity="info">
          ปิดรับคำตอบในขณะนี้ คำตอบที่ส่งแล้วเปิดดูได้อย่างเดียว
        </Alert>
      )}
      {!selected.length && (
        <Alert severity="info">ไม่มีคู่ที่ได้รับมอบหมายในส่วนนี้</Alert>
      )}
      {selected.map((p) => {
        const response = active.comparisons?.find(
          (c) => c.pair_assignment_id === p.id,
        );
        const left = p.display_left_item_id;
        const right = left === p.item_a_id ? p.item_b_id : p.item_a_id;
        const locked =
          busy || !!response || expired || active.status !== "active";
        return (
          <Paper variant="outlined" sx={{ p: 2 }} key={p.id}>
            <PairwiseCard
              pairId={p.id}
              criterionName={
                active.questions[Number(p.criterion_id.split("-").at(-1))] ??
                "เกณฑ์"
              }
              leftItemName={name(left)}
              rightItemName={name(right)}
              currentChoice={response?.choice ?? choices[p.id]}
              busy={locked}
              onChoiceChange={(choice) =>
                setChoices((previous) => ({ ...previous, [p.id]: choice }))
              }
            />
            <Button
              sx={{ mt: 1 }}
              variant="contained"
              disabled={locked || !choices[p.id]}
              onClick={() =>
                action("submitPair", {
                  pairId: p.id,
                  choice: choices[p.id],
                  expectedGeneration: active.pairGeneration,
                  timeOnTaskMs: Date.now() - started,
                })
              }
            >
              {response ? "ส่งผลประเมินแล้ว" : "ส่งผลประเมินคู่นี้"}
            </Button>
          </Paper>
        );
      })}
      {!!active.pairHistory?.length && (
        <Stack spacing={1}>
          <Typography variant="h6">
            ประวัติคำตอบเดิม (อ่านอย่างเดียว)
          </Typography>
          {active.pairHistory.map((h, i) => (
            <Paper variant="outlined" sx={{ p: 2 }} key={i}>
              <Typography>
                Generation {h.generation} · ไม่นำมาคำนวณผลปัจจุบัน
              </Typography>
              {h.comparisons
                .filter((c) => c.evaluator_user_id === user?.id)
                .map((c) => {
                  const p = h.pairs.find((p) => p.id === c.pair_assignment_id);
                  return (
                    <Typography variant="body2" key={c.id}>
                      {p
                        ? `${name(p.item_a_id, h.groups)} ↔ ${name(p.item_b_id, h.groups)}`
                        : "คู่เดิม"}
                      : {c.choice}
                    </Typography>
                  );
                })}
              {h.votes
                .filter((v) => v.userId === user?.id)
                .map((v, j) => (
                  <Typography variant="body2" key={j}>
                    {name(v.groupId ?? v.studentId ?? "", h.groups)}:{" "}
                    {v.scores.join(", ")}
                  </Typography>
                ))}
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
