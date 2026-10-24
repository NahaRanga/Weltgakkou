// 46 huruf dasar hiragana dan katakana (92 huruf) untuk kuis kana. Data kecil, aman dikirim ke browser.
const romaji =
  "a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n".split(" ");
const hiragana = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const katakana = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";

export type KanaSet = "hiragana" | "katakana";
export type Kana = { char: string; romaji: string };

export const kana: Record<KanaSet, Kana[]> = {
  hiragana: [...hiragana].map((char, i) => ({ char, romaji: romaji[i] })),
  katakana: [...katakana].map((char, i) => ({ char, romaji: romaji[i] })),
};

export const kanaLabels: Record<KanaSet, string> = { hiragana: "Hiragana", katakana: "Katakana" };
