"use client";
import { useState } from "react";
import { Alert, Box, Stack, Tab, Tabs, Typography, Paper } from "@mui/material";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import { EvaluationSidePanel } from "./evaluation-side-panel";
import type { EvaluationCommand } from "../hooks/use-evaluation-draft";
import { generatedResult } from "../domain/generated-results";
import { appealScore } from "@/features/assignments/domain/appeals";

export function GeneratedEvaluationPanel({
  active,
  user,
  busy,
  command,
}: {
  active: Assignment;
  user: User | null;
  busy: boolean;
  command: EvaluationCommand;
}) {
  const [tab, setTab] = useState(0);
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
          คะแนนกลุ่มของคุณ: {result.groupScore ?? "ยังไม่มีผลประเมิน"} · คะแนนรายบุคคล:{" "}
          {result.individualScore ?? "ยังมีข้อมูลไม่พอ"} · คะแนนรวมหลัง participation:{" "}
          {result.finalScore ?? "ยังมีข้อมูลไม่พอ"}
          {appealScore(active, user?.id ?? "", null) !== null &&
            " (ปรับตามผลอุทธรณ์)"}
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
          ไม่มีการประเมินรายบุคคลเมื่อสมาชิกไม่เกิน 2 คน หรือคะแนนเต็มรายบุคคลเป็น 0
        </Alert>
      )}
      <Box hidden={showIndividual && tab !== 0}>
        <EvaluationSidePanel
          active={active}
          userId={user?.id ?? ""}
          side="GROUP"
          visible={!showIndividual || tab === 0}
          command={command}
          busy={busy}
        />
      </Box>
      {showIndividual && (
        <Box hidden={tab !== 1}>
          <EvaluationSidePanel
            active={active}
            userId={user?.id ?? ""}
            side="INDIVIDUAL"
            visible={tab === 1}
            command={command}
            busy={busy}
          />
        </Box>
      )}
      {!!active.pairHistory?.length && (
        <Stack spacing={1}>
          <Typography variant="h6">ประวัติคำตอบเดิม (อ่านอย่างเดียว)</Typography>
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
