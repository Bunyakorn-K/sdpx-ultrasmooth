"use client";
import {
  ArrowForward,
  ArrowOutward,
  CheckCircleOutlined,
  HowToVoteOutlined,
} from "@mui/icons-material";
import { Button } from "@mui/material";

import { PersonArt } from "@/shared/components/person-art";
import type { User } from "@/features/auth/types";

type LandingPageProps = {
  user?: User | null;
  openModal: (mode: "login" | "register") => void;
  enterDemo: (role: "teacher" | "student") => void;
  onGoToApp?: () => void;
};
export function LandingPage(props: LandingPageProps) {
  const { user, openModal, enterDemo, onGoToApp } = props;
  return (
    <div className="landing">
      <div className="blue-blob" />
      <div className="cream-blob" />
      <div className="site-sheet">
        <header className="landing-header">
          <a href="#" className="wordmark">
            pair<span>wise</span>
            <i>✳</i>
          </a>
          <nav data-testid="main-nav">
            <a href="#how">วิธีใช้งาน</a>
            <a href="#features">ฟีเจอร์ของเรา</a>
            <a href="#for-everyone">สำหรับทุกคน</a>
          </nav>
          <div className="header-actions">
            {user ? (
              <Button
                variant="contained"
                endIcon={<ArrowForward sx={{ fontSize: 19 }} />}
                onClick={onGoToApp}
              >
                เข้าสู่ห้องเรียน
              </Button>
            ) : (
              <>
                <Button variant="contained" onClick={() => openModal("register")}>
                  เริ่มต้นใช้งานฟรี
                </Button>
                <Button
                  color="inherit"
                  endIcon={<ArrowForward sx={{ color: "#55b8b6", fontSize: 19 }} />}
                  onClick={() => openModal("login")}
                >
                  เข้าสู่ระบบ
                </Button>
              </>
            )}
          </div>
        </header>
        <main>
          <section className="hero" id="for-everyone">
            <div className="eyebrow">
              <span /> LEARN TOGETHER. GROW TOGETHER.
            </div>
            <h1>
              ทุกความคิดเห็น
              <br className="mobile-break" /> สร้างการเรียนรู้ที่ดีกว่า
              <span>.</span>
            </h1>
            <p>
              พื้นที่เล็ก ๆ ที่ให้ทุกคนมีส่วนร่วม ประเมินผลงานระหว่างกลุ่ม
              <br />
              และเติบโตไปด้วยกัน ผ่านมุมมองของเพื่อน
            </p>
            <div className="hero-actions">
              {user ? (
                <Button
                  data-testid="main-cta"
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={onGoToApp}
                >
                  ไปยังห้องเรียนของคุณ
                </Button>
              ) : (
                <>
                  <Button
                    data-testid="main-cta"
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={() => openModal("register")}
                  >
                    เริ่มต้นการเรียนรู้ร่วมกัน
                  </Button>
                  <Button color="inherit" onClick={() => enterDemo("teacher")}>
                    ลองใช้งานตัวอย่าง <ArrowOutward sx={{ fontSize: 19, ml: 1 }} />
                  </Button>
                </>
              )}
            </div>
            <div className="hero-caption">
              ออกแบบมาเพื่อครูและนักเรียน • เรียบง่ายในทุกขั้นตอน
            </div>
          </section>
          <section className="audience-grid">
            {[
              {
                label: "สำหรับคุณครู",
                en: "Make learning meaningful",
                color: "#cceee1",
                v: 0,
                desc: "สร้างงาน ออกแบบคำถาม และดูการเติบโต",
                click: () => openModal("register"),
              },
              {
                label: "สำหรับนักเรียน",
                en: "Your voice matters",
                color: "#d9eff4",
                v: 1,
                desc: "เข้าร่วมกลุ่ม แบ่งปันมุมมองอย่างสร้างสรรค์",
                click: () => openModal("login"),
              },
            ].map((c, i) => (
              <button
                data-testid="audience-card"
                className={`audience-card audience-${i}`}
                key={c.label}
                onClick={c.click}
              >
                <div className="audience-copy">
                  <h3>{c.label}</h3>
                  <span>{c.en}</span>
                </div>
                <PersonArt color={c.color} variant={c.v} />
                <div className="card-bottom">
                  {c.desc}
                  <ArrowForward sx={{ fontSize: 18 }} />
                </div>
              </button>
            ))}
          </section>
          <section className="feature-split" id="features">
            <div>
              <div className="eyebrow mint-text">
                A LITTLE FEEDBACK. A LOT OF POSSIBILITY.
              </div>
              <h2>
                การประเมินที่มีความหมาย
                <br />
                เริ่มต้นได้ง่าย ๆ
              </h2>
              <p>
                ให้ครูมีเวลาสร้างการเรียนรู้ ให้นักเรียนมีพื้นที่แสดงความคิดเห็น
                <br className="desktop-break" /> จัดการทุกขั้นตอน
                ตั้งแต่งานกลุ่มจนถึงสรุปผลในที่เดียว
              </p>
              <ul>
                {[
                  "สร้างห้องเรียนและนำเข้ารายชื่อนักศึกษาพร้อมกลุ่มผ่าน CSV",
                  "ประเมินด้วยคะแนน 5 ระดับ เข้าใจง่ายในทุกมุมมอง",
                  "นำเข้าคำถามและส่งออกผลคะแนนด้วย Excel",
                ].map((t) => (
                  <li key={t}>
                    <CheckCircleOutlined />
                    {t}
                  </li>
                ))}
              </ul>
              <Button
                color="secondary"
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={() => enterDemo("teacher")}
              >
                สำรวจพื้นที่ของคุณครู
              </Button>
            </div>
            <div className="feature-illustration">
              <PersonArt color="#d9f2e9" large />
              <div className="floating-note">
                <span className="note-icon">
                  <HowToVoteOutlined />
                </span>
                <div>
                  <strong>ทุกเสียงมีความหมาย</strong>
                  <span>เรียนรู้ • แบ่งปัน • เติบโต</span>
                </div>
                <span className="little-stars">✦</span>
              </div>
            </div>
          </section>
          <section id="how" className="how-section">
            <div className="eyebrow">LESS MANAGING. MORE LEARNING.</div>
            <h2>จากไอเดีย สู่การเรียนรู้ร่วมกัน</h2>
            <div className="steps">
              {[
                [
                  "01",
                  "สร้างพื้นที่การเรียนรู้",
                  "ครูสร้างงาน เพิ่มคำถาม และกำหนดวันสิ้นสุด",
                ],
                [
                  "02",
                  "รวมทีม แล้วลงมือทำ",
                  "นักศึกษาเข้าสู่ระบบเพื่อดู Assignment และกลุ่มที่อาจารย์กำหนด",
                ],
                [
                  "03",
                  "แบ่งปันมุมมองที่มีคุณค่า",
                  "เปิดโหวต ให้คะแนน แล้วดูผลสรุปร่วมกัน",
                ],
              ].map((s) => (
                <div key={s[0]}>
                  <span>{s[0]}</span>
                  <h3>{s[1]}</h3>
                  <p>{s[2]}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="bottom-cta">
            <div>
              <h2>พร้อมเติบโตไปด้วยกันหรือยัง?</h2>
              <p>
                เริ่มต้น assignment แรก
                แล้วให้ทุกเสียงเป็นส่วนหนึ่งของการเรียนรู้
              </p>
            </div>
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={user ? onGoToApp : () => openModal("register")}
            >
              {user ? "ไปยังห้องเรียน" : "เริ่มต้นใช้งานฟรี"}
            </Button>
          </section>
        </main>
        <footer>
          <a href="#" className="wordmark">
            pair<span>wise</span>
            <i>✳</i>
          </a>
          <span>พื้นที่ของทุกเสียง เพื่อการเรียนรู้ที่ดีกว่า</span>
          <span>Made for learning, together.</span>
        </footer>
      </div>
    </div>
  );
}
