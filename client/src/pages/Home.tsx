/** KOTONOHA visual system: pale Qwen-inspired workspace, with local model controls and a spacious conversation canvas. */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Bot,
  Check,
  ChevronDown,
  Code2,
  Download,
  FileText,
  FolderPlus,
  Grid2X2,
  LoaderCircle,
  Maximize2,
  Menu,
  MessageSquarePlus,
  Mic,
  PanelLeftClose,
  Plus,
  Search,
  SendHorizontal,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { canUseWebGPU, createQwenEngine, DEFAULT_QWEN_MODEL, QWEN_MODELS, type QwenEngine } from "@/lib/qwenEngine";

type Message = { id: string; role: "assistant" | "user"; content: string };
type EngineState = "checking" | "ready-to-load" | "loading" | "ready" | "unsupported" | "error";
type ThinkingLevel = "fast" | "balanced" | "deep";

const HISTORY_KEY = "kotonoha-qwen-history-v2";
const SETTINGS_KEY = "kotonoha-qwen-settings-v2";
const SYSTEM_PROMPT = "あなたはKOTONOHAに搭載されたQwenです。ブラウザ内のWebGPUでローカル実行されています。日本語で誠実かつ簡潔に答えてください。最新の外部情報を知っているとは主張せず、事実が不明な場合は不明と明示してください。";
const THINKING: Record<ThinkingLevel, { label: string; title: string; description: string; maxTokens: number; temperature: number; enableThinking: boolean }> = {
  fast: { label: "即答", title: "即答", description: "思考モードなしで、短く素早く答えます", maxTokens: 256, temperature: 0.42, enableThinking: false },
  balanced: { label: "標準", title: "標準", description: "思考モードなしで、詳しさを保ちます", maxTokens: 512, temperature: 0.64, enableThinking: false },
  deep: { label: "じっくり", title: "じっくり", description: "Qwen3の思考モードで、より長く考えます", maxTokens: 1400, temperature: 0.72, enableThinking: true },
};

const welcomeMessage: Message = { id: "welcome", role: "assistant", content: "こんにちは。何を一緒に考えますか？" };
const makeId = () => `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function readHistory(): Message[] {
  try { const raw = window.localStorage.getItem(HISTORY_KEY); const parsed = raw ? (JSON.parse(raw) as Message[]) : null; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function readSettings() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      modelId: QWEN_MODELS.some((model) => model.id === saved.modelId) ? saved.modelId : DEFAULT_QWEN_MODEL,
      thinking: (["fast", "balanced", "deep"] as string[]).includes(saved.thinking) ? saved.thinking as ThinkingLevel : "balanced" as ThinkingLevel,
    };
  } catch { return { modelId: DEFAULT_QWEN_MODEL, thinking: "balanced" as ThinkingLevel }; }
}

export default function Home() {
  const initialSettings = useMemo(readSettings, []);
  const [messages, setMessages] = useState<Message[]>(readHistory);
  const [modelId, setModelId] = useState(initialSettings.modelId);
  const [thinking, setThinking] = useState<ThinkingLevel>(initialSettings.thinking);
  const [engineState, setEngineState] = useState<EngineState>("checking");
  const [progress, setProgress] = useState({ value: 0, text: "WebGPUを確認しています" });
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const engineRef = useRef<QwenEngine | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedModel = QWEN_MODELS.find((model) => model.id === modelId) || QWEN_MODELS[0];
  const activeThinking = THINKING[thinking];
  const hasConversation = messages.length > 0;

  useEffect(() => {
    let mounted = true;
    canUseWebGPU().then((supported) => {
      if (mounted) setEngineState(supported ? "ready-to-load" : "unsupported");
    });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(messages)); }, [messages]);
  useEffect(() => { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ modelId, thinking })); }, [modelId, thinking]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, isGenerating]);
  useEffect(() => () => { engineRef.current?.unload?.().catch(() => undefined); }, []);

  const chooseModel = async (nextId: string) => {
    if (nextId === modelId) { setShowModelMenu(false); return; }
    if (engineRef.current) { await engineRef.current.unload?.().catch(() => undefined); engineRef.current = null; }
    setModelId(nextId);
    setEngineState((await canUseWebGPU()) ? "ready-to-load" : "unsupported");
    setProgress({ value: 0, text: "選択したモデルを準備してください" });
    setShowModelMenu(false);
  };

  const loadModel = async () => {
    if (engineState === "loading" || engineState === "ready") return;
    if (!(await canUseWebGPU())) {
      setEngineState("unsupported");
      setProgress({ value: 0, text: "このブラウザではWebGPUアダプターを利用できません" });
      return;
    }
    setEngineState("loading");
    setProgress({ value: 0, text: `${selectedModel.label}を準備しています` });
    try {
      const engine = await createQwenEngine(modelId, (report) => setProgress({ value: Math.max(0, Math.min(1, report.progress)), text: report.text || "モデルを準備しています" }));
      engineRef.current = engine;
      setEngineState("ready");
      setProgress({ value: 1, text: `${selectedModel.label}の準備が完了しました` });
      textareaRef.current?.focus();
    } catch (error) {
      setEngineState("error");
      setProgress({ value: 0, text: error instanceof Error ? error.message : "モデルを読み込めませんでした" });
    }
  };

  const send = async () => {
    const prompt = draft.trim();
    if (!prompt || engineState !== "ready" || isGenerating || !engineRef.current) return;
    const userMessage: Message = { id: makeId(), role: "user", content: prompt };
    const replyId = makeId();
    const conversation = [...messages, userMessage];
    setMessages([...conversation, { id: replyId, role: "assistant", content: "" }]);
    setDraft(""); setIsGenerating(true);
    try {
      const requestMessages = [{ role: "system" as const, content: SYSTEM_PROMPT }, ...conversation.map((message) => ({ role: message.role, content: message.content }))];
      const stream = await engineRef.current.chat.completions.create({ messages: requestMessages, temperature: activeThinking.temperature, max_tokens: activeThinking.maxTokens, stream: true, extra_body: { enable_thinking: activeThinking.enableThinking } });
      let reply = "";
      for await (const chunk of stream) {
        reply += chunk.choices[0]?.delta?.content || "";
        setMessages((current) => current.map((message) => message.id === replyId ? { ...message, content: reply } : message));
      }
      if (!reply.trim()) throw new Error("モデルから応答を受け取れませんでした。");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "推論中に問題が発生しました。";
      setMessages((current) => current.map((message) => message.id === replyId ? { ...message, content: `応答を生成できませんでした。\n\n${reason}` } : message));
    } finally { setIsGenerating(false); textareaRef.current?.focus(); }
  };

  const startNewChat = () => { setMessages([]); setDraft(""); textareaRef.current?.focus(); };
  const useExample = (text: string) => { setDraft(text); textareaRef.current?.focus(); };
  const statusLabel = engineState === "ready" ? "準備完了" : engineState === "loading" ? `${Math.round(progress.value * 100)}%` : engineState === "unsupported" ? "WebGPU非対応" : engineState === "error" ? "再試行が必要" : "未準備";

  return (
    <div className="qwen-shell">
      <aside className="app-sidebar">
        <div className="brand-row"><div className="qwen-mark" aria-hidden="true"><i /><i /><i /></div><span>KOTONOHA</span><button className="sidebar-collapse" aria-label="サイドバーを閉じる"><PanelLeftClose size={18} /></button></div>
        <nav className="primary-nav" aria-label="メインナビゲーション"><button onClick={startNewChat}><MessageSquarePlus size={20} />新しいチャット</button><button><Search size={20} />チャットの検索</button><button><Grid2X2 size={19} />コミュニティ</button><button><Code2 size={19} />Coder</button></nav>
        <section className="sidebar-section"><div className="sidebar-section-title">プロジェクト <ChevronDown size={15} /></div><button className="project-button"><FolderPlus size={18} />新規プロジェクト</button></section>
        <section className="sidebar-section chats"><div className="sidebar-section-title">すべてのチャット <ChevronDown size={15} /></div><p>{hasConversation ? "現在のローカル対話" : "保存された会話はありません"}</p></section>
        <div className="sidebar-footer"><button className="privacy-link" onClick={() => setShowAbout(true)}><ShieldCheck size={16} />ローカル推論について</button><div className="user-chip"><span className="avatar">K</span><span>Local User</span><ChevronDown size={15} /></div></div>
      </aside>

      <main className="chat-stage">
        <div className="stage-card">
          <header className="stage-header">
            <div className="model-selector-wrap"><button className="model-selector" onClick={() => setShowModelMenu((value) => !value)} aria-expanded={showModelMenu}><Bot size={18} /><span>{selectedModel.label}</span><ChevronDown size={16} /></button>{showModelMenu && <div className="model-menu" role="menu">{QWEN_MODELS.map((model) => <button role="menuitem" className={model.id === modelId ? "active" : ""} key={model.id} onClick={() => chooseModel(model.id)}><span><strong>{model.label}</strong><small>{model.note}</small></span>{model.id === modelId && <Check size={16} />}</button>)}</div>}</div>
            <div className="stage-actions"><span className={`runtime-pill state-${engineState}`}><i />{statusLabel}</span><button aria-label="全画面表示"><Maximize2 size={20} /></button></div>
          </header>

          <div className={`conversation-canvas ${hasConversation ? "has-conversation" : ""}`}>
            {!hasConversation && <div className="welcome"><div className="welcome-orb"><Sparkles size={27} /></div><h1>何かお手伝いできますか？</h1><p>QwenはこのブラウザのWebGPUで動きます。</p></div>}
            {hasConversation && <div className="chat-log">{messages.map((message) => <article className={`chat-message ${message.role}`} key={message.id}><div className="message-avatar">{message.role === "assistant" ? <div className="qwen-mark mini"><i /><i /><i /></div> : "U"}</div><div className="message-bubble">{message.content ? message.content.split("\n").map((line, index) => <p key={`${message.id}-${index}`}>{line || " "}</p>) : <span className="typing"><i /><i /><i /></span>}</div></article>)}</div>}
            <div ref={endRef} />
          </div>

          <section className="composer-area" aria-label="Qwenに質問">
            {engineState !== "ready" && <div className={`load-banner banner-${engineState}`}><div className="load-icon">{engineState === "unsupported" || engineState === "error" ? <TriangleAlert size={18} /> : <Download size={18} />}</div><div><strong>{engineState === "unsupported" ? "この環境ではWebGPU推論を開始できません" : engineState === "error" ? "モデルを準備できませんでした" : engineState === "checking" ? "WebGPUの互換性を確認しています" : engineState === "loading" ? `${selectedModel.label}を準備しています` : `${selectedModel.label}をローカルに準備します`}</strong><p>{engineState === "unsupported" ? "WebGPUアダプターを検出できませんでした。対応GPUが有効なChromeまたはEdgeでお試しください。" : engineState === "checking" ? "利用可能なGPUアダプターを確認しています。" : engineState === "loading" ? progress.text : engineState === "error" ? progress.text : "この操作時だけモデルを取得します。以後の会話内容はクラウドへ送信しません。"}</p>{engineState === "loading" && <div className="progress-track"><span style={{ width: `${progress.value * 100}%` }} /></div>}</div>{engineState !== "unsupported" && <button onClick={loadModel} disabled={engineState === "loading"}>{engineState === "loading" ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}{engineState === "loading" ? "準備中" : engineState === "error" ? "再試行" : "モデルを準備"}</button>}</div>}
            <div className="composer"><button className="add-button" aria-label="添付オプション"><Plus size={25} /></button><textarea ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} disabled={engineState !== "ready" || isGenerating} placeholder={engineState === "ready" ? `${selectedModel.label}に質問` : "モデルを準備すると質問できます"} rows={1} /><div className="composer-tools"><div className="thinking-wrap"><button className="thinking-button" onClick={() => setShowSettings((value) => !value)}><SlidersHorizontal size={16} /><span>{activeThinking.label}</span><ChevronDown size={15} /></button>{showSettings && <div className="thinking-menu"><div className="thinking-menu-head"><span>回答スタイル</span><button onClick={() => setShowSettings(false)} aria-label="閉じる"><X size={15} /></button></div><p>出力トークン量とランダム性を調整します。長いほど回答に時間がかかります。</p>{(Object.entries(THINKING) as [ThinkingLevel, typeof THINKING[ThinkingLevel]][]).map(([key, option]) => <button className={thinking === key ? "selected" : ""} key={key} onClick={() => { setThinking(key); setShowSettings(false); }}><span><strong>{option.title}</strong><small>{option.description}</small></span><em>{option.maxTokens} tokens</em>{thinking === key && <Check size={15} />}</button>)}</div>}</div><button className="voice-button" aria-label="音声入力"><Mic size={20} /></button><button className="send-button" onClick={send} disabled={!draft.trim() || engineState !== "ready" || isGenerating} aria-label="送信"><SendHorizontal size={19} /></button></div></div>
            {engineState === "ready" && !hasConversation && <div className="example-row"><span>たとえば</span><button onClick={() => useExample("今日の作業を3つに整理して")}>今日の作業を3つに整理して</button><button onClick={() => useExample("この文章を簡潔に直して：")}>文章を簡潔に直して</button></div>}
            <p className="local-note"><ShieldCheck size={13} />モデル取得時のみ通信します。回答生成はこの端末のWebGPUで実行されます。</p>
          </section>
        </div>
      </main>

      {showAbout && <div className="modal-backdrop" onMouseDown={() => setShowAbout(false)}><section className="info-modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowAbout(false)} aria-label="閉じる"><X size={19} /></button><div className="modal-icon"><ShieldCheck size={23} /></div><p className="modal-kicker">LOCAL QWEN RUNTIME</p><h2 id="about-title">推論はブラウザ内で行います。</h2><p>モデルを準備する操作では、Qwenのモデル重みを取得してブラウザのキャッシュへ保存します。モデルの取得後、会話本文を外部AI APIへ送信する処理はありません。</p><p>モデルの大きさと「回答スタイル」によって、端末のメモリ使用量と応答時間が変わります。軽いモデルから試すことをおすすめします。</p><button className="modal-confirm" onClick={() => setShowAbout(false)}>理解しました</button></section></div>}
    </div>
  );
}
