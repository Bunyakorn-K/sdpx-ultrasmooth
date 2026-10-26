"use client";
import { statusLabels } from "@/features/assignments/constants";
import {
  AccessTime,
  Add,
  ArrowForward,
  CheckCircleOutlined,
  DescriptionOutlined,
  GroupsOutlined,
  HowToVoteOutlined,
  SchoolOutlined,
  Search,
} from "@mui/icons-material";
import { Button, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";

import { DEFAULT_QUESTIONS as baseQuestions } from "@/features/assignments/constants";
import { PersonArt } from "@/shared/components/person-art";

import type { Assignment } from "../types";
import { isIndividualEvaluation } from "../domain/evaluation-targets";

type AssignmentListProps = {
  nav: string;
  teacher: boolean;
  assignments: Assignment[];
  filtered: Assignment[];
  filter: string;
  search: string;
  setQuestionText: (text: string) => void;
  openModal: (mode: "create") => void;
  setFilter: (value: string) => void;
  setSearch: (value: string) => void;
  setSelected: (id: string | null) => void;
  setTab: (tab: number) => void;
  setError: (message: string) => void;
  cloneAssignment?: (assignment: Assignment) => Promise<void>;
  classrooms?: Array<{ id: string; name: string; timezone?: string }>;
};
export function AssignmentList(props: AssignmentListProps) {
  const {
    nav,
    teacher,
    assignments,
    setQuestionText,
    openModal,
    filter,
    setFilter,
    search,
    setSearch,
    filtered,
    setSelected,
    setTab,
    setError,
  } = props;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow mint-text">
            LET’S MAKE LEARNING MEANINGFUL
          </div>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 800, my: 1.5 }}
          >
            {nav === "results" ? "ผลการประเมิน" : "Assignment ของฉัน"}
            <span>.</span>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {teacher
              ? "สร้างพื้นที่ให้ทุกคนได้แสดงความคิดเห็น และเรียนรู้ไปด้วยกัน"
              : "ร่วมทีม แบ่งปันความคิดเห็น และเรียนรู้ไปด้วยกัน"}
          </Typography>
        </div>
        {teacher && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setQuestionText(baseQuestions.join("\n"));
              openModal("create");
            }}
          >
            สร้าง assignment
          </Button>
        )}
      </div>
      <div className="stat-grid">
        {[
          {
            label: "Assignment ทั้งหมด",
            value: assignments.length,
            icon: <DescriptionOutlined />,
            c: "mint",
          },
          {
            label: "กำลังเปิดโหวต",
            value: assignments.filter((a) => a.status === "active").length,
            icon: <HowToVoteOutlined />,
            c: "pink",
          },
          {
            label: "กลุ่มที่เข้าร่วม",
            value: assignments.reduce((s, a) => s + a.groups.length, 0),
            icon: <GroupsOutlined />,
            c: "blue",
          },
          {
            label: "สิ้นสุดการประเมิน",
            value: assignments.filter((a) => a.status === "closed").length,
            icon: <CheckCircleOutlined />,
            c: "cream",
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <span className={`stat-icon ${s.c}`}>{s.icon}</span>
            <div>
              <span>{s.label}</span>
              <strong>
                {s.value}
                <small>{s.c === "blue" ? "กลุ่ม" : "งาน"}</small>
              </strong>
            </div>
          </div>
        ))}
      </div>
      <div className="list-toolbar">
        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          variant="scrollable"
          aria-label="สถานะ assignment"
        >
          <Tab value="all" label={`ทั้งหมด (${assignments.length})`} />
          <Tab value="draft" label="รอเริ่มโหวต" />
          <Tab value="active" label="กำลังโหวต" />
          <Tab value="closed" label="สิ้นสุดแล้ว" />
        </Tabs>
        <TextField
          placeholder="ค้นหา assignment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            htmlInput: { "aria-label": "ค้นหา assignment" },
            input: {
              startAdornment: (
                <Search sx={{ fontSize: 22, mr: 1, color: "#9ba4a5" }} />
              ),
            },
          }}
          sx={{ width: 240 }}
        />
      </div>
      <div className="assignment-grid">
        {filtered.map((a, i) => (
          <article
            key={a.id}
            className="assignment-card"
            data-testid="assignment-card"
          >
            <div className={`assignment-banner ${a.color}`}>
              <div className="banner-lines" />
              <span className="assignment-subject">{a.subject}</span>
              <div className="banner-art">
                <PersonArt color="transparent" variant={i % 4} />
              </div>
              <span className={`status-badge ${a.status}`}>
                <i />
                {statusLabels[a.status]}
              </span>
            </div>
            <div className="assignment-content">
              <span className="assignment-date">
                สร้างเมื่อ{" "}
                {new Date(a.createdAt).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <Typography
                variant="h6"
                component="h3"
                sx={{ fontWeight: 700, my: 1 }}
              >
                {a.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {isIndividualEvaluation(a)
                  ? "ประเมินรายคนจากกลุ่มอื่น"
                  : "ประเมินกลุ่ม"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, overflowWrap: "anywhere" }}
              >
                {a.description}
              </Typography>
              <div className="assignment-meta">
                <span>
                  <GroupsOutlined />
                  {a.groups.length} กลุ่ม
                </span>
                <span>
                  <SchoolOutlined />
                  {a.students.length} นักเรียน
                </span>
                <span>
                  <DescriptionOutlined />
                  {a.questions.length} คำถาม
                </span>
              </div>
              <div className="assignment-deadline">
                <AccessTime />
                สิ้นสุด{" "}
                {new Date(a.deadline).toLocaleString("th-TH", {
                  timeZone:
                    props.classrooms?.find((c) => c.id === a.classroomId)
                      ?.timezone || "Asia/Bangkok",
                  day: "numeric",
                  month: "short",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="assignment-card-footer">
                <span>
                  ห้องเรียน <strong>{a.subject}</strong>
                </span>
                <Stack direction="row" spacing={1}>
                  {teacher && props.cloneAssignment && (
                    <Button
                      size="small"
                      color="inherit"
                      onClick={(e) => {
                        e.stopPropagation();
                        void props.cloneAssignment?.(a);
                      }}
                    >
                      คัดลอก
                    </Button>
                  )}
                  <Button
                    size="small"
                    color="inherit"
                    endIcon={<ArrowForward />}
                    onClick={() => {
                      setSelected(a.id);
                      setTab(0);
                      setError("");
                    }}
                  >
                    ดูรายละเอียด
                  </Button>
                </Stack>
              </div>
            </div>
          </article>
        ))}
        {!filtered.length && (
          <div className="empty-state">
            <DescriptionOutlined />
            <h3>ยังไม่มี assignment ในรายการนี้</h3>
            <p>
              {teacher
                ? "สร้างงานแรกเพื่อเริ่มต้นการเรียนรู้ร่วมกัน"
                : "Assignment จะแสดงเมื่ออาจารย์เพิ่มรายชื่อของคุณในห้องเรียน"}
            </p>
            {teacher && (
              <Button variant="outlined" onClick={() => openModal("create")}>
                สร้าง assignment
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="dashboard-bottom">
        <span>✳</span>
        <p>ความคิดเห็นเล็ก ๆ วันนี้ อาจเป็นการเรียนรู้ที่ยิ่งใหญ่ในวันพรุ่งนี้</p>
      </div>
    </>
  );
}
