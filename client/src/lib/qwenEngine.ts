/** KOTONOHA visual system: QwenモデルをブラウザのWebGPUで推論するための最小ラッパー。 */

export type ModelSpec = {
  id: string;
  label: string;
  note: string;
};

export const QWEN_MODELS: ModelSpec[] = [
  { id: "Qwen3-0.6B-q4f16_1-MLC", label: "Qwen3 0.6B", note: "軽量・すばやい応答" },
  { id: "Qwen3-1.7B-q4f16_1-MLC", label: "Qwen3 1.7B", note: "バランス型" },
  { id: "Qwen3-4B-q4f16_1-MLC", label: "Qwen3 4B", note: "より深い推論に対応" },
  { id: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 Coder 0.5B", note: "コードと技術文書向け" },
];

export const DEFAULT_QWEN_MODEL = QWEN_MODELS[0].id;

export type QwenEngine = {
  chat: {
    completions: {
      create: (request: {
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
        extra_body?: { enable_thinking?: boolean };
      }) => Promise<AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>>;
    };
  };
  unload?: () => Promise<void>;
};

export type LoadProgress = { progress: number; text: string };

export async function createQwenEngine(modelId: string, onProgress: (report: LoadProgress) => void): Promise<QwenEngine> {
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
  return CreateMLCEngine(modelId, {
    initProgressCallback: (report) => onProgress({ progress: report.progress, text: report.text }),
  }) as unknown as Promise<QwenEngine>;
}

export function hasWebGPU() {
  return Boolean((navigator as Navigator & { gpu?: unknown }).gpu);
}

export async function canUseWebGPU() {
  const gpu = (navigator as Navigator & {
    gpu?: { requestAdapter?: () => Promise<unknown> };
  }).gpu;
  if (!gpu?.requestAdapter) return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}
