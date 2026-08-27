/** KOTONOHA: ブラウザ内だけで実行する、説明可能な規則ベースの応答エンジン。 */

export type LocalAnswer = {
  text: string;
  label: string;
};

const compact = (value: string) => value.trim().replace(/\s+/g, " ");

const extractSubject = (value: string) => {
  const matched = value.match(/(?:について|を|の)([^。！？!?]{2,24})(?:を|について|で|、|。|$)/);
  return matched?.[1]?.trim() || "このテーマ";
};

const shortSentences = (value: string) => {
  const normalized = compact(value);
  const pieces = normalized
    .split(/(?<=[。！？!?])/)
    .map((item) => item.trim())
    .filter(Boolean);
  return pieces.slice(0, 3).join(" ");
};

export function createLocalAnswer(input: string): LocalAnswer {
  const text = compact(input);
  const normalized = text.toLowerCase();
  const subject = extractSubject(text);

  if (/^(こんにちは|こんばんは|おはよう|hello|hi\b)/i.test(text)) {
    return {
      label: "挨拶 / LOCAL",
      text: "こんにちは。KOTONOHAは、このブラウザ内だけで文章を整理します。\n\n今日進めたいこと、短くしたい文章、考えを分けたいテーマをそのまま入力してください。",
    };
  }

  if (/(通信|ネットワーク|オフライン|online|offline)/i.test(normalized)) {
    return {
      label: "状態 / LOCAL",
      text: "この対話は外部API、検索、送信処理を使いません。入力内容と履歴は、履歴保存を有効にした場合だけ、この端末のブラウザ保存領域に記録されます。\n\nそのため、最新の出来事や外部サイトの事実確認はできませんが、手元の文章の整理・分解・書き換えには使えます。",
    };
  }

  if (/(要約|まとめ|summari[sz]e|短く)/i.test(normalized)) {
    const source = text.split(/[:：]\s*/).slice(1).join(" ");
    if (source.length > 20) {
      return {
        label: "要約 / LOCAL",
        text: `短い要約です。\n\n${shortSentences(source)}\n\n必要なら「一文にして」または「箇条書きにして」と続けて指定できます。`,
      };
    }
    return {
      label: "要約 / LOCAL",
      text: "要約したい文章を、コロン（：）の後ろに貼り付けてください。\n\n例：要約：ここに長めの文章を入力します。",
    };
  }

  if (/(計画|プラン|段取り|todo|タスク|進め方)/i.test(normalized)) {
    return {
      label: "計画 / LOCAL",
      text: `${subject}を進めるための最小プランです。\n\n1. 目的を一文で決める\n2. 今日終える作業を一つに絞る\n3. 25分だけ着手する\n4. 終了時に次の一手を一文で残す\n\n制約や締切があれば、続けて書いてください。順番を組み替えます。`,
    };
  }

  if (/(アイデア|発想|案を|ブレスト|brainstorm)/i.test(normalized)) {
    return {
      label: "発想 / LOCAL",
      text: `${subject}について、出発点を四つ置きます。\n\n・逆から考える：完成形ではなく、避けたい状態から条件を出す\n・利用者を一人に絞る：誰のどの瞬間を軽くするか決める\n・制約を一つ足す：時間、素材、文字数の上限を置く\n・比較対象を変える：同じ業界でなく、似た行動をする道具から学ぶ\n\n気になる一つを選べば、具体案に展開します。`,
    };
  }

  if (/(チェック|確認項目|checklist)/i.test(normalized)) {
    return {
      label: "確認 / LOCAL",
      text: `${subject}の確認用リストです。\n\n□ 目的は一文で説明できる\n□ 最初にする行動が決まっている\n□ 必要な情報と不足情報が分かれている\n□ 完了の条件が測れる\n□ 次回の開始地点を残している`,
    };
  }

  if (/(言い換え|書き換え|わかりやす|整えて|推敲)/i.test(normalized)) {
    return {
      label: "推敲 / LOCAL",
      text: "文章を整えるときは、まず一文を「誰が・何を・なぜ」の順に分けると明快になります。\n\n書き換えたい原文を、コロン（：）の後ろに貼り付けてください。丁寧、簡潔、やわらかい、事務的など、希望する調子も指定できます。",
    };
  }

  return {
    label: "整理 / LOCAL",
    text: `「${text.length > 44 ? `${text.slice(0, 44)}…` : text}」を受け取りました。\n\nこのサイトは外部情報を検索せず、ブラウザ内の規則だけで文章を整理します。次のどれをしたいか指定すると、より具体的に扱えます。\n\n・要点を3つに分ける\n・実行計画にする\n・短く書き換える\n・確認項目を作る`,
  };
}
