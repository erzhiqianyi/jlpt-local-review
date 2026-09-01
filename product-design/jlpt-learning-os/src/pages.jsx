import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, ArrowsClockwise, BookOpenText, CalendarBlank, CaretDown, CaretRight, ChartBar,
  Check, CheckCircle, Circle, Clock, Code, Copy, Database, Eye, FileText, Funnel,
  Headphones, Info, LinkSimple, ListChecks, MagnifyingGlass, NotePencil, Pause, Play,
  PlayCircle, Plus, ShieldCheck, SlidersHorizontal, Target, Timer, TrendUp,
  WarningCircle, Waveform,
} from "@phosphor-icons/react";
import { grammarRows, historyRows, memoryRows, mockExams, vocabRows, week } from "./data";

function PageHeader({ eyebrow = "学习工作台", title, description, action, secondary }) {
  return (
    <header className="page-header">
      <div><div className="breadcrumbs">首页 <span>/</span> {eyebrow}</div><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>
      {action || secondary ? <div className="page-actions">{secondary}{action}</div> : null}
    </header>
  );
}

function Button({ children, onClick, variant = "primary", icon: Icon, disabled = false }) {
  return <button className={`button ${variant}`} onClick={onClick} disabled={disabled}>{Icon ? <Icon size={18} weight="fill" /> : null}{children}</button>;
}

function AgentProvenance({ compact = false, status = "Agent 提案 · 等待确认" }) {
  return (
    <div className={`agent-provenance ${compact ? "compact" : ""}`}>
      <div><FileText size={21} /><span><strong>{status}</strong><small>由 Codex Agent 通过 MCP 写回 · 基于 14 条学习记录 · 09:42</small></span></div>
      {!compact ? <a href="#/memory">查看提案依据 <ArrowRight size={15} /></a> : null}
    </div>
  );
}

function WeekStrip() {
  return <div className="week-strip">{week.map((item) => <div key={item.date} className={item.state}><span>{item.day}</span><strong>{item.date}</strong><i>{item.state === "done" ? <Check size={12} /> : null}</i></div>)}</div>;
}

const todayMemoryCards = [
  { kind: "语法", front: "～ざるを得ない", reading: "Vない形＋ざるを得ない", meaning: "不得不……；没有别的选择", detail: "用于客观条件迫使说话人采取某种行动，多见于正式表达。", example: "事情がここまで進んだ以上、計画を見直さざるを得ない。", source: "新完全マスター N1 文法" },
  { kind: "词汇", front: "纏う", reading: "まとう", meaning: "缠绕；披在身上", detail: "衣服、气氛或性质等像包裹一样附着在主体周围。", example: "彼女はショールを肩に纏って会場に入った。", source: "新完全マスター N1 語彙" },
  { kind: "词汇", front: "甚だしい", reading: "はなはだしい", meaning: "非常严重；程度显著", detail: "表示程度远超一般范围，常用于负面评价。", example: "今年は地域による気温差が甚だしい。", source: "N1 高频形容词" },
  { kind: "语法", front: "～にひきかえ", reading: "N／普通形＋にひきかえ", meaning: "与……相反；与……形成对照", detail: "比较两个性质或状态明显相反的对象。", example: "兄が活発なのにひきかえ、弟は物静かだ。", source: "新完全マスター N1 文法" },
];

const todayPlanTodos = [
  { id: "grammar", module: "文法", title: "第1课・时间关系", duration: 30, source: "新完全マスター N1 文法" },
  { id: "reading", module: "读解", title: "第1部・对比与换言", duration: 30, source: "新完全マスター N1 読解" },
  { id: "listening", module: "听解", title: "课题理解・行动与顺序", duration: 15, source: "新完全マスター N1 聴解" },
];

function TodayPage({ notify, navigate }) {
  const [completedTodos, setCompletedTodos] = useState([]);
  const toggleTodo = (id) => setCompletedTodos((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return (
    <div className="page page-today today-memory-page">
      <PageHeader eyebrow="今天" title={<>2026年9月1日 <span className="weekday-badge">周二</span></>} action={<div className="yesterday-sync"><FileText size={22} /><span><strong>昨日整理</strong><small>6 条新记录 · 已确认入库 · 06:00</small></span></div>} />

      <section className="today-session-strip">
        <span><CalendarBlank size={22} /><strong>今天</strong><small>约 28 分钟</small></span>
        <b>{completedTodos.length}<em>/27</em></b>
        <i><span style={{ width: `${Math.round((completedTodos.length / 27) * 100)}%` }} /></i>
        <span className="session-counts">记忆卡 16 · 待办 3 · 练习 8</span>
      </section>

      <div className="today-study-grid">
        <section className="memory-review-entry">
          <header>
            <div><span className="stage-number">1</span><span><strong>记忆卡复习</strong><small>共 16 张 · 词汇 12 · 语法 4</small></span></div>
            <span className="due-badge">今日到期</span>
          </header>
          <div className="review-entry-body">
            <div className="review-count"><strong>16</strong><span>张待复习</span></div>
            <dl><div><dt>词汇</dt><dd>12</dd></div><div><dt>语法</dt><dd>4</dd></div><div><dt>预计</dt><dd>8 分钟</dd></div></dl>
            <Button icon={Play} onClick={() => navigate("review")}>开始复习</Button>
          </div>
          <footer><span><ArrowsClockwise size={16} />按记忆程度自动安排下次日期</span><button onClick={() => notify("记忆卡筛选已打开")}>筛选 <SlidersHorizontal size={15} /></button></footer>
        </section>

        <aside className="today-todo-panel">
          <header><h2>今日待办</h2><strong>{completedTodos.length} / {todayPlanTodos.length}</strong></header>
          <div>{todayPlanTodos.map((task) => { const checked = completedTodos.includes(task.id); return <label className={checked ? "done" : ""} key={task.id}><input type="checkbox" checked={checked} onChange={() => toggleTodo(task.id)} /><span className="todo-check"><Check size={15} /></span><span><strong>{task.module}「{task.title}」</strong><small>来源：{task.source}</small></span><b>{task.duration} 分钟</b></label>; })}</div>
          <a href="#/plan">查看完整计划 <CaretRight size={16} /></a>
        </aside>
      </div>

      <section className="targeted-practice-row">
        <span className="stage-number secondary">2</span>
        <div><strong>针对题目练习 <em>已接收</em></strong><small>共 8 题 · 词汇 5 题 · 语法 3 题</small></div>
        <dl><div><dt>依据</dt><dd>昨日错题 6 条</dd></div><div><dt>来源</dt><dd>Codex Agent 通过 MCP 写回 · 已确认 · 08:10</dd></div></dl>
        <Button variant="secondary" onClick={() => navigate("mixed")}>查看练习</Button>
      </section>
    </div>
  );
}

function FocusedReviewPage({ notify, navigate }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = todayMemoryCards[cardIndex % todayMemoryCards.length];
  const reviewed = Math.min(16, cardIndex);
  const rateCard = (rating) => {
    setCardIndex((current) => Math.min(16, current + 1));
    setRevealed(false);
    notify(`${rating} · 已安排下次复习`);
  };
  if (reviewed >= 16) return <div className="focused-review-page"><header className="focused-review-topbar"><button onClick={() => navigate("today")}><ArrowLeft size={20} />返回今天</button><strong>记忆卡复习</strong><span>16 / 16</span></header><main className="review-complete"><CheckCircle size={42} weight="fill" /><h1>今日复习完成</h1><p>16 张记忆卡已更新下次复习日期。</p><Button onClick={() => navigate("today")}>返回今天</Button></main></div>;
  return (
    <div className="focused-review-page">
      <header className="focused-review-topbar">
        <button onClick={() => navigate("today")}><ArrowLeft size={20} />退出复习</button>
        <strong>记忆卡复习</strong>
        <span>{reviewed + 1} / 16</span>
      </header>
      <div className="focused-review-progress"><i style={{ width: `${(reviewed / 16) * 100}%` }} /></div>
      <main className="focused-review-main">
        <article className={`focused-card ${revealed ? "revealed" : ""}`}>
          <header><span>{card.kind}</span><small>今日到期</small></header>
          <div className="focused-card-content">
            <h1>{card.front}</h1>
            {revealed ? <div className="focused-answer"><strong>{card.reading}</strong><p>{card.meaning}</p><dl><div><dt>记忆点</dt><dd>{card.detail}</dd></div><div><dt>例句</dt><dd lang="ja">{card.example}</dd></div></dl></div> : <span className="focused-card-rule" />}
          </div>
          <footer><BookOpenText size={17} />来源：{card.source}</footer>
        </article>
        {!revealed ? <Button icon={Eye} onClick={() => setRevealed(true)}>显示答案</Button> : <div className="focused-ratings" aria-label="记忆程度"><button onClick={() => rateCard("忘记")}><ArrowsClockwise size={20} /><strong>忘记</strong><small>&lt; 10 分钟</small></button><button onClick={() => rateCard("困难")}><WarningCircle size={20} /><strong>困难</strong><small>10 分钟</small></button><button onClick={() => rateCard("记得")}><CheckCircle size={20} /><strong>记得</strong><small>3 天</small></button><button onClick={() => rateCard("简单")}><Target size={20} /><strong>简单</strong><small>7 天</small></button></div>}
      </main>
    </div>
  );
}

function LibraryPage({ kind, notify }) {
  const isVocab = kind === "词汇";
  const rows = isVocab ? vocabRows : grammarRows;
  const headers = isVocab ? ["词条", "读音", "含义", "单词本", "下次复习"] : ["语法", "接续格式", "核心含义", "使用场合", "状态"];
  const [query, setQuery] = useState("");
  const [notebook, setNotebook] = useState("全部单词本");
  const [activeTab, setActiveTab] = useState(isVocab ? "词条列表" : "语法列表");
  const tabs = [isVocab ? "词条列表" : "语法列表", "练习", "解析", "资料"];
  const notebooks = isVocab ? [...new Set(rows.map((row) => row[3]))] : [];
  const filtered = rows.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase()) && (!isVocab || notebook === "全部单词本" || row[3] === notebook));
  return <div className="page"><PageHeader eyebrow={`学习 / ${kind}`} title={`${kind}学习`} description={isVocab ? "词条、读音与单词本统一管理；可按来源词书筛选和安排复习。" : "先掌握接续格式与使用限制，再进入同类型题目练习。"} action={isVocab ? null : <Button icon={Play} onClick={() => notify(`${kind}专项练习已准备`)}>开始专项练习</Button>} secondary={<Button variant="secondary" icon={Plus} onClick={() => notify(`已打开${kind}记录表单`)}>添加记录</Button>} />
    <LearningTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
    {activeTab === tabs[0] ? <><LearningToolbar query={query} setQuery={setQuery} placeholder={isVocab ? "搜索词汇、读音、含义或单词本" : `搜索${kind}、读音或含义`} filterOptions={isVocab ? ["全部单词本", ...notebooks] : null} filterValue={notebook} onFilterChange={setNotebook} /><LearningTable rows={filtered} total={rows.length} headers={headers} notify={notify} summary={isVocab ? `显示 ${filtered.length} / ${rows.length} 条 · ${notebook}` : undefined} /><div className="detail-preview"><div><span className="eyebrow">今日重点</span><h2>{isVocab ? "纏う（まとう）" : "が早いか"}</h2><p>{isVocab ? "衣服、气氛或性质等像包裹一样附着在主体周围。" : "Vる＋が早いか：前项刚发生，后项立刻发生。多用于已经发生的客观事实。"}</p></div><div className="definition-grid"><span><small>{isVocab ? "所属单词本" : "考试提示"}</small>{isVocab ? "新完全マスター N1 語彙" : "不用于意志、命令、请求或邀请"}</span><span><small>日常表达</small>{isVocab ? "着る／身につける" : "～たらすぐ／～たとたん"}</span><span><small>下次复习</small>今天 19:30</span></div></div></> : <ModuleTabContent module={kind} tab={activeTab} notify={notify} />}
  </div>;
}

function LearningTabs({ tabs, active, onChange }) {
  return <div className="tab-row" role="tablist">{tabs.map((tab) => <button key={tab} role="tab" aria-selected={active === tab} className={active === tab ? "active" : ""} onClick={() => onChange(tab)}>{tab}</button>)}</div>;
}

function LearningToolbar({ query, setQuery, placeholder, filterOptions = null, filterValue, onFilterChange }) {
  return <div className="toolbar"><label className="search-field"><MagnifyingGlass size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} /></label>{filterOptions ? <label className="filter-select"><Funnel size={17} /><select aria-label="按单词本筛选" value={filterValue} onChange={(event) => onFilterChange(event.target.value)}>{filterOptions.map((option) => <option key={option}>{option}</option>)}</select><CaretDown size={14} /></label> : <button className="filter-button"><Funnel size={17} />全部状态<CaretDown size={14} /></button>}<button className="filter-button"><SlidersHorizontal size={17} />排序</button></div>;
}

function LearningTable({ rows, total, headers, notify, summary = `共 ${total} 条 · 今日到期 2 条` }) {
  return <section className="data-surface"><div className="surface-summary"><span>{summary}</span><small>最近同步 09:42</small></div><div className="data-table"><div className="table-row table-head">{headers.map((header) => <span key={header}>{header}</span>)}<span /></div>{rows.map((row) => <button className="table-row" key={row[0]} onClick={() => notify(`已打开「${row[0]}」详情`)}>{row.map((cell, index) => <span key={`${cell}-${index}`}><b>{index === 0 ? cell : null}</b>{index === 0 ? null : cell}</span>)}<span><CaretRight size={17} /></span></button>)}</div></section>;
}

function ModuleTabContent({ module, tab, notify }) {
  const content = {
    练习: [["今日推荐", `${module}弱项专项 · 10 题`, "依据近 7 天错题生成同题型练习"], ["继续练习", `${module}基础巩固 · 6/12`, "保留上次进度与作答证据"]],
    解析: [["最新解析", module === "语法" ? "が早いか：接续、语域与使用限制" : "高频错误与干扰项辨析", "基于最近一次练习记录"], ["对比复习", module === "语法" ? "～たとたん／～や否や" : "相近表达与适用范围", "预计 8 分钟"]],
    资料: [["教材", `新完全マスター${module} N1`, "已关联章节与页码"], ["个人资料", `${module}补充记录`, "由 Agent 同步后经确认保存"]],
  }[tab] || [];
  return <section className="learning-panel"><div className="surface-summary"><span>{tab} · {content.length} 项</span><small>学习记录可通过 MCP 提供给外部 Agent</small></div>{content.map(([label, title, meta]) => <button className="learning-panel-row" key={title} onClick={() => notify(`已打开「${title}」`)}><span className="eyebrow">{label}</span><span><strong>{title}</strong><small>{meta}</small></span><CaretRight size={17} /></button>)}</section>;
}

function ListeningPage({ notify }) {
  const [playing, setPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("材料列表");
  const [query, setQuery] = useState("");
  const rows = [["新完全マスター聴解・課題理解","教材 CD","课题理解","6 / 12","今天"],["会議の時間変更","个人音频","要点理解","已标记 3 处","今天"],["ニュース音声・働き方","本地音频","概要理解","未开始","9月2日"],["面接会話・質問への応答","本地音频","即时应答","8 / 10","9月3日"],["新完全マスター聴解・統合理解","教材 CD","综合理解","4 / 8","9月4日"]];
  const filtered = rows.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase()));
  return <div className="page"><PageHeader eyebrow="学习 / 听力" title="听力学习" description="材料、题型与跟读记录统一管理；练习证据用于安排下一次复习。" action={<Button icon={Play} onClick={() => setActiveTab("练习")}>开始专项练习</Button>} secondary={<Button variant="secondary" icon={Headphones} onClick={() => notify("已打开本地音频导入")}>导入音频</Button>} />
    <LearningTabs tabs={["材料列表","练习","解析","资料"]} active={activeTab} onChange={setActiveTab} />
    {activeTab === "材料列表" ? <><LearningToolbar query={query} setQuery={setQuery} placeholder="搜索材料、来源或听力题型" /><LearningTable rows={filtered} total={rows.length} headers={["材料","来源","题型","进度","下次练习"]} notify={notify} summary={`共 ${rows.length} 条 · 今日练习 2 条`} /><div className="detail-preview"><div><span className="eyebrow">今日重点</span><h2>即时应答</h2><p>先识别时态、敬语方向与说话人的态度，再判断最自然的即时回应。</p></div><div className="definition-grid"><span><small>考试提示</small>不要只匹配原句关键词</span><span><small>听觉信号</small>でも／じゃあ／そうですか</span><span><small>个人基准</small>当前 70% · 目标 85%</span><span><small>下次练习</small>今天 20:00</span></div></div></> : activeTab === "练习" ? <><div className="module-overview"><div><span>本周练习</span><strong>74 分钟</strong><small>比上周 +18 分钟</small></div><div><span>综合正确率</span><strong>78%</strong><small>个人基准 85%</small></div><div><span>重点题型</span><strong>即时应答</strong><small>近 20 题错 6 题</small></div></div><section className="audio-studio"><div className="audio-info"><span className="audio-icon"><Waveform size={25} /></span><div><small>今日跟读材料 · 01:42</small><h2>短对话：会議の時間変更</h2><p>目标：捕捉转折与最终决定，完成后记录理解难点。</p></div></div><button aria-label={playing ? "暂停音频" : "播放音频"} className="play-button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={22} weight="fill" /> : <Play size={22} weight="fill" />}</button><div className={`wave-track ${playing ? "playing" : ""}`}><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><span className="audio-time">{playing ? "00:38" : "00:00"} / 01:42</span></section><div className="two-column"><section className="list-section"><div className="section-title"><h2>题型练习</h2><button>查看全部</button></div>{[["课题理解","5 题","82%"],["要点理解","6 题","76%"],["概要理解","4 题","75%"],["即时应答","10 题","70%"]].map((row) => <button className="list-row" key={row[0]} onClick={() => notify(`${row[0]}练习已打开`)}><span><strong>{row[0]}</strong><small>{row[1]} · 最近 7 天</small></span><b>{row[2]}</b><CaretRight size={17} /></button>)}</section><section className="list-section"><div className="section-title"><h2>个人材料</h2><button>管理</button></div>{["新完全マスター聴解 CD-A 001","ニュース音声・働き方","面接会話・質問への応答"].map((title, index) => <button className="list-row" key={title}><span><strong>{title}</strong><small>{index === 0 ? "12 个标记 · 已完成 68%" : "本地音频 · 未完成"}</small></span><PlayCircle size={20} /><CaretRight size={17} /></button>)}</section></div></> : <ModuleTabContent module="听力" tab={activeTab} notify={notify} />}
  </div>;
}

function ReadingPage({ notify }) {
  const [furigana, setFurigana] = useState(true);
  const [activeTab, setActiveTab] = useState("文章列表");
  const [query, setQuery] = useState("");
  const [selectedChoice, setSelectedChoice] = useState(null);
  const rows = [["都市における「余白」の役割","内容理解（短文）","420 字","4:30","今天"],["働き方と余暇","内容理解（中文）","620 字","7:00","未开始"],["技術と判断","主张理解（长文）","980 字","11:00","复习"],["二つの案内を比較する","综合理解","720 字","8:00","已完成"],["図書館利用案内","信息检索","680 字","6:00","未开始"]];
  const filtered = rows.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase()));
  return <div className="page"><PageHeader eyebrow="学习 / 阅读" title="阅读学习" description="文章、题型与阅读记录统一管理；从列表进入专项练习与解析。" action={<Button icon={BookOpenText} onClick={() => setActiveTab("练习")}>开始专项练习</Button>} secondary={<Button variant="secondary" icon={Plus} onClick={() => notify("已打开文章导入")}>添加文章</Button>} />
    <LearningTabs tabs={["文章列表","练习","解析","资料"]} active={activeTab} onChange={setActiveTab} />
    {activeTab === "文章列表" ? <><LearningToolbar query={query} setQuery={setQuery} placeholder="搜索文章、题型或关键词" /><LearningTable rows={filtered} total={rows.length} headers={["文章","题型","长度","目标时间","状态"]} notify={notify} summary={`共 ${rows.length} 篇 · 今日练习 1 篇`} /><div className="detail-preview"><div><span className="eyebrow">今日重点</span><h2>都市における「余白」の役割</h2><p>短篇主张理解：训练从转折后内容定位作者评价，并控制选项范围。</p></div><div className="definition-grid"><span><small>考试提示</small>核心转折「しかし」</span><span><small>阅读策略</small>圈出反复出现的「余白」</span><span><small>个人记录</small>主张范围判断易过度推断</span><span><small>目标时间</small>4 分 30 秒</span></div></div></> : activeTab === "练习" ? <div className="reading-layout"><section className="reading-paper"><div className="paper-tools"><span>短篇理解 · N1</span><button className={furigana ? "active" : ""} onClick={() => setFurigana((value) => !value)}>ふりがな {furigana ? "ON" : "OFF"}</button></div><h2>都市における「余白」の役割</h2><p>効率を追い求める都市生活では、何も予定されていない時間や場所は、無駄として扱われがちである。しかし、そうした「余白」こそが、人の思考を整理し、新しい関係を生み出す契機になるのではないだろうか。</p><p>計画された便利さだけで街を満たすと、人は目的を持たずに立ち止まることが難しくなる。公園のベンチや小さな広場の価値は、利用率だけでは測れない。</p><div className="reading-question"><strong>筆者が最も言いたいことは何か。</strong>{["都市では効率を最優先にすべきだ。","用途を決めない空間にも独自の価値がある。","公園の利用率を正確に測る必要がある。","新しい関係は計画によって生まれる。"].map((choice, index) => <button className={selectedChoice === index ? "selected" : ""} aria-pressed={selectedChoice === index} onClick={() => setSelectedChoice(index)} key={choice}><span>{index + 1}</span>{choice}</button>)}</div></section><aside className="reading-rail"><h3>阅读策略</h3><ol><li><span>1</span>先找转折「しかし」</li><li><span>2</span>圈出反复出现的概念</li><li><span>3</span>比较结论与选项范围</li></ol><div className="timer-block"><Timer size={20} /><span><strong>建议 4:30</strong><small>当前 02:18</small></span></div><button onClick={() => notify("已保存「余白」为待整理词条")}><Plus size={17} />保存不懂的词</button></aside></div> : <ModuleTabContent module="阅读" tab={activeTab} notify={notify} />}
  </div>;
}

function QuestionTypesPage({ notify }) {
  const types = [["文字・語彙","漢字読み","先判断音读／训读，再看词中位置。","82%"],["文字・語彙","文脈規定","先确认搭配，再排除语义范围过宽的选项。","76%"],["文法","文の組み立て","固定保留选项顺序，先找接续锚点。","68%"],["読解","主張理解","注意转折后的评价与结论。","80%"],["聴解","即時応答","抓时态、敬语方向和语气。","70%"]];
  return <div className="page"><PageHeader eyebrow="学习 / 题型技巧" title="N1 题型技巧" description="官方题型结构与个人解题提示分开保存，便于持续修正。" action={<Button icon={NotePencil} onClick={() => notify("个人技巧编辑已打开")}>编辑个人技巧</Button>} />
    <section className="data-surface"><div className="surface-summary"><span>5 个重点题型 · 按近 30 天正确率排序</span><small>个人提示 4 条</small></div><div className="type-list">{types.map(([module,type,tip,rate]) => <button key={type} onClick={() => notify(`已打开「${type}」详情`)}><span className="type-module">{module}</span><span><strong>{type}</strong><small>{tip}</small></span><b>{rate}</b><CaretRight size={17} /></button>)}</div></section>
  </div>;
}

function MixedPage({ notify }) {
  const choices = ["並べられた", "並んでいる", "並べてある", "並べさせた"];
  const [answer, setAnswer] = useState(null);
  return <div className="page practice-page"><PageHeader eyebrow="复习 / 综合练习" title="今日综合复习" description="问题来自已确认的复习草稿；作答结果会写入个人学习记录。" action={<div className="question-count">第 3 题 / 15</div>} />
    <div className="practice-layout"><section className="question-card"><div className="question-meta"><span>文の文法 1</span><span>预计 45 秒</span></div><h2>次の文の（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。</h2><p className="japanese-question">会議室には、参加者の名前が書かれた資料が机の上に（　）。</p><div className="choice-list">{choices.map((choice, index) => <button className={answer === index ? "selected" : ""} onClick={() => setAnswer(index)} key={choice}><span>{index + 1}</span>{choice}</button>)}</div><div className="question-actions"><Button variant="secondary" onClick={() => notify("已标记稍后复习")}>稍后复习</Button><Button disabled={answer === null} onClick={() => notify(answer === 2 ? "回答正确：～てある 表示人为结果状态" : "已提交，请查看解析")}>确认答案</Button></div></section><aside className="practice-rail"><AgentProvenance compact status="已确认复习包" /><h3>为什么包含这道题</h3><p>你在「结果状态」类语法中连续错 2 次，本题用于区分「～ている」与「～てある」。</p><dl><div><dt>依据</dt><dd>近 7 天错题</dd></div><div><dt>题型</dt><dd>文の文法 1</dd></div><div><dt>下次复习</dt><dd>由本次结果决定</dd></div></dl><div className="question-map">{Array.from({ length: 15 }, (_, index) => <button key={index} className={index === 2 ? "current" : index < 2 ? "done" : ""}>{index + 1}</button>)}</div></aside></div>
  </div>;
}

function MockExamsPage({ notify }) {
  const [level, setLevel] = useState("全部");
  const exams = level === "全部" ? mockExams : mockExams.filter((exam) => exam.level === level);
  return <div className="page"><PageHeader eyebrow="复习 / 模拟试题" title="模拟试题" description="原创练习卷，覆盖 N1–N5；与官方真题分开标识。" action={<Button variant="secondary" icon={Info} onClick={() => notify("已打开考试说明")}>考试说明</Button>} />
    <div className="level-filter">{["全部","N1","N2","N3","N4","N5"].map((item) => <button className={level === item ? "active" : ""} onClick={() => setLevel(item)} key={item}>{item}</button>)}</div>
    <section className="exam-list"><div className="exam-head"><span>试卷</span><span>题数</span><span>建议时间</span><span>进度</span><span /></div>{exams.map((exam) => <div className="exam-row" key={`${exam.level}-${exam.title}`}><span><b>{exam.level}</b><span><strong>{exam.title}</strong><small>原创练习 · 含听力音频</small></span></span><span>{exam.questions} 题</span><span>{exam.minutes} 分钟</span><span><i><em style={{ width: `${exam.progress}%` }} /></i>{exam.progress}%</span><Button variant={exam.progress ? "secondary" : "ghost"} onClick={() => notify(`${exam.title}已打开`)}>{exam.progress === 100 ? "查看结果" : exam.progress ? "继续" : "开始"}</Button></div>)}</section>
  </div>;
}

function DraftsPage({ notify }) {
  const [approved, setApproved] = useState(false);
  return <div className="page"><PageHeader eyebrow="复习 / 复习草稿" title="复习草稿" description="外部 Agent 通过 MCP 写回的内容先在这里预览，经你确认后才进入题库与计划。" />
    <div className="draft-layout"><aside className="draft-list"><div className="draft-list-head"><strong>待确认 2</strong><button><Funnel size={16} /></button></div>{["8月31日・弱项针对复习","时间关系语法补充包","听力即时应答强化"].map((title,index) => <button className={index === 0 ? "active" : ""} key={title}><span><strong>{title}</strong><small>{index === 0 ? "今天 09:42 · 15 题" : `8月${30-index}日 · ${10+index} 题`}</small></span><span className={index === 2 ? "status confirmed" : "status"}>{index === 2 ? "已确认" : "待确认"}</span></button>)}</aside><section className="draft-detail"><AgentProvenance /><div className="draft-title"><div><span>目标</span><h2>补强汉字读音与时间关系语法</h2></div><div><span>预计用时</span><h2>32 分钟</h2></div></div>{[["汉字读取","6 题","近 7 天错题 6 题"],["语法「时间关系」","5 题","聊天记录 1 条・错题 3 题"],["听力即时应答","4 题","正确率低于个人基准"]].map((row,index) => <div className="draft-section" key={row[0]}><i>{index+1}</i><span><strong>{row[0]}</strong><small>{row[2]}</small></span><b>{row[1]}</b><CaretRight size={17} /></div>)}<label className="feedback-box"><span>给 Agent 的修改意见</span><textarea placeholder="例如：语法部分增加接续格式与日常表达对比……" /></label><div className="draft-actions"><Button variant="secondary" onClick={() => notify("修改意见已保存，等待外部 Agent 下次读取")}>要求调整</Button><Button onClick={() => { setApproved(true); notify("草稿已确认；Agent 可通过 MCP 读取处理上下文"); }}>{approved ? "已确认并交接" : "确认并交给 Agent"}</Button></div><p className="boundary-note"><ShieldCheck size={17} />网页未调用 AI。确认只会保存审批状态与 MCP 交接说明，不等于内容已入库。</p></section></div>
  </div>;
}

const DEFAULT_PLAN_BOOKS = [
  {
    id: "shin-kanzen-grammar", module: "文法", title: "新完全マスター N1 文法", source: "手动录入", pace: "每周 3 课",
    catalog: ["时间关系", "范围的开始与限度", "限定・非限定", "附加・并列", "相关・对应", "无关・排除", "例示・话题", "程度・比较", "选择・取舍", "主张・断定", "评价・感想", "可能・不可能", "难易・倾向", "状态・样子", "时间与场面", "原因・理由", "逆接・让步", "假定条件", "目的・手段", "敬语与书面表达"].map((title, index) => ({ title: `第${index + 1}课・${title}`, scope: `目录第 ${index + 1} 章`, focus: "整理接续格式、例句、语域与使用限制" })),
  },
  {
    id: "shin-kanzen-reading", module: "读解", title: "新完全マスター N1 読解", source: "手动录入", pace: "每周 3 技能",
    catalog: [
      ["第1部・对比与换言", "p.4–19", "标出对比词和换言线索"], ["第1部・比喻与疑问提示", "p.20–31", "抓住论点提示并写一句主旨"], ["第1部・因果关系", "p.32–43", "区分事实原因与作者判断"], ["第1部・指示词定位", "p.44–55", "还原指示词指向的范围"], ["第1部・主张与举例", "p.56–67", "区分核心结论与说明例子"], ["第1部・选项范围判断", "p.68–79", "排除绝对化和范围扩大的选项"], ["第2部・短文内容理解", "p.82–95", "在目标时间内完成 3 篇短文"], ["第2部・中文结构识别", "p.96–111", "先划分段落功能再定位答案"], ["第2部・长文主张理解", "p.112–129", "记录转折后的评价与结论"], ["第2部・抽象论说文", "p.130–145", "把抽象概念换写成一句白话"], ["第3部・综合理解", "p.148–163", "比较两篇文章的共同点与差异"], ["第3部・信息检索", "p.164–177", "先读条件，再扫描表格与通知"],
    ].map(([title, scope, focus]) => ({ title, scope, focus })),
  },
  {
    id: "shin-kanzen-listening", module: "听解", title: "新完全マスター N1 聴解", source: "手动录入", pace: "每周 2 单元",
    catalog: [
      ["课题理解・行动与顺序", "第1单元", "听清最终行动以及先后顺序"], ["课题理解・条件筛选", "第2单元", "记录人物、时间、地点和限制条件"], ["要点理解・原因", "第3单元", "锁定原因与最终决定"], ["要点理解・意见", "第4单元", "区分事实陈述和个人评价"], ["概要理解・主题", "第5单元", "判断整段话题和立场"], ["概要理解・主张", "第6单元", "捕捉转折、总结和强调表达"], ["即时应答・日常表达", "第7单元", "根据语气选择自然回应"], ["即时应答・敬语方向", "第8单元", "判断谁为谁实施动作"], ["综合理解・多人对话", "第9单元", "分别记录人物意见与最后决定"], ["综合理解・条件比较", "第10单元", "排除不满足条件的方案"],
    ].map(([title, scope, focus]) => ({ title, scope, focus })),
  },
];

function PlanPage({ notify }) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [phase, setPhase] = useState("foundation");
  const [completed, setCompleted] = useState([]);
  const [planBooks, setPlanBooks] = useState(() => {
    try { const saved = window.localStorage.getItem("jlpt-plan-books"); return saved ? JSON.parse(saved) : DEFAULT_PLAN_BOOKS; }
    catch { return DEFAULT_PLAN_BOOKS; }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [bookModule, setBookModule] = useState("文法");
  const [catalogText, setCatalogText] = useState("");
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  useEffect(() => { window.localStorage.setItem("jlpt-plan-books", JSON.stringify(planBooks)); }, [planBooks]);
  const phases = [
    { id: "foundation", index: "01", title: "教材基础", dates: "9/1–10/18", weeks: "7 周", note: `按目录推进 ${planBooks.length} 本教材` },
    { id: "intensive", index: "02", title: "强化训练", dates: "10/19–11/15", weeks: "4 周", note: "按错题类型限时补强" },
    { id: "mock", index: "03", title: "真题模拟", dates: "11/16–12/5", weeks: "3 周", note: "整套计时、复盘与二刷" },
  ];
  const phaseStart = { foundation: [9, 1], intensive: [10, 19], mock: [11, 16] };
  const phaseForDate = (month, day) => month === 9 || (month === 10 && day <= 18) ? "foundation" : month === 10 || (month === 11 && day <= 15) ? "intensive" : "mock";
  const weekForMonth = { 9: 1, 10: 6, 11: 10, 12: 14 };
  const dateSerial = (month, day) => Math.floor((Date.UTC(2026, month - 1, day) - Date.UTC(2026, 8, 1)) / 86400000);
  const foundationIndex = Math.max(0, Math.min(47, dateSerial(selectedMonth, selectedDay)));
  const addPlanBook = () => {
    const catalog = catalogText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const [title, scope, focus] = line.split(/[｜|\t]/).map((part) => part?.trim());
      return { title, scope: scope || `目录第 ${index + 1} 章`, focus: focus || "完成本章学习并记录错题与用时" };
    });
    if (!bookTitle.trim() || catalog.length === 0) { notify("请填写书名，并至少输入一个目录章节"); return; }
    setPlanBooks((items) => [...items, { id: `custom-${bookModule}-${items.length + 1}`, module: bookModule, title: bookTitle.trim(), source: "手动录入", pace: "按目录轮换", catalog }]);
    setBookTitle(""); setCatalogText("");
    notify(`已添加《${bookTitle.trim()}》及 ${catalog.length} 个目录章节`);
  };
  const books = planBooks.map((book) => {
    const sameModule = planBooks.filter((item) => item.module === book.module);
    const offset = sameModule.findIndex((item) => item.id === book.id);
    const visits = Math.max(0, Math.floor((foundationIndex - offset) / sameModule.length) + 1);
    const progress = Math.min(book.catalog.length, visits);
    return { ...book, kind: book.module, scope: `${book.catalog.length} 个目录章节 · ${book.source}`, target: book.pace, progress: `${progress} / ${book.catalog.length}章`, value: progress / book.catalog.length * 100 };
  });
  const durationForModule = { 文法: 30, 读解: 30, 听解: 15 };
  const foundationTasks = ["文法", "读解", "听解"].flatMap((module) => {
    const candidates = planBooks.filter((book) => book.module === module);
    if (candidates.length === 0) return [];
    const bookIndex = foundationIndex % candidates.length;
    const book = candidates[bookIndex];
    const visitIndex = Math.floor(foundationIndex / candidates.length);
    const unit = book.catalog[visitIndex % book.catalog.length];
    const round = Math.floor(visitIndex / book.catalog.length) + 1;
    return [{ id: `${book.id}-${foundationIndex}`, book: module, sourceTitle: book.title, title: `${unit.title}${round > 1 ? `・第${round}轮` : ""}`, reason: `${unit.scope} · ${unit.focus}`, duration: durationForModule[module] }];
  });
  const intensiveIndex = Math.max(0, dateSerial(selectedMonth, selectedDay) - dateSerial(10, 19));
  const intensiveThemes = [
    ["时间・条件表达", "短文主张理解", "课题理解"], ["限定・程度表达", "中文结构与指示词", "要点理解"],
    ["原因・逆接表达", "长文观点定位", "概要理解"], ["评价・断定表达", "综合理解", "即时应答"],
    ["敬语・书面表达", "信息检索", "综合理解"],
  ];
  const intensiveTheme = intensiveThemes[intensiveIndex % intensiveThemes.length];
  const intensiveRound = Math.floor(intensiveIndex / intensiveThemes.length) + 1;
  const intensiveTasks = [
    { id: `ig-${intensiveIndex}`, book: "文法强化", title: `${intensiveTheme[0]}・第${intensiveRound}轮限时`, reason: "完成形式判断与句子重组各一组；按接续、语义或语域标记错因。", duration: 30 },
    { id: `ir-${intensiveIndex}`, book: "读解强化", title: `${intensiveTheme[1]}・限时训练`, reason: "记录定位时间、超时位置与两个最犹豫的选项，并在结束后复盘。", duration: 35 },
    { id: `il-${intensiveIndex}`, book: "听解强化", title: `${intensiveTheme[2]}・错题二刷`, reason: "先按正式速度作答，再复听错题；记录漏听词、转折和最终决定。", duration: 25 },
  ];
  const dateKey = `${selectedMonth}-${selectedDay}`;
  const mockDates = ["11-16", "11-23", "11-29"];
  const reviewDates = ["11-17", "11-24", "11-30"];
  const mockIndex = Math.max(0, dateSerial(selectedMonth, selectedDay) - dateSerial(11, 16));
  const weakRotation = [["文法接续与句子重组", "读解长文超时", "听解即时应答"], ["词汇语境与近义词", "读解综合理解", "听解概要理解"], ["文法语域与限制", "读解信息检索", "听解课题理解"]][mockIndex % 3];
  const mockTasks = mockDates.includes(dateKey) ? [
    { id: `mock-main-${dateKey}`, book: "整套模拟", title: `第 ${mockDates.indexOf(dateKey) + 1} 次・言语知识与读解`, reason: "使用你持有的真题或官方样题，连续完成 110 分钟，不中途查词。", duration: 110 },
    { id: `mock-listening-${dateKey}`, book: "整套模拟", title: `第 ${mockDates.indexOf(dateKey) + 1} 次・听解`, reason: "按正式节奏完成 55 分钟；只记录题号与把握度，不暂停音频。", duration: 55 },
    { id: `mock-mark-${dateKey}`, book: "快速标记", title: "标记超时、猜测与失分题", reason: "当天只做快速标记，详细错因分析安排在次日。", duration: 20 },
  ] : reviewDates.includes(dateKey) ? [
    { id: `review-data-${dateKey}`, book: "模拟复盘", title: "按科目拆分耗时与正确率", reason: "整理言语知识、读解与听解的正确率，标出超时区间和低把握题。", duration: 25 },
    { id: `review-errors-${dateKey}`, book: "错因分析", title: "逐题判断知识、定位或听取错误", reason: "每道错题只选择一个主要错因，并保存原题型与依据。", duration: 35 },
    { id: `review-remedy-${dateKey}`, book: "补强清单", title: "生成三科同题型二刷清单", reason: "文法、读解、听解各选择最弱题型，安排未来三天复习。", duration: 20 },
  ] : [
    { id: `weak-g-${dateKey}`, book: "言语知识", title: weakRotation[0], reason: "只复习模拟结果暴露的高频错误，不扩充新的知识范围。", duration: 25 },
    { id: `weak-r-${dateKey}`, book: "读解", title: weakRotation[1], reason: "完成 2–3 道同题型题，比较定位速度和选项排除依据。", duration: 30 },
    { id: `weak-l-${dateKey}`, book: "听解", title: weakRotation[2], reason: "完成一组同题型训练，复听仅限错题与低把握题。", duration: 20 },
  ];
  const currentPhase = phaseForDate(selectedMonth, selectedDay);
  const tasks = currentPhase === "foundation" ? foundationTasks : currentPhase === "intensive" ? intensiveTasks : mockTasks;
  const doneCount = tasks.filter((task) => completed.includes(`${selectedMonth}-${selectedDay}-${task.id}`)).length;
  const doneMinutes = tasks.filter((task) => completed.includes(`${selectedMonth}-${selectedDay}-${task.id}`)).reduce((sum, task) => sum + task.duration, 0);
  const toggleTask = (task) => {
    const key = `${selectedMonth}-${selectedDay}-${task.id}`;
    setCompleted((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]);
  };
  const monthNames = { 9: "9月", 10: "10月", 11: "11月", 12: "12月" };
  const monthLengths = { 9: 30, 10: 31, 11: 30, 12: 31 };
  const monthOffsets = { 9: 1, 10: 3, 11: 6, 12: 1 };
  const rawCells = [...Array(monthOffsets[selectedMonth]).fill(null), ...Array.from({ length: monthLengths[selectedMonth] }, (_, index) => index + 1)];
  const monthCells = [...rawCells, ...Array((7 - rawCells.length % 7) % 7).fill(null)];
  const changeMonth = (delta) => {
    const nextMonth = Math.max(9, Math.min(12, selectedMonth + delta));
    setSelectedMonth(nextMonth);
    setSelectedDay(1);
    setPhase(phaseForDate(nextMonth, 1));
  };
  const phaseName = currentPhase === "foundation" ? "教材基础" : currentPhase === "intensive" ? "强化训练" : "真题模拟";
  const dayTitle = currentPhase === "foundation" ? (selectedMonth === 9 && selectedDay === 1 ? "计划开始日" : "教材任务") : currentPhase === "intensive" ? "弱项强化" : "真题节奏训练";
  const totalMinutes = tasks.reduce((sum, task) => sum + task.duration, 0);
  return <div className="page plan-page focus-first-plan"><PageHeader eyebrow="计划 / 2026年12月 N1" title="学习计划" action={<Button icon={Play} onClick={() => notify(`已开始「${tasks[0]?.title || "今日任务"}」`)}>开始今天学习</Button>} secondary={<Button variant="secondary" icon={SlidersHorizontal} onClick={() => setSettingsOpen((value) => !value)}>{settingsOpen ? "收起设置" : "计划设置"}</Button>} />
    <section className="plan-focus-banner"><div><span className="eyebrow">今日</span><h2>{monthNames[selectedMonth]}{selectedDay}日 · {dayTitle}</h2></div><div className="plan-focus-metrics"><span><small>当前阶段</small><strong>{phaseName}</strong></span><span><small>预计用时</small><strong>{totalMinutes} 分钟</strong></span><span><small>完成进度</small><strong>{doneCount} / {tasks.length}</strong></span></div><button className="plan-detail-toggle" aria-expanded={showPlanDetails} onClick={() => setShowPlanDetails((value) => !value)}>{showPlanDetails ? "收起全周期" : "查看全周期与教材"}<CaretDown size={15} /></button></section>
    {settingsOpen ? <section className="plan-source-manager"><header><div><span className="eyebrow">计划设置</span><h2>教材与目录</h2></div><span>{planBooks.length} 本教材 · {planBooks.reduce((sum, book) => sum + book.catalog.length, 0)} 个章节</span></header><div className="source-manager-grid"><div className="source-book-list">{planBooks.map((book) => <div key={book.id}><span>{book.module}</span><strong>{book.title}</strong><small>{book.catalog.length} 章 · {book.source}</small></div>)}</div><div className="source-book-form"><label><span>科目</span><select value={bookModule} onChange={(event) => setBookModule(event.target.value)}><option>文法</option><option>读解</option><option>听解</option></select></label><label><span>书名</span><input value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} placeholder="例如：日本語総まとめ N1 読解" /></label><label className="catalog-field"><span>目录章节</span><textarea value={catalogText} onChange={(event) => setCatalogText(event.target.value)} placeholder={"每行一个章节\n第1周｜p.8–15｜掌握文章结构\n第2周｜p.16–23｜完成短文练习"} /></label><div><small>章节名｜页码或范围｜学习重点</small><Button icon={Plus} onClick={addPlanBook}>添加教材并重排</Button></div></div></div><footer><ShieldCheck size={16} />MCP 同步 · 写入需确认</footer></section> : null}
    {showPlanDetails ? <section className="plan-details-drawer"><section className="exam-roadmap"><header><div><span className="eyebrow">目标考试</span><strong>2026年12月6日（日）</strong></div><div className="exam-countdown"><b>97</b><span>天后考试<br />当前查看 · 第 {weekForMonth[selectedMonth]} / 14 周</span></div></header><div className="phase-switcher">{phases.map((item) => <button className={phase === item.id ? "active" : ""} onClick={() => { const [month, day] = phaseStart[item.id]; setPhase(item.id); setSelectedMonth(month); setSelectedDay(day); }} key={item.id}><i>{item.index}</i><span><strong>{item.title}</strong><small>{item.dates} · {item.weeks}</small><em>{item.note}</em></span></button>)}</div></section><section className="book-plan-strip"><div className="section-title"><div><span>教材来源</span><h2>{books.length} 本教材的目录路线</h2></div><button className="inline-action" onClick={() => setSettingsOpen(true)}><Plus size={15} />添加教材</button></div><div className="book-plan-grid">{books.map((book) => <article key={book.id}><header><span>{book.kind}</span><b>{book.progress}</b></header><strong>{book.title}</strong><p>{book.scope}</p><div className="book-progress"><i><em style={{ width: `${book.value}%` }} /></i><small>{book.target}</small></div></article>)}</div></section></section> : null}
    <div className="plan-layout focus-plan-layout"><section className="mini-calendar"><div className="calendar-head"><button aria-label="上个月" disabled={selectedMonth === 9} onClick={() => changeMonth(-1)}>‹</button><strong>2026年{monthNames[selectedMonth]}</strong><button aria-label="下个月" disabled={selectedMonth === 12} onClick={() => changeMonth(1)}>›</button></div><div className="calendar-week">{["一","二","三","四","五","六","日"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{monthCells.map((day,index) => day ? <button key={day} className={`${day===selectedDay?"selected":""} has-work ${phaseForDate(selectedMonth,day) === "intensive" ? "intensive-day" : ""} ${phaseForDate(selectedMonth,day) === "mock" ? "mock-day" : ""}`} onClick={() => { setSelectedDay(day); setPhase(phaseForDate(selectedMonth, day)); }}>{day}</button> : <span key={`blank-${index}`} />)}</div><div className="calendar-legend"><span><i />教材日</span><span><i className="intensive" />强化日</span><span><i className="mock" />模拟期</span></div><div className="week-rhythm"><strong>{phaseName} · 第{weekForMonth[selectedMonth]}周</strong></div></section>
      <section className="day-plan focused-day-plan"><div className="section-title"><div><span>今日任务</span><h2>{monthNames[selectedMonth]}{selectedDay}日 · {dayTitle}</h2></div><b>{totalMinutes} 分钟</b></div>{tasks.map((task, index) => { const checked = completed.includes(`${selectedMonth}-${selectedDay}-${task.id}`); return <label className={`plan-task textbook-task ${index === 0 && !checked ? "next-task" : ""}`} key={task.id}><input type="checkbox" checked={checked} onChange={() => toggleTask(task)} /><span className="check-box"><Check size={14} /></span><span><small className="task-source">{index === 0 && !checked ? `下一项 · ${task.book}` : task.book}</small><strong>{task.title}</strong><small>{task.reason}</small>{task.sourceTitle ? <small className="task-origin"><BookOpenText size={13} />来源：{task.sourceTitle}</small> : null}</span><b>{task.duration} 分钟</b></label>; })}<div className="today-proof-strip"><span><small>已完成</small><strong>{doneCount} / {tasks.length}</strong></span><span><small>有效用时</small><strong>{doneMinutes} 分钟</strong></span><span><small>当前阶段</small><strong>{phaseName}</strong></span></div><AgentProvenance compact status={currentPhase === "foundation" ? "教材计划" : currentPhase === "intensive" ? "强化计划" : "模拟计划"} /><Button onClick={() => notify("当天学习计划已确认")}>确认当天计划</Button></section></div>
    <details className="late-plan-details"><summary>后期强化与真题模拟安排 <span>10/19–12/5</span></summary><div><ol className="late-stage-list"><li><b>10/19–11/15</b><span>每周 3 次分项限时训练；错题按题型二刷。</span></li><li><b>11/16、11/23、11/29</b><span>三次整套真题规格模拟，严格计时。</span></li><li><b>模拟次日</b><span>分析耗时、失分原因，并生成同类补强清单。</span></li><li><b>12/1–12/5</b><span>高频错题、语法接续、听力信号词。</span></li></ol><p className="subtle-box">题源 · 自有真题 / 官方样题</p></div></details>
  </div>;
}

function CapturesPage({ notify }) {
  const [confirmed, setConfirmed] = useState(false);
  const records = [
    ["时间关系语法的区别", "待确认", "Codex · 09:19"],
    ["年々为什么读ねんねん", "已入库", "Codex · 08:40"],
    ["听力态度判断没有听懂", "待确认", "Claude · 昨天"],
    ["にひきかえ的接续形式", "同步失败", "Codex · 8月30日"],
  ];
  return <div className="page agent-sync-page"><PageHeader eyebrow="记录 / Agent 同步" title="Agent 学习总结" description="你在 Codex 等外部 Agent 中直接对话并即时获得答案；本页只接收 Agent 通过 MCP 推送的学习总结。" action={<div className="chat-connection"><span className="status-dot" /><span><strong>MCP 接收正常</strong><small>最近推送 · Codex 09:19</small></span></div>} />
    <div className="agent-sync-layout">
      <aside className="sync-record-list"><div className="thread-list-head"><strong>同步记录</strong><button aria-label="刷新同步记录" onClick={() => notify("已检查最新 Agent 推送")}><ArrowsClockwise size={17} /></button></div>{records.map((record,index) => <button className={index === 0 ? "active" : ""} key={record[0]}><span><strong>{record[0]}</strong><small>{record[2]}</small></span><em className={`status ${record[1] === "已入库" ? "confirmed" : ""}`}>{record[1]}</em></button>)}</aside>
      <section className="sync-summary-detail">
        <header className="conversation-head"><div><strong>时间关系语法的区别</strong><small>来源：Codex 对话 · thread jlpt-chat-0831-0914</small></div><button onClick={() => notify("来源对话链接已复制，可回到 Codex 继续交流")}><LinkSimple size={16} />复制来源链接</button></header>
        <div className="summary-content">
          <div className="summary-source-banner"><Code size={21} /><span><strong>答案已在 Codex 中即时给出</strong><small>这里不显示聊天输入框，也不调用 AI；仅保存对后续复习有用的结构化结果。</small></span></div>
          <section className="summary-section"><span className="eyebrow">本次提问</span><blockquote>「が早いか」「や否や」「そばから」前面分别接什么形式？语气和使用场景有什么区别？</blockquote></section>
          <section className="summary-section"><span className="eyebrow">Agent 推送的学习总结</span><h2>时间关系表达：一次紧接与反复发生</h2><dl><div><dt>接续</dt><dd>「Vる＋が早いか／や否や」；「Vる・Vた＋そばから」。</dd></div><div><dt>核心区别</dt><dd>前两者描述一次性的紧接事件；「そばから」表示同一情况反复发生，常带困扰或无奈。</dd></div><div><dt>语域</dt><dd>「や否や」最书面；日常表达优先使用「～たらすぐ」「～たとたん」。</dd></div><div><dt>使用限制</dt><dd>多叙述已经发生的事实，后项通常不用意志、命令或请求。</dd></div></dl></section>
          <section className="summary-section compact-summary"><span className="eyebrow">建议沉淀</span><div className="summary-tags"><span>语法规则</span><span>N1</span><span>时间关系</span><span>语域对比</span></div><p>加入学习记忆，并在下次语法复习中生成 3 道同类辨析题。</p></section>
        </div>
        <footer className="sync-review-actions"><span><ShieldCheck size={17} />Agent 只能推送草稿；正式进入学习记忆仍由你确认。</span><div><Button variant="ghost" onClick={() => notify("已忽略此总结")}>忽略</Button><Button variant="secondary" onClick={() => notify("已进入总结编辑状态")}>编辑总结</Button><Button onClick={() => { setConfirmed(true); notify("总结已确认并写入学习记忆"); }}>{confirmed ? "已写入学习记忆" : "确认入库"}</Button></div></footer>
      </section>
      <aside className="conversation-rail sync-process-rail">
        <section><h3>实际工作方式</h3>{[["1","在 Codex 中提问","即时回答"],["2","对话结束后整理","Agent 完成"],["3","通过 MCP 推送总结","09:19"],["4","系统等待你确认","当前"]].map((step) => <div className="sync-step" key={step[0]}><i>{step[0]}</i><span><strong>{step[1]}</strong><small>{step[2]}</small></span><Check size={14} /></div>)}<p className="boundary-note"><ShieldCheck size={17} />学习系统不内置 AI，也不承载对话；它是记录、审核、复习与长期记忆层。</p></section>
        <section className="scope-note"><h3>本次写回</h3><dl><div><dt>来源 Agent</dt><dd>Codex</dd></div><div><dt>写回类型</dt><dd>学习总结草稿</dd></div><div><dt>关联记录</dt><dd>错题 3 条</dd></div><div><dt>后续用途</dt><dd>记忆＋复习题</dd></div></dl></section>
      </aside>
    </div>
  </div>;
}

function HistoryPage({ notify }) {
  return <div className="page"><PageHeader eyebrow="记录 / 练习历史" title="练习历史" description="按时间查看练习结果、用时与后续复习建议。" action={<Button variant="secondary" icon={ChartBar} onClick={() => notify("历史趋势已打开")}>查看趋势</Button>} />
    <div className="history-summary"><div><span>近 7 天练习</span><strong>9 次</strong></div><div><span>累计用时</span><strong>2小时 48分</strong></div><div><span>平均正确率</span><strong>78%</strong></div><div><span>连续学习</span><strong>6 天</strong></div></div><section className="data-surface"><div className="data-table history-table"><div className="table-row table-head">{["时间","练习内容","得分","用时","模块",""].map((header,index) => <span key={`${header}-${index}`}>{header}</span>)}</div>{historyRows.map((row) => <button className="table-row" key={row[0]} onClick={() => notify(`${row[1]}练习详情已打开`)}>{row.map((cell,index) => <span key={`${cell}-${index}`}><b>{index===1?cell:null}</b>{index===1?null:cell}</span>)}<span><CaretRight size={17} /></span></button>)}</div></section>
  </div>;
}

function MistakesPage({ notify }) {
  const mistakes = [["年々","漢字読み","选择了「としどし」","今天复习"],["～てある","文の文法 1","与「～ている」混淆","今天复习"],["が早いか","文脈規定","忽略后项的突发性","9月1日"],["主張理解","聴解","未捕捉「ただし」后的修正","9月2日"]];
  return <div className="page"><PageHeader eyebrow="记录 / 错题" title="错题与薄弱点" description="错题保留原始选项顺序与作答证据，用于生成同类型复习。" action={<Button icon={Play} onClick={() => notify("同类型错题复习已开始")}>练习同类型题</Button>} /><div className="mistake-layout"><section className="mistake-list">{mistakes.map(([title,type,reason,due],index) => <button className={index===0?"active":""} key={title}><span className="mistake-index">{index+1}</span><span><strong>{title}</strong><small>{type} · {reason}</small></span><b>{due}</b><CaretRight size={17} /></button>)}</section><aside className="mistake-detail"><span className="eyebrow">错题详情</span><h2>「年々」的读音</h2><p className="japanese-question">近年、この地域を訪れる観光客は年々増えている。</p><dl><div><dt>你的答案</dt><dd className="wrong">としどし</dd></div><div><dt>正确答案</dt><dd className="right">ねんねん</dd></div><div><dt>错误原因</dt><dd>将熟字训式读法误用于固定副词。</dd></div></dl><div className="memory-tip"><strong>记忆点</strong><p>「年々」读作「ねんねん」，常与「増える／減る／変化する」搭配。</p></div><Button variant="secondary" onClick={() => notify("已标记为已理解")}>标记已理解</Button></aside></div></div>;
}

function MemoryPage({ notify }) {
  const [selected, setSelected] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const item = memoryRows[selected];
  return <div className="page"><PageHeader eyebrow="学习记忆" title="学习记忆" description="把聊天、错题与随手记录整理成可复用、可追溯的个人学习证据。" action={<Button icon={Database} onClick={() => notify("已生成 MCP 整理说明，等待外部 Agent 读取")}>整理待处理记录</Button>} />
    <div className="memory-layout"><section className="memory-list"><div className="surface-summary"><span>12 条记忆 · 1 条待确认</span><button><Funnel size={16} />筛选</button></div>{memoryRows.map((row,index) => <button className={selected===index?"active":""} key={row.title} onClick={() => { setSelected(index); setConfirmed(false); }}><span className="memory-kind">{row.kind}</span><span><strong>{row.title}</strong><small>{row.source} · {row.date}</small></span><span className={`status ${row.status === "已确认" || (index === 0 && confirmed) ? "confirmed" : ""}`}>{index===0&&confirmed?"已确认":row.status}</span></button>)}</section><section className="memory-detail"><div className="memory-detail-head"><div><span className="eyebrow">{item.kind}</span><h2>{item.title}</h2></div><span className={`status ${item.status === "已确认" || confirmed ? "confirmed" : ""}`}>{confirmed?"已确认":item.status}</span></div><div className="lineage"><div className="active"><i>1</i><span>原始记录</span></div><b /><div><i>2</i><span>结构化记忆</span></div><b /><div><i>3</i><span>关联薄弱点</span></div><b /><div><i>4</i><span>复习用途</span></div></div><section className="memory-block"><header><strong>原始证据</strong><a>查看来源</a></header><p>来源：{item.source} · 2026-08-31 09:14</p><blockquote>「が早いか」と「や否や」は日常でも使えますか。前面接什么词，用什么格式？</blockquote></section><section className="memory-block"><header><strong>Agent 提出的结构</strong><span>grammar.propose v1</span></header><dl><div><dt>规则</dt><dd>两者接动词辞书形，表示前项发生后，后项紧接发生。</dd></div><div><dt>限制</dt><dd>多叙述已经发生的事实；一般不用于意志、命令、请求。</dd></div><div><dt>语域</dt><dd>「や否や」更强调、更书面；日常常用「～たらすぐ」。</dd></div><div><dt>复习用途</dt><dd>{item.use}</dd></div></dl></section><div className="provenance-grid"><span><small>证据</small>{item.evidence}</span><span><small>存储</small>本地 SQLite</span><span><small>MCP 工具</small>grammar.propose</span><span><small>同步时间</small>09:28:15</span></div><div className="memory-actions"><Button variant="secondary" onClick={() => notify("修改意见已保存")}>修改后确认</Button><Button variant="ghost" onClick={() => notify("已拒绝此结构")}>拒绝</Button><Button onClick={() => { setConfirmed(true); notify("学习记忆已确认入库"); }}>确认入库</Button></div><p className="boundary-note"><ShieldCheck size={17} />网页不会直接调用 AI；确认后由外部 Agent 通过 MCP 写入。</p></section></div>
  </div>;
}

function DataPage() {
  return <div className="page"><PageHeader eyebrow="数据" title="学习数据" description="从练习、计划与记忆中观察趋势；数据仅用于你的本地学习。" /><div className="data-kpis"><div><span>近 30 天学习</span><strong>18.4 小时</strong><small><TrendUp size={15} />较上月 +12%</small></div><div><span>完成练习</span><strong>286 题</strong><small>正确率 78%</small></div><div><span>到期复习</span><strong>24 条</strong><small>词汇 14 · 语法 10</small></div><div><span>已确认记忆</span><strong>42 条</strong><small>本月新增 9 条</small></div></div><div className="analytics-grid"><section className="chart-section"><div className="section-title"><h2>近 14 天正确率</h2><button>全部模块<CaretDown size={14} /></button></div><div className="bar-chart">{[62,74,68,81,76,84,79,88,72,78,82,86,80,84].map((value,index) => <div key={index}><i style={{height:`${value}%`}} /><span>{index%2===0?`${index+18}`:""}</span></div>)}</div></section><section className="list-section"><div className="section-title"><h2>模块表现</h2></div>{[["词汇","82%","+4%"],["语法","74%","+1%"],["听力","72%","-3%"],["阅读","80%","+6%"]].map((row) => <div className="metric-row" key={row[0]}><span>{row[0]}</span><i><em style={{width:row[1]}} /></i><strong>{row[1]}</strong><small className={row[2].startsWith("-")?"down":""}>{row[2]}</small></div>)}</section><section className="list-section"><div className="section-title"><h2>薄弱题型</h2><button>查看依据</button></div>{[["漢字読み","近 20 题错 6 题"],["文の組み立て","近 12 题错 5 题"],["即時応答","正确率 70%"]].map((row,index) => <div className="weak-row" key={row[0]}><b>{index+1}</b><span><strong>{row[0]}</strong><small>{row[1]}</small></span><button>生成同类型复习说明</button></div>)}</section><section className="list-section"><div className="section-title"><h2>存储概况</h2></div><dl className="storage-list"><div><dt>学习记录</dt><dd>1,248 条</dd></div><div><dt>复习条目</dt><dd>386 条</dd></div><div><dt>本地音频</dt><dd>28 个 · 614 MB</dd></div><div><dt>最后备份</dt><dd>今天 09:46</dd></div></dl></section></div></div>;
}

function McpPage({ notify }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { setCopied(true); notify("配置片段已复制"); };
  return <div className="page"><PageHeader eyebrow="MCP 设置" title="MCP 连接与权限" description="让外部 Agent 在明确范围内读取学习证据、提交草稿与写回已确认内容。" />
    <div className="mcp-status-banner"><span className="big-status"><CheckCircle size={27} weight="fill" /></span><div><strong>连接正常</strong><p>jlpt_review · STDIO · 最近活动 2026-08-31 09:42:18</p></div><Button variant="secondary" onClick={() => notify("连接检查通过")}>重新检查</Button></div><div className="mcp-layout"><section className="mcp-main"><h2>Agent 可访问的范围</h2>{[["读取学习记录","错题、练习历史、到期复习与计划证据",true],["提交复习草稿","写入草稿区，必须由用户确认",true],["写入学习记忆","仅限用户已确认的结构",true],["修改账号与登录","永不开放",false]].map(([title,desc,on]) => <div className="permission-row" key={title}><span className={on?"permission-icon on":"permission-icon"}>{on?<Check size={16}/>:<WarningCircle size={16}/>}</span><span><strong>{title}</strong><small>{desc}</small></span><b>{on?"允许":"禁止"}</b></div>)}<h2>最近 MCP 活动</h2>{[["09:42:18","get_plan_generation_context","读取 14 条学习证据"],["09:42:22","create_review_pack_draft","写回草稿：15 题"],["09:28:15","grammar.propose","提交学习记忆结构"],["08:41:09","list_due_reviews","读取 24 条到期复习"]].map((row) => <div className="activity-row" key={row[0]}><time>{row[0]}</time><code>{row[1]}</code><span>{row[2]}</span></div>)}</section><aside className="mcp-rail"><h3>项目配置</h3><p>将本地 MCP Server 添加到 Agent 工作区。</p><div className="code-block"><button onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>}</button><code>[mcp_servers.jlpt_review]{"\n"}command = &quot;node&quot;{"\n"}args = [&quot;server/mcp-server.mjs&quot;]</code></div><h3>数据边界</h3><ul><li>SQLite 是个人学习数据主存储</li><li>JSON 仅作为导出与备份格式</li><li>网页不持有 Agent 密钥</li><li>审批状态不等于内容已入库</li></ul><Button variant="secondary" icon={Code} onClick={() => notify("MCP 工具说明已打开")}>查看全部工具</Button></aside></div>
  </div>;
}

export const pageRegistry = {
  today: TodayPage,
  review: FocusedReviewPage,
  vocabulary: (props) => <LibraryPage {...props} kind="词汇" />,
  grammar: (props) => <LibraryPage {...props} kind="语法" />,
  listening: ListeningPage,
  reading: ReadingPage,
  "question-types": QuestionTypesPage,
  mixed: MixedPage,
  "mock-exams": MockExamsPage,
  drafts: DraftsPage,
  plan: PlanPage,
  captures: CapturesPage,
  history: HistoryPage,
  mistakes: MistakesPage,
  memory: MemoryPage,
  data: DataPage,
  mcp: McpPage,
};
