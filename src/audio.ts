/**
 * 纯 Web Audio 合成音效：插件包不额外带音频文件，离线可用。
 * 所有调用都在用户点击回调里，自动播放策略下可正常 resume；不支持时静默降级。
 */

type Note = [frequency: number, delay: number, duration: number, gain: number, type?: OscillatorType];

let ctx: AudioContext | null = null;

const context = (): AudioContext | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    if (!ctx) {
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
    return ctx;
  } catch {
    return null;
  }
};

const tone = (ac: AudioContext, [frequency, delay, duration, gain, type = 'sine']: Note): void => {
  const at = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
};

const play = (notes: Note[]): void => {
  const ac = context();
  if (!ac) {
    return;
  }
  try {
    notes.forEach((note) => tone(ac, note));
  } catch {
    // 音效不影响主流程。
  }
};

/** 贴星：清脆上扬的双音。 */
export const playStick = (): void => play([
  [880, 0, 0.13, 0.08],
  [1320, 0.055, 0.18, 0.05],
]);

/** 扣除：低沉下滑音。 */
export const playDeduct = (): void => play([
  [392, 0, 0.14, 0.07, 'triangle'],
  [262, 0.07, 0.2, 0.05, 'triangle'],
]);

/** 兑换成功：三音上行和弦。 */
export const playRedeem = (): void => play([
  [523, 0, 0.12, 0.07],
  [659, 0.09, 0.12, 0.06],
  [784, 0.18, 0.26, 0.07],
]);

/** 翻页 / 加页：短促轻响。 */
export const playFlip = (): void => play([
  [220, 0, 0.055, 0.03, 'triangle'],
]);

/** 确认删除孩子：低音收尾。 */
export const playDelete = (): void => play([
  [196, 0, 0.16, 0.06, 'triangle'],
  [147, 0.12, 0.24, 0.05, 'triangle'],
]);
