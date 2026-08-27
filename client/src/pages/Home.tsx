/** KOTONOHA visual system: dark local control station with a focused work field. */
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  Clipboard,
  Command,
  Eraser,
  Keyboard,
  LockKeyhole,
  Radio,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { createLocalAnswer } from "@/lib/localEngine";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  label?: string;
};

const STORAGE_KEY = "kotonoha-local-history";

const initialMessage: Message = {
  id: "local-welcome",
  role: "assistant",
  label: "SYSTEM / LOCAL",
  content:
    "この端末の中だけで、言葉を整理します。\n\n目的、下書き、迷っていることをそのまま入力してください。外部への送信や検索は行いません。",
};

const prompts = [
  "今日の作業を3段階に分けて",
  "アイデアを4つ出して",
  "チェックリストを作って",
  "短い文章に整えて",
];

function makeId() {
  return `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readHistory(): Message[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [initialMessage];
    const parsed = JSON.parse(saved) as Message[];
    return Array.isArray(parsed) && parsed.length ? parsed : [initialMessage];
  } catch {
    return [initialMessage];
  }
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(readHistory);
  const [draft, setDraft] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveHistory, setSaveHistory] = useState(() => {
    try {
      return window.localStorage.getItem("kotonoha-save-history") !== "false";
    } catch {
      return false;
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!saveHistory) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, saveHistory]);

  useEffect(() => {
    window.localStorage.setItem("kotonoha-save-history", String(saveHistory));
  }, [saveHistory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isProcessing]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed || isProcessing) return;

    const userMessage: Message = { id: makeId(), role: "user", content: trimmed };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setIsProcessing(true);

    window.setTimeout(() => {
      const answer = createLocalAnswer(trimmed);
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "assistant", content: answer.text, label: answer.label },
      ]);
      setIsProcessing(false);
      textareaRef.current?.focus();
    }, 330);
  };

  const copyText = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  const resetConversation = () => {
    const next = window.confirm("この端末に保存した対話履歴を消去しますか？");
    if (!next) return;
    setMessages([initialMessage]);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const selectPrompt = (prompt: string) => {
    setDraft(prompt);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const messageCount = messages.filter((message) => message.role === "user").length;

  return (
    <div className="app-shell">
      <div className="grain" aria-hidden="true" />
      <div className="topography" aria-hidden="true" />

      <aside className="signal-rail" aria-label="KOTONOHAの状態">
        <div className="brand-lockup">
          <div className="brand-symbol" aria-hidden="true"><span /></div>
          <div>
            <p className="eyebrow">LOCAL LANGUAGE TOOL</p>
            <p className="wordmark">KOTONOHA</p>
          </div>
        </div>

        <div className="rail-rule" />

        <section className="rail-section">
          <p className="rail-label">SYSTEM STATE</p>
          <div className="status-line"><span className="status-light" /> <span>LOCAL CORE</span><b>READY</b></div>
          <div className="status-line muted"><span className="status-dot" /> <span>NETWORK</span><b>NONE</b></div>
          <div className="status-line muted"><span className="status-dot" /> <span>REQUESTS</span><b>0</b></div>
        </section>

        <section className="rail-section details-section">
          <p className="rail-label">PROCESSING</p>
          <dl className="detail-list">
            <div><dt>ENGINE</dt><dd>RULE-SET / JP</dd></div>
            <div><dt>MEMORY</dt><dd>{saveHistory ? "THIS DEVICE" : "SESSION ONLY"}</dd></div>
            <div><dt>REPLIES</dt><dd>{String(messageCount).padStart(3, "0")}</dd></div>
          </dl>
        </section>

        <div className="rail-bottom">
          <label className="storage-toggle">
            <input
              type="checkbox"
              checked={saveHistory}
              onChange={(event) => setSaveHistory(event.target.checked)}
            />
            <span className="toggle-mark" aria-hidden="true"><Check size={11} /></span>
            <span>この端末に履歴を保存</span>
          </label>
          <button className="rail-action" type="button" onClick={resetConversation}>
            <Eraser size={15} /> 対話を消去
          </button>
          <button className="rail-action" type="button" onClick={() => setShowPrivacy(true)}>
            <LockKeyhole size={15} /> ローカル処理について
          </button>
        </div>
      </aside>

      <main className="work-field">
        <header className="field-header">
          <div className="breadcrumb"><Radio size={14} /> SESSION / 01 <span>—</span> LOCAL MODE</div>
          <div className="header-status"><span className="header-status-dot" />OUTBOUND / 00</div>
        </header>

        <section className="intro-block" aria-labelledby="page-title">
          <div className="station-title-row">
            <div>
              <p className="eyebrow intro-index">STATION 01 / CONVERSATION FIELD</p>
              <h1 id="page-title">言葉を、<em>ここで整える。</em></h1>
            </div>
            <div className="station-mark" aria-label="KOTONOHAローカル応答マーク"><span /><i /><b /></div>
          </div>
          <p className="intro-copy">ブラウザ内の規則ベース処理だけで応答します。検索・クラウド通信は使いません。</p>
          <div className="signal-path" aria-label="ローカル処理の流れ">
            <div><b>01</b><span>INPUT</span></div><i /><div><b>02</b><span>RULE-SET</span></div><i /><div><b>03</b><span>RESPONSE</span></div>
          </div>
        </section>

        <section className="conversation" aria-label="対話">
          <div className="conversation-line" aria-hidden="true"><span /></div>
          <div className="console-bar"><span>ACTIVE CONVERSATION</span><span>ENGINE / RULE-SET JP</span><b>LOCAL</b></div>
          <div className="message-list">
            {messages.map((message) => (
              <article className={`message message-${message.role}`} key={message.id}>
                <div className="message-meta">
                  <span>{message.role === "assistant" ? message.label || "LOCAL / RESP" : "YOU / INPUT"}</span>
                  {message.role === "assistant" && (
                    <button className="copy-button" type="button" onClick={() => copyText(message)} aria-label="応答をコピー">
                      {copiedId === message.id ? <Check size={14} /> : <Clipboard size={14} />}
                    </button>
                  )}
                </div>
                <div className="message-content">
                  {message.content.split("\n").map((line, index) => <p key={`${message.id}-${index}`}>{line || " "}</p>)}
                </div>
              </article>
            ))}
            {isProcessing && (
              <article className="message message-assistant processing" aria-live="polite">
                <div className="message-meta"><span>LOCAL / PROCESSING</span></div>
                <div className="processing-dots"><i /><i /><i /></div>
              </article>
            )}
            <div ref={endRef} />
          </div>
        </section>

        <section className="composer-section" aria-label="メッセージを入力">
          <div className="suggestion-row" aria-label="入力例">
            {prompts.map((prompt, index) => (
              <button type="button" className="prompt-chip" onClick={() => selectPrompt(prompt)} key={prompt}>
                <span>{String(index + 1).padStart(2, "0")}</span>{prompt}
              </button>
            ))}
          </div>
          <div className="composer-shell">
            <div className="composer-telemetry"><span>RULE-SET / JP</span><span>BROWSER WORKER</span><span>NETWORK / NONE</span></div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="考え、下書き、次にすることを入力…"
              aria-label="メッセージ"
              rows={2}
            />
            <button type="button" className="send-button" onClick={submit} disabled={!draft.trim() || isProcessing} aria-label="送信">
              <ArrowUp size={19} />
            </button>
          </div>
          <div className="composer-caption">
            <span><Keyboard size={13} /> Enterで送信　Shift + Enterで改行</span>
            <span><Sparkles size={13} /> LOCAL / BROWSER-ONLY / NO API</span>
          </div>
        </section>
      </main>

      {showPrivacy && (
        <div className="privacy-backdrop" role="presentation" onMouseDown={() => setShowPrivacy(false)}>
          <section className="privacy-panel" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="privacy-close" type="button" onClick={() => setShowPrivacy(false)} aria-label="閉じる"><X size={18} /></button>
            <p className="eyebrow">LOCAL PROCESSING NOTE</p>
            <h2 id="privacy-title">送信先はありません。</h2>
            <p>入力内容は、ブラウザ内のJavaScriptで規則に照らして処理されます。外部AI、検索サービス、解析サービスには接続しません。</p>
            <p>「この端末に履歴を保存」を有効にすると、対話ログはこのブラウザのローカルストレージにだけ保存されます。オフにすると、画面を閉じた後に履歴は残りません。</p>
            <button className="panel-confirm" type="button" onClick={() => setShowPrivacy(false)}>理解しました <Command size={15} /></button>
          </section>
        </div>
      )}
    </div>
  );
}
