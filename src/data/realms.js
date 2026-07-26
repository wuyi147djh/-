// 境界系统
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

export const BREAKTHROUGH_COST = [
  0, 100, 1000, 10000, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, Infinity,
]

export const BASE = {
  HP: 100,
  ATK: 5,
  CULT_RATE: 1,
}
