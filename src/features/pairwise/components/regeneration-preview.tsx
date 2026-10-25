import {
  Alert,
  Avatar,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { CheckCircleOutlined, CompareArrows } from "@mui/icons-material";
import type { Assignment, PairScope } from "@/features/assignments/types";
import type { previewRegeneration } from "../domain/regeneration";

type Preview = ReturnType<typeof previewRegeneration>;

function PreviewMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}>
      <Typography
        component="div"
        variant="h5"
        color="secondary.main"
        sx={{
          display: { xs: "flex", sm: "block" },
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          component="span"
          sx={{
            display: "block",
            typography: "caption",
            color: "text.secondary",
            mb: { xs: 0, sm: 0.5 },
            flex: 1,
          }}
        >
          {label}
        </Box>{" "}
        {value.toLocaleString("th-TH")}{" "}
        <Box
          component="span"
          sx={{ typography: "caption", color: "text.secondary" }}
        >
          {unit}
        </Box>
      </Typography>
    </Box>
  );
}

export function RegenerationPreview({
  active,
  preview,
  scope,
}: {
  active: Assignment;
  preview: Preview;
  scope: PairScope;
}) {
  const members = active.groups.flatMap((group) => group.members);
  const name = (id: string) =>
    active.groups.find((group) => group.id === id)?.name ??
    members.find((member) => member.id === id)?.name ??
    active.students.find((student) => student.id === id)?.name ??
    "สมาชิกเดิม";
  const reduced =
    scope !== "individual" && preview.coverage < preview.targetCoverage;

  return (
    <Paper
      component="section"
      aria-label="ผลตรวจสอบคู่ประเมินใหม่"
      variant="outlined"
      sx={{
        overflow: "hidden",
        borderColor: (theme) => alpha(theme.palette.secondary.main, 0.3),
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{
          p: 2.5,
          alignItems: { xs: "flex-start", sm: "center" },
          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.07),
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ flex: 1, alignItems: "center", minWidth: 0 }}
        >
          <CheckCircleOutlined color="secondary" />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              ตรวจสอบคู่เรียบร้อยแล้ว
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ตรวจสอบรายละเอียดก่อนเผยแพร่ให้นักศึกษา
            </Typography>
          </Box>
        </Stack>
        <Chip
          size="small"
          color="secondary"
          variant="outlined"
          label={`Generation ${preview.generation}`}
        />
      </Stack>

      <Stack spacing={2.5} sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
            gap: 1.5,
          }}
        >
          <PreviewMetric
            label="งานเปรียบเทียบ"
            value={preview.totalComparisons}
            unit="งาน"
          />
          <PreviewMetric
            label="นักศึกษาที่ได้รับผลกระทบ"
            value={preview.affectedStudentIds.length}
            unit="คน"
          />
          <PreviewMetric
            label="คำตอบเดิม"
            value={preview.replacedAnswers}
            unit="รายการ"
          />
        </Box>

        {scope !== "individual" && (
          <Alert severity={reduced ? "warning" : "success"}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Coverage ที่ทำได้จริง {preview.coverage}/{preview.targetCoverage}{" "}
              ครั้งต่อคู่
            </Typography>
            <Typography variant="caption" component="p">
              {reduced
                ? "ปรับลดจากเป้าหมายเพื่อให้จัดคู่ได้ตามสมาชิกและภาระงานที่กำหนด"
                : "จัดคู่ได้ครบตามเป้าหมายที่กำหนด"}
            </Typography>
          </Alert>
        )}

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            ภาระงานของนักศึกษา
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            component="p"
            sx={{ mb: 1.5 }}
          >
            จำนวนงานรวมทุกเกณฑ์ในส่วนที่เลือกสร้างใหม่
          </Typography>
          <Box
            component="ul"
            aria-label="ภาระงานรายคน"
            tabIndex={0}
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              maxHeight: 256,
              overflowY: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            {preview.workload.map((work) => {
              const memberName = name(work.id);
              const group = active.groups.find((group) =>
                group.members.some((member) => member.id === work.id),
              );
              return (
                <Stack
                  component="li"
                  direction="row"
                  spacing={1.5}
                  key={work.id}
                  sx={{
                    p: 1.5,
                    alignItems: "center",
                    "& + &": { borderTop: 1, borderColor: "divider" },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: (theme) =>
                        alpha(theme.palette.secondary.main, 0.1),
                      color: "secondary.main",
                      typography: "body2",
                    }}
                  >
                    {memberName.slice(0, 1)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, overflowWrap: "anywhere" }}
                    >
                      {memberName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group?.name ?? "ไม่ได้รับคู่ใหม่"}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${work.count} งาน`}
                    sx={{ flexShrink: 0 }}
                  />
                </Stack>
              );
            })}
          </Box>
        </Box>

        {preview.disabledIndividualGroups.length > 0 && (
          <Alert severity="info">
            <Typography variant="body2">
              ปิดรายบุคคลเพราะสมาชิกไม่เกิน 2 คน:
            </Typography>
            <Stack
              direction="row"
              useFlexGap
              sx={{ flexWrap: "wrap", gap: 0.75, mt: 1 }}
            >
              {preview.disabledIndividualGroups.map((group, index) => (
                <Chip size="small" key={`${group}-${index}`} label={group} />
              ))}
            </Stack>
          </Alert>
        )}

        <Divider />
        <Box>
          <Stack
            direction="row"
            sx={{
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 1,
              mb: 1.5,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              คู่ตัวอย่าง
            </Typography>
            <Typography variant="caption" color="text.secondary">
              แสดง {Math.min(3, preview.pairs.length)} งานแรก
            </Typography>
          </Stack>
          <Stack spacing={1.5}>
            {preview.pairs.slice(0, 3).map((pair) => {
              const left = pair.display_left_item_id;
              const right =
                left === pair.item_a_id ? pair.item_b_id : pair.item_a_id;
              const criterion =
                active.questions[Number(pair.criterion_id.split("-").at(-1))];
              return (
                <Box
                  key={pair.id}
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center", mb: 1.5 }}
                  >
                    <Chip
                      size="small"
                      color={pair.side === "GROUP" ? "secondary" : "primary"}
                      variant="outlined"
                      label={pair.side === "GROUP" ? "กลุ่ม" : "รายบุคคล"}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ minWidth: 0, overflowWrap: "anywhere" }}
                    >
                      {criterion}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) 28px minmax(0, 1fr)",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    {[left, right].map((id, index) => (
                      <Box
                        key={id}
                        sx={{
                          gridColumn: index === 0 ? 1 : 3,
                          gridRow: 1,
                          p: 1.25,
                          borderRadius: 1.5,
                          bgcolor: (theme) =>
                            alpha(theme.palette.secondary.main, 0.05),
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {index === 0 ? "ฝั่งซ้าย" : "ฝั่งขวา"}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, overflowWrap: "anywhere" }}
                        >
                          {name(id)}
                        </Typography>
                      </Box>
                    ))}
                    <CompareArrows
                      color="secondary"
                      sx={{ gridColumn: 2, gridRow: 1, justifySelf: "center" }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
        <Typography variant="caption" color="text.secondary">
          คู่ชุดนี้ยังไม่เผยแพร่ กด “ยืนยันและเผยแพร่คู่ใหม่” เมื่อตรวจสอบเรียบร้อย
        </Typography>
      </Stack>
    </Paper>
  );
}
