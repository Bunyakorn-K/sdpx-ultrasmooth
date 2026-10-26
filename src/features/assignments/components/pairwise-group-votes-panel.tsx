"use client";

import {
  Alert,
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
import { groupEvaluationProgress } from "../domain/group-evaluation-progress";
import { CHOICE_POINTS } from "@/features/pairwise/domain/scoring-engine";

export function PairwiseGroupVotesPanel({
  assignment,
  group,
}: {
  assignment: Assignment;
  group: Group;
}) {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h1" variant="h4">
          {group.name}
        </Typography>
        <Typography color="text.secondary">
          {assignment.title} · {group.members.length} สมาชิก
        </Typography>
        <Typography color="text.secondary">
          สถานะการส่งประเมินตามคู่ที่ได้รับมอบหมาย แยกตามบัญชีนักศึกษาและเกณฑ์ประเมิน
        </Typography>
      </Stack>
      {!group.members.length && <Alert severity="info">กลุ่มนี้ยังไม่มีสมาชิก</Alert>}
      {groupEvaluationProgress(assignment, group).map(
        ({ member, tasks, submitted }) => (
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
                gap: 1,
                alignItems: { xs: "flex-start", sm: "center" },
              }}
            >
              <Typography component="h2" variant="h6">
                {member.name}
              </Typography>
              <Chip
                label={`ส่งแล้ว ${submitted}/${tasks.length} รายการ`}
                color={
                  tasks.length > 0 && submitted === tasks.length
                    ? "success"
                    : "default"
                }
              />
            </Stack>
            {!tasks.length ? (
              <Typography color="text.secondary">
                ยังไม่มีคู่ประเมินที่ได้รับมอบหมาย
              </Typography>
            ) : (
              <TableContainer>
                <Table
                  size="small"
                  aria-label={`การโหวตของ ${member.name}`}
                  sx={{ minWidth: 640 }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>ประเภท / เกณฑ์</TableCell>
                      <TableCell>คู่ประเมิน (ซ้าย / ขวา)</TableCell>
                      <TableCell>สถานะ / เวลาส่ง</TableCell>
                      <TableCell>ผลการเปรียบเทียบ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tasks.map(
                      ({
                        pair,
                        response,
                        leftName,
                        rightName,
                        criterionName,
                      }) => (
                        <TableRow key={pair.id}>
                          <TableCell>
                            <Typography variant="body2">
                              {pair.side === "GROUP"
                                ? "ประเมินกลุ่ม"
                                : "ประเมินรายบุคคล"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {criterionName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {leftName} / {rightName}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              variant="outlined"
                              label={response ? "ส่งแล้ว" : "ยังไม่ส่ง"}
                              color={response ? "success" : "default"}
                            />
                            {response && (
                              <Typography
                                variant="caption"
                                sx={{ mt: 1, display: "block" }}
                              >
                                {new Date(
                                  response.submitted_at ?? response.saved_at,
                                ).toLocaleString("th-TH")}
                              </Typography>
                            )}
                            {response?.status === "EXCLUDED" && (
                              <Typography
                                variant="caption"
                                color="warning.main"
                                sx={{ display: "block" }}
                              >
                                ถูกตัดออกจากการคำนวณคะแนน
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {response
                              ? `${response.choice} — ${CHOICE_POINTS[response.choice].label}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        ),
      )}
    </Stack>
  );
}
