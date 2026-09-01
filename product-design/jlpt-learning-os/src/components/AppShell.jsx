import { useState } from "react";
import {
  BookOpenText, Brain, CalendarBlank, CaretDown, CaretLeft, ChartBar,
  ClockCounterClockwise, Database, Exam, Gear, Headphones, House, List,
  NotePencil, Notebook, PlayCircle, PuzzlePiece, ReadCvLogo, SidebarSimple,
  Target, UserCircle, WarningCircle, X,
} from "@phosphor-icons/react";

const nav = [
  { label: "今天", route: "today", icon: House },
  { label: "学习", icon: BookOpenText, children: [
    { label: "词汇", route: "vocabulary", icon: Notebook },
    { label: "语法", route: "grammar", icon: ReadCvLogo },
    { label: "听力", route: "listening", icon: Headphones },
    { label: "阅读", route: "reading", icon: BookOpenText },
    { label: "题型技巧", route: "question-types", icon: Target },
  ] },
  { label: "复习", icon: PlayCircle, children: [
    { label: "综合练习", route: "mixed", icon: PuzzlePiece },
    { label: "模拟试题", route: "mock-exams", icon: Exam },
    { label: "复习草稿", route: "drafts", icon: NotePencil },
  ] },
  { label: "计划", route: "plan", icon: CalendarBlank },
  { label: "记录", icon: ClockCounterClockwise, children: [
    { label: "Agent 同步", route: "captures", icon: NotePencil },
    { label: "练习历史", route: "history", icon: ClockCounterClockwise },
    { label: "错题", route: "mistakes", icon: WarningCircle },
  ] },
  { label: "学习记忆", route: "memory", icon: Database },
  { label: "数据", route: "data", icon: ChartBar },
  { label: "MCP 设置", route: "mcp", icon: Gear },
];

function NavItem({ item, route, compact, onNavigate }) {
  const Icon = item.icon;
  const active = item.route === route || item.children?.some((child) => child.route === route);
  if (item.children) {
    return (
      <div className={`nav-group ${active ? "is-open" : ""}`}>
        <div className="nav-parent"><Icon size={19} /><span>{item.label}</span><CaretDown size={14} /></div>
        {!compact ? <div className="nav-children">{item.children.map((child) => <NavItem key={child.route} item={child} route={route} compact={compact} onNavigate={onNavigate} />)}</div> : null}
      </div>
    );
  }
  return (
    <a className={`nav-link ${active ? "is-active" : ""}`} href={`#/${item.route}`} title={compact ? item.label : undefined} onClick={onNavigate}>
      <Icon size={19} weight={active ? "fill" : "regular"} /><span>{item.label}</span>
    </a>
  );
}

export function AppShell({ route, children, notify, focusMode = false }) {
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  if (focusMode) return <div className="focus-shell"><main>{children}</main></div>;
  return (
    <div className={`app-shell ${compact ? "sidebar-compact" : ""}`}>
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><BookOpenText size={23} weight="fill" /></div>
          <div className="brand-copy"><strong>JLPT N1</strong><span>高效学习・稳步通关</span></div>
          <button className="icon-button mobile-only" aria-label="关闭菜单" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        <nav className="side-nav" aria-label="主导航">
          {nav.map((item) => <NavItem key={item.route ?? item.label} item={item} route={route} compact={compact} onNavigate={() => setMobileOpen(false)} />)}
        </nav>
        <button className="collapse-button" onClick={() => setCompact((value) => !value)}><SidebarSimple size={19} /><span>{compact ? "展开侧栏" : "收起侧栏"}</span></button>
      </aside>
      {mobileOpen ? <button className="mobile-backdrop" aria-label="关闭菜单" onClick={() => setMobileOpen(false)} /> : null}
      <div className="app-main">
        <header className="utility-header">
          <button className="icon-button mobile-menu" aria-label="打开菜单" onClick={() => setMobileOpen(true)}><List size={22} /></button>
          <div className="system-status"><span className="status-dot" />MCP 连接正常</div>
          <span className="header-divider" />
          <button className="text-button" onClick={() => { window.location.hash = "/captures"; }}><NotePencil size={18} />待处理 <strong>3</strong></button>
          <div className="header-spacer" />
          <div className="profile-wrap">
            <button className="profile-button" onClick={() => setProfileOpen((value) => !value)}><span className="avatar">林</span><span><strong>林同学</strong><small>目标：JLPT N1</small></span><CaretDown size={14} /></button>
            {profileOpen ? <div className="profile-menu"><button onClick={() => notify("个人设置已打开（原型状态）")}><UserCircle size={18} />个人设置</button><button onClick={() => notify("学习偏好已打开（原型状态）")}><Brain size={18} />学习偏好</button><button onClick={() => notify("已退出原型账号")}><CaretLeft size={18} />退出账号</button></div> : null}
          </div>
        </header>
        <main className="page-stage">{children}</main>
      </div>
    </div>
  );
}
