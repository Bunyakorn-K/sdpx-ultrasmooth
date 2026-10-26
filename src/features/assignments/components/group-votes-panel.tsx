"use client";

import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { Assignment, Group } from "../types";
import { average } from "../domain/scoring";
import { PairwiseGroupVotesPanel } from "./pairwise-group-votes-panel";
import {
  canEvaluateTarget,
  evaluationTargets,
  isIndividualEvaluation,
  targetVotes,
} from "../domain/evaluation-targets";

export function GroupVotesPanel({
  assignment,
  group,
}: {
  assignment: Assignment;
  group: Group;
}) {
  if (assignment.pairs !== undefined || assignment.pairwiseRequired)
    return <PairwiseGroupVotesPanel assignment={assignment} group={group} />;
  return <LegacyGroupVotesPanel assignment={assignment} group={group} />;
}

function LegacyGroupVotesPanel({
  assignment,
  group,
}: {
  assignment: Assignment;
  group: Group;
}) {
  const targets = evaluationTargets(assignment);
  const individual = isIndividualEvaluation(assignment);
  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h4">
          {group.name}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {assignment.title} · {group.members.length} สมาชิก ·{" "}
          {individual ? "ประเมินนักเรียนจากกลุ่มอื่นรายคน" : "ประเมินกลุ่มอื่น"}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          คำตอบแยกตามบัญชีของนักเรียนแต่ละคน เปรียบเทียบ 1–6 · หน้านี้สำหรับอาจารย์เจ้าของงาน
        </Typography>
      </Box>
      {!group.members.length && <Alert severity="info">กลุ่มนี้ยังไม่มีสมาชิก</Alert>}
      {group.members.map((member) => {
        const eligible = targets.filter((target) =>
          canEvaluateTarget(assignment, member.id, target.id),
        );
        const submitted = eligible.filter((target) =>
          targetVotes(assignment, target.id).some(
            (vote) => vote.userId === member.id,
          ),
        ).length;
        return (
          <Paper
            component="section"
            variant="outlined"
            key={member.id}
            sx={{ p: { xs: 2, sm: 3 }, borderRadius: "12px" }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{
                mb: 2,
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 1,
              }}
            >
              <Typography component="h2" variant="h6">
                {member.name}
              </Typography>
              <Chip
                label={`ส่งแล้ว ${submitted}/${eligible.length} รายการ`}
                color={
                  eligible.length > 0 && submitted === eligible.length
                    ? "success"
                    : "default"
                }
              />
            </Stack>
            {individual && (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                คะแนนที่ได้รับ {average(assignment, member.id).toFixed(2)} / 6 ·{" "}
                {targetVotes(assignment, member.id).length} ผู้ประเมิน
              </Typography>
            )}
            {!eligible.length ? (
              <Typography color="text.secondary">
                ยังไม่มีผู้รับการประเมินจากกลุ่มอื่น
              </Typography>
            ) : (
              <TableContainer>
                <Table
                  size="small"
                  aria-label={`การโหวตของ ${member.name}`}
                  sx={{ minWidth: 460 }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        {individual ? "นักเรียนที่รับการประเมิน" : "กลุ่มที่รับการประเมิน"}
                      </TableCell>
                      <TableCell>สถานะ / เวลาส่ง</TableCell>
                      <TableCell>คะแนนรายข้อ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {eligible.map((target) => {
                      const vote = targetVotes(assignment, target.id).find(
                        (answer) => answer.userId === member.id,
                      );
                      return (
                        <TableRow key={target.id}>
                          <TableCell sx={{ verticalAlign: "top" }}>
                            {target.name}
                          </TableCell>
                          <TableCell
                            sx={{ verticalAlign: "top", minWidth: 140 }}
                          >
                            <Chip
                              size="small"
                              label={vote ? "ส่งแล้ว" : "ยังไม่ส่ง"}
                              color={vote ? "success" : "default"}
                              variant="outlined"
                            />
                            {vote && (
                              <Typography
                                variant="caption"
                                sx={{ mt: 1, display: "block" }}
                              >
                                {new Date(vote.createdAt).toLocaleString(
                                  "th-TH",
                                )}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {vote
                              ? assignment.questions.map((question, index) => (
                                  <Typography
                                    variant="body2"
                                    key={index}
                                    sx={{ mb: 1 }}
                                  >
                                    {index + 1}. {question}:{" "}
                                    <strong>{vote.scores[index]} / 6</strong>
                                  </Typography>
                                ))
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
}
