// 境界系统：每境界需要的修为、属性倍率
export const REALMS = [
  { name: '凡夫',    cultMult: 1,     hpMult: 1,    atkMult: 1,    desc: '一介凡人，方踏仙途' },
  { name: '炼气',    cultMult: 1.5,   hpMult: 2,    atkMult: 1.5,  desc: '气感初开，吐纳天地' },
  { name: '筑基',    cultMult: 2.5,   hpMult: 4,    atkMult: 2.5,  desc: '道基已立，仙凡有别' },
  { name: '金丹',    cultMult: 4,     hpMult: 8,    atkMult: 4,    desc: '金丹大成，寿元五百' },
  { name: '元婴',    cultMult: 7,     hpMult: 16,   atkMult: 7,    desc: '元婴出窍，千里取人' },
  { name: '化神',    cultMult: 12,    hpMult: 32,   atkMult: 12,   desc: '神游太虚，移山填海' },
  { name: '炼虚',    cultMult: 20,    hpMult: 64,   atkMult: 20,   desc: '炼虚合道，万物归一' },
  { name: '合体',    cultMult: 35,    hpMult: 128,  atkMult: 35,   desc: '天人合一，法力无边' },
  { name: '大乘',    cultMult: 60,    hpMult: 256,  atkMult: 60,   desc: '大乘圆满，俯瞰众生' },
  { name: '渡劫',    cultMult: 100,   hpMult: 512,  atkMult: 100,  desc: '九重雷劫，一步之遥' },
  { name: '飞升',    cultMult: 200,   hpMult: 1024, atkMult: 200,  desc: '白日飞升，登临仙界' },
]

// 每境界突破所需修为基础值（突破后境界）
export const BREAKTHROUGH_COST = [
  0,          // 凡夫→炼气
  100,        // 炼气→筑基
  1000,       // 筑基→金丹
  10000,      // 金丹→元婴
  1e5,        // 元婴→化神
  1e6,        // 化神→炼虚
  1e7,        // 炼虚→合体
  1e8,        // 合体→大乘
  1e9,        // 大乘→渡劫
  1e10,       // 渡劫→飞升
  Infinity,   // 飞升已圆满
]

// 基础属性
export const BASE = {
  HP: 100,
  ATK: 5,
  CULT_RATE: 1, // 修为/秒 基础
}
