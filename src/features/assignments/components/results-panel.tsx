"use client";
import { average } from "@/features/assignments/domain/scoring";
import { FileDownloadOutlined } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";

import type { Assignment } from "../types";
import {
  evaluationTargets,
  isIndividualEvaluation,
  targetVotes,
} from "../domain/evaluation-targets";

export function ResultsPanel({
  active,
  teacher,
  exportExcel,
}: {
  active: Assignment;
  teacher: boolean;
  exportExcel: (assignment: Assignment) => Promise<void>;
}) {
  return (
    <>
      <div className="section-toolbar">
        <div>
          <h3>ภาพรวมคะแนน{isIndividualEvaluation(active) ? "รายคน" : "กลุ่ม"}</h3>
          <p>{active.votes.length} ชุดคำตอบ · คะแนนเฉลี่ยจากการประเมิน</p>
        </div>
        {teacher && (
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlined />}
            onClick={() => exportExcel(active)}
          >
            ส่งออก Excel
          </Button>
        )}
      </div>
      {!teacher && active.status === "closed" && (
        <Alert severity="success" sx={{ mb: 2 }}>
          สิ้นสุดการโหวตแล้ว ขอบคุณสำหรับทุกความคิดเห็น
        </Alert>
      )}
      {evaluationTargets(active)
        .slice()
        .sort((a, b) => average(active, b.id) - average(active, a.id))
        .map((g, i) => (
          <Paper
            variant="outlined"
            className="result-row"
            key={g.id}
            sx={{
              borderRadius: "12px",
              p: { xs: 2, sm: 3 },
              mb: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 2.5,
            }}
          >
            <span className="rank">{i + 1}</span>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {g.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, mb: 1.5 }}
              >
                {targetVotes(active, g.id).length} ผู้ประเมิน
              </Typography>
              <LinearProgress
                aria-label={`คะแนนเฉลี่ย ${g.name}`}
                aria-valuetext={`${average(active, g.id).toFixed(2)} จาก 5 คะแนน`}
                variant="determinate"
                value={average(active, g.id) * 20}
                color="secondary"
                sx={{ height: 8, borderRadius: 4, bgcolor: "#eef4f0" }}
              />
            </Box>
            <strong className="result-score" data-testid="result-score">
              {average(active, g.id).toFixed(2)}
              <small>/ 5</small>
            </strong>
          </Paper>
        ))}
    </>
  );
}
