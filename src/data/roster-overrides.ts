import type { RosterOverrideEntry } from "@/lib/lol-roles";

// Worlds 2026本戦のスタメン手動指定。PandaScoreのロスターは正しくても、
// ロール(role)の値が間違っているチームがあるため(例: MVKのSanSanは
// PandaScore上でMIDになっているが実際はJG)、ここで指定したロール・並び順を
// 優先する(lib/lol-roles.tsのselectStartingFive参照)。
// キーはPandaScoreのチームacronym(大文字小文字区別なし)。選手名もPandaScoreの
// player名と大文字小文字を無視して照合する。見つからない選手がいた場合は
// コンソールに警告が出て、その枠だけ既存の自動選出ロジックで埋まる。
// 控え選手が出場する試合では、該当チームのこの配列を一時的に書き換えること
// (2026-10-23時点のスタメン。遅延登録・移籍・出場停止等があれば更新する)

export const WORLDS_ROSTER_OVERRIDES: Record<string, RosterOverrideEntry[]> = {
  GEN: [
    { role: "top", name: "Kiin" },
    { role: "jungle", name: "Canyon" },
    { role: "mid", name: "Chovy" },
    { role: "bot", name: "Ruler" },
    { role: "sup", name: "Duro" },
  ],
  HLE: [
    { role: "top", name: "Zeus" },
    { role: "jungle", name: "Kanavi" },
    { role: "mid", name: "Zeka" },
    { role: "bot", name: "Gumayusi" },
    { role: "sup", name: "Delight" },
  ],
  T1: [
    { role: "top", name: "Doran" },
    { role: "jungle", name: "Oner" },
    { role: "mid", name: "Faker" },
    { role: "bot", name: "Peyz" },
    { role: "sup", name: "Keria" },
  ],
  DK: [
    { role: "top", name: "Siwoo" },
    { role: "jungle", name: "Lucid" },
    { role: "mid", name: "ShowMaker" },
    { role: "bot", name: "Smash" },
    { role: "sup", name: "Career" },
  ],
  AL: [
    { role: "top", name: "Breathe" },
    { role: "jungle", name: "Tarzan" },
    { role: "mid", name: "Shanks" },
    { role: "bot", name: "Hope" },
    { role: "sup", name: "Kael" },
  ],
  BLG: [
    { role: "top", name: "Bin" },
    { role: "jungle", name: "Xun" },
    { role: "mid", name: "Knight" },
    { role: "bot", name: "Viper" },
    { role: "sup", name: "ON" },
  ],
  // ZUIANがビザ問題で欠場、369が代役
  TES: [
    { role: "top", name: "369" },
    { role: "jungle", name: "Tian" },
    { role: "mid", name: "Creme" },
    { role: "bot", name: "JackeyLove" },
    { role: "sup", name: "Zhuo" },
  ],
  IG: [
    { role: "top", name: "TheShy" },
    { role: "jungle", name: "Wei" },
    { role: "mid", name: "Rookie" },
    { role: "bot", name: "JiaQi" },
    { role: "sup", name: "Meiko" },
  ],
  G2: [
    { role: "top", name: "BrokenBlade" },
    { role: "jungle", name: "SkewMond" },
    { role: "mid", name: "Caps" },
    { role: "bot", name: "Hans Sama" },
    { role: "sup", name: "Labrov" },
  ],
  MKOI: [
    { role: "top", name: "Myrwn" },
    { role: "jungle", name: "Elyoya" },
    { role: "mid", name: "Jojopyun" },
    { role: "bot", name: "Supa" },
    { role: "sup", name: "Alvaro" },
  ],
  KC: [
    { role: "top", name: "Canna" },
    { role: "jungle", name: "Yike" },
    { role: "mid", name: "Kyeahoo" },
    { role: "bot", name: "Caliste" },
    { role: "sup", name: "Busio" },
  ],
  TLAW: [
    { role: "top", name: "Morgan" },
    { role: "jungle", name: "Josedeodo" },
    { role: "mid", name: "Quid" },
    { role: "bot", name: "Yeon" },
    { role: "sup", name: "CoreJJ" },
  ],
  LYON: [
    { role: "top", name: "Dhokla" },
    { role: "jungle", name: "Inspired" },
    { role: "mid", name: "Saint" },
    { role: "bot", name: "Berserker" },
    { role: "sup", name: "Isles" },
  ],
  TSW: [
    { role: "top", name: "Pun" },
    { role: "jungle", name: "Hizto" },
    { role: "mid", name: "Dire" },
    { role: "bot", name: "Eddie" },
    { role: "sup", name: "Bie" },
  ],
  CFO: [
    { role: "top", name: "Rest" },
    { role: "jungle", name: "Shad0w" },
    { role: "mid", name: "Pout" },
    { role: "bot", name: "Doggo" },
    { role: "sup", name: "Kino" },
  ],
  LOS: [
    { role: "top", name: "Zest" },
    { role: "jungle", name: "Curse" },
    { role: "mid", name: "Feisty" },
    { role: "bot", name: "Duduhh" },
    { role: "sup", name: "Ackerman" },
  ],
  // PandaScoreはSanSan=MIDになっているが誤り(実際はJG)
  MVK: [
    { role: "top", name: "Kratos" },
    { role: "jungle", name: "Gury" },
    { role: "mid", name: "Chika" },
    { role: "bot", name: "Harky" },
    { role: "sup", name: "SiuLoong" },
  ],
};
