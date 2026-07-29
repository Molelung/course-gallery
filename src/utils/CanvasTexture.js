import * as THREE from "three";

// 人生旅程系列课程 — 以阿德勒思想为核心的 14 节心理学社课
// 每一节课对应一格胶卷：desc 用于预览页，core/theory/imagery 用于详情页
const SCHEMES = [
  {
    title: "我们是人生旅者",
    subtitle: "第 1 节 · 身份认同",
    colorA: "#1a1a40", colorB: "#6a4c93",
    tags: "旅者 · 身份认同",
    desc: "心理学是什么？我为什么要以「旅者」的身份来学它？从冯特的实验室到当代积极心理学，心理学不是远方的学问——它就是每一个「我该如何选择」的瞬间。",
    core: "心理学是什么？我为什么要以「旅者」的身份来学它？",
    theory: [
      "心理学的学科地图：从 1879 年冯特在莱比锡大学建立第一个心理学实验室（科学心理学诞生的标志），到弗洛伊德的精神分析、华生与斯金纳的行为主义、罗杰斯与马斯洛的人本主义，再到当代认知神经科学与积极心理学。心理学的三大使命：描述行为、解释机制、预测与促进改变。",
      "「旅者」身份认同：如果将人生比作旷野上的行走，我们不是朝圣者（有确定终点的信徒），不是流浪者（没有方向意识），而是旅者——有方向但不被终点绑架，有行囊但不被负重压垮。"
    ],
    imagery: "心理学不是一张标注好终点的地图，而是一副罗盘。人生亦是如此。"
  },
  {
    title: "此刻是路标",
    subtitle: "第 2 节 · 活在当下",
    colorA: "#0d2b36", colorB: "#1b9aaa",
    tags: "目的论 · 愚者心态",
    desc: "为什么我总是被困在过去或焦虑未来？阿德勒目的论 vs 弗洛伊德原因论——人不被过去的原因驱动，而是被当下的目的牵引。",
    core: "为什么我总是被困在过去或焦虑未来？怎样才算真正「活在当下」？",
    theory: [
      "阿德勒目的论 vs 弗洛伊德原因论：弗洛伊德认为人的现在由过去决定——童年创伤如同埋在地下的暗河。阿德勒提出转向：同样一个经历，是成为「我因此不能」的证据，还是「我因此选择」的素材，取决于你在哪个框架里讲述它。",
      "「活在当下」的积极含义——愚者的心态：接受人生是一场永无止境的旅途，没有「最终完成」的那一刻。注意力全部集中在脚下这一步：今天比昨天多走了一点点，就是全部的意义。"
    ],
    imagery: "路标不指向身后，也不指向遥不可及的终点。它只标记此刻——你站在哪里，下一步可以往哪个方向迈出。愚者每次只看一个路标，走完这一段，下一个路标自然会出现在视野里。"
  },
  {
    title: "为什么山就在那儿",
    subtitle: "第 3 节 · 目标感",
    colorA: "#16324f", colorB: "#3e92cc",
    tags: "追求优越性 · 成长型思维",
    desc: "目标的意义是什么？如果我达不到目标，一切努力就白费了吗？山的存在不是为了让你登顶，而是为了让你始终有方向可走。",
    core: "目标的意义是什么？如果我达不到目标，一切努力就白费了吗？",
    theory: [
      "阿德勒「追求优越性」：人天生具有朝向更好状态的倾向，但这不是与他人比较的优越感，也不是「一次性登顶」的野心，而是每天前进一点点的内在驱力。",
      "德韦克的成长型思维：固定型思维者将目标视为「证明自己」的考场，成长型思维者将目标视为「发展自己」的过程。目标不是用来「达成」的——达成的瞬间它就消失了。"
    ],
    imagery: "登山者说「因为山就在那儿」——这不是对登顶的执念，而是对方向的确信。愚者从不问「还要走多远」，他只在意「今天走了多远」。"
  },
  {
    title: "假如遇到思想钢印机",
    subtitle: "第 4 节 · 信念与自我信赖",
    colorA: "#2b0f3a", colorB: "#e0218a",
    tags: "生活风格 · 自我信赖",
    desc: "如果我有一个「我不行」的信念，它真的是事实吗？反过来——我能不能主动给自己打下一个「我行」的钢印，并且让它不可动摇？",
    core: "「我不行」的信念真的是事实吗？我能不能主动为自己锻造「我行」的钢印？",
    theory: [
      "消极钢印：阿德勒「生活风格」理论指出，人在童年早期就形成了一套关于自己、他人和世界的隐性结论，像一副滤镜。限制性信念的危险在于自我实现——信念自己制造证据。",
      "主动锻造：信念不只是「被发现的」，更是「被选择的」。你可以主动选择「我有能力持续进步」「我的价值不由某次失败决定」，让它们成为事实的起点。",
      "自我信赖是核心枢纽：在没有任何证据支持的情况下，仍然选择站在自己这边。他信随外部反馈波动，自我信赖不被外部评价动摇——「我选择信自己，然后我走出证据来」。"
    ],
    imagery: "思想钢印机有两面：一面挖出别人趁你不注意打上的「你不行」；另一面，你亲手打下自己选择的信念。让钢印牢固的，是一个承诺：无论发生什么，我选择站在自己这边。"
  },
  {
    title: "又一次挥舞登山杖",
    subtitle: "第 5 节 · 刻意练习",
    colorA: "#0b3d2e", colorB: "#52b788",
    tags: "刻意练习 · 舒适区边缘",
    desc: "为什么我明明很努力，却没有进步？表现优异者和普通人的关键差异不在天赋，不在总练习时长，而在练习的质量。",
    core: "为什么我明明很努力，却没有进步？",
    theory: [
      "艾利克森「刻意练习」理论：天真的练习是重复已经会了的内容，在舒适区内打转；刻意练习是在舒适区边缘反复突破，伴有明确的反馈和持续的专注。",
      "三个核心要素：① 目标明确——每次练习瞄准一个具体可测量的改善点；② 即时反馈——在练习过程中就知道对错；③ 持续挑战——一旦轻松了就说明回到了舒适区。"
    ],
    imagery: "登山杖不是打一下就能劈开山路的神器，它是在每一次要滑倒时撑住你的支点。「又一次」本身，就是刻意练习的全部秘密。"
  },
  {
    title: "那块糖没这么苦",
    subtitle: "第 6 节 · 自控力",
    colorA: "#3d1308", colorB: "#f9a03f",
    tags: "延迟满足 · 注意力策略",
    desc: "自控力就是「忍住不吃糖」吗？意志力是有限的资源吗？自控力的秘密不在正面对抗，而在改变你和诱惑之间的关系。",
    core: "自控力就是「忍住不吃糖」吗？意志力是有限的资源吗？",
    theory: [
      "棉花糖实验的重新解读：成功延迟满足的孩子靠的不是「更强的意志力」，而是注意力的策略性分配——把视线从棉花糖上移开，用认知策略绕开诱惑。",
      "「自我损耗」理论及其争议：Baumeister 提出意志力像肌肉一样会疲劳，但近年大量重复实验未能稳定复现。更合理的解释：你相不相信意志力会耗尽，会直接影响你的表现。"
    ],
    imagery: "那块糖本身并不苦——苦的是盯着它看的时候。当你不再和糖对视，它就不再是你的对手。愚者不靠「忍」来走路，他靠的是把目光放在路上。"
  },
  {
    title: "总有风景更美丽",
    subtitle: "第 7 节 · 完美主义",
    colorA: "#33112b", colorB: "#f25c8e",
    tags: "适应性完美主义 · 自我接纳",
    desc: "追求完美是美德还是陷阱？两种完美主义共享「高标准」，分岔在犯错之后你怎么对待自己。",
    core: "追求完美是美德还是陷阱？",
    theory: [
      "完美主义的双面结构：适应性完美主义 = 高标准 + 自我接纳；适应不良完美主义 = 高标准 + 自我批判——「如果没达到，我是失败者」。",
      "核心机制「等价思维」：「我的成果 = 我的价值」。一次没考好的试被等同为「我不够好」的判决。完美主义的本质是拒绝接受旅途永无止境，渴望「交出一份完美答卷就再也不用努力了」。"
    ],
    imagery: "最美的风景永远在前方，而你已经路过的每一处，都曾是「前方」。你不需要找到一块「最完美」的路牌——你只需要继续走。"
  },
  {
    title: "我的旅伴在身边",
    subtitle: "第 8 节 · 亲密关系",
    colorA: "#431259", colorB: "#e56b6f",
    tags: "依恋理论 · 共同体感觉",
    desc: "为什么越亲密的人越容易互相伤害？每个人走进关系时，手里都拿着一本自己写的、以为对方也读过的剧本。",
    core: "为什么越亲密的人越容易互相伤害？怎么理解我在关系中的反应模式？",
    theory: [
      "依恋理论：婴儿期与照顾者的互动模式，会延续为成年后的依恋风格——安全型（我值得被爱）、焦虑型（我害怕被抛弃）、回避型（独立才是安全的）。这不是贴标签，而是理解自己的框架。",
      "阿德勒「共同体感觉」：健康的亲密关系不是互相满足需求的交易，而是两个独立个体选择并肩行走。问题往往不出在「不够爱」，而出在「爱的方式来自各自的早期剧本」。"
    ],
    imagery: "两个旅者并肩走路，最大的困难不是步速不同。亲密不是步调一致——是我知道你有你习惯的节奏，而你愿意偶尔为我停下来。"
  },
  {
    title: "当你俯下身去",
    subtitle: "第 9 节 · 助人指南",
    colorA: "#14342b", colorB: "#60d394",
    tags: "共情 · 人本主义",
    desc: "怎样帮助一个难过的人——而不让事情更糟？真正的共情是在场的沉默——我在这里，你不是一个人面对。",
    core: "怎样帮助一个难过的人——而不让事情更糟？",
    theory: [
      "罗杰斯人本主义三项核心条件：① 真诚一致——不戴「帮助者」的面具；② 无条件积极关注——不因对方此刻的状态收回尊重；③ 共情理解——进入对方的参照系，感受 ta 的感受。",
      "常见「伪助人」行为：急于给建议、转移话题、比惨、虚假安慰。共同特征：说话者在照顾自己的不适感，而不是在陪伴对方。"
    ],
    imagery: "当旅伴跌倒了，你不需要把 ta 扛起来往前走——你只需要蹲下来，和 ta 在同一个高度待一会儿。在那个水平面上，你只能看到对方眼睛里看到的——那就是共情的全部。"
  },
  {
    title: "世界凭什么干涉我",
    subtitle: "第 10 节 · 课题分离",
    colorA: "#1c2541", colorB: "#5bc0be",
    tags: "课题分离 · 边界",
    desc: "怎么分清「我的事」和「你的事」？一项选择的最终后果由谁来承担，这件事就是谁的课题。",
    core: "怎么分清「我的事」和「你的事」？区分清楚了然后呢？",
    theory: [
      "阿德勒「课题分离」：人际烦恼的绝大多数根源在于课题的混淆——要么你背了别人的课题，要么你让别人背了你的课题。",
      "最容易被误解的概念：课题分离不是「我不关心你」，而是「我关心你，但我不能替你走路」。真正的边界不是墙——墙是拒绝接触，边界是明确这是我的、那是你的之后，我们依然可以并肩。"
    ],
    imagery: "每个旅者都有自己的行囊，你无法替别人背，也不该让别人替你背。"
  },
  {
    title: "窗外灰蒙蒙",
    subtitle: "第 11 节 · 情绪管理",
    colorA: "#23272f", colorB: "#8d99ae",
    tags: "情绪功能论 · 情绪调节",
    desc: "情绪来了，我应该「控制」它还是「接纳」它？情绪不是需要被消灭的 bug，而是携带信息的信使。",
    core: "情绪来了，我应该「控制」它还是「接纳」它？",
    theory: [
      "情绪的功能论：焦虑在告诉你「有不确定性需要关注」，愤怒在告诉你「有边界被侵犯了」，悲伤在告诉你「有重要的东西失去了」。把情绪视为干扰，等于把送信的人赶走。",
      "格罗斯情绪调节模型：可以在情绪生成的五个环节介入——情境选择、情境修正、注意部署、认知改变、反应调整。越靠前介入，调节成本越低。"
    ],
    imagery: "旅途中总有灰蒙蒙的天气。你无法命令天空放晴，但你可以决定——撑开伞继续走，还是找个屋檐等雨停。情绪管理的目标不是永远晴朗，而是不被天气决定行程。"
  },
  {
    title: "昨日来信，未来邮件，当下的笔",
    subtitle: "第 12 节 · 内耗",
    colorA: "#2b2118", colorB: "#d4a373",
    tags: "反刍思维 · 许可效应",
    desc: "为什么我什么都没做却觉得筋疲力尽？反刍、决策疲劳与自我监控过度——内耗的三个核心来源。",
    core: "为什么我什么都没做却觉得筋疲力尽？",
    theory: [
      "内耗的三个核心来源：① 反刍思维——对过去反复咀嚼却不产生行动；② 决策疲劳——在无数微小选择间反复纠结；③ 自我监控过度——「做事」和「评判做事的自己」两个频道同时运行。",
      "两个补充概念：许可效应——被允许「可以休息」时，焦虑反而下降、效率反而提升；纯粹紧迫效应——「假的紧迫感」会持续消耗能量而不导向产出。"
    ],
    imagery: "你左手翻着「昨天」寄来的信——全是悔恨；右手拆着「明天」发来的邮件——全是焦虑。而「此刻」这支笔就握在你手里，你却忘了用它写字。唯一能写字的那支笔，只在当下。"
  },
  {
    title: "坐在篝火旁歇息",
    subtitle: "第 13 节 · 复盘",
    colorA: "#26120b", colorB: "#e85d04",
    tags: "复盘 · 经验+反思",
    desc: "复盘和反刍有什么本质区别？复盘是以行动为导向的回顾，反刍是以情绪为漩涡的重复。",
    core: "复盘和反刍有什么本质区别？怎样让旅途中积累的经验真正为我所用？",
    theory: [
      "复盘的心理机制：将经历拆解为「发生了什么 → 我做了什么 → 结果是什么 → 下次可以怎么调整」的闭环。复盘的终点是一个具体的行动方案，反刍的终点是新一轮的相同情绪。",
      "杜威：经验若不经过反思，便只是经历——「经验 + 反思 = 成长」。大脑的默认模式是重复熟悉的路径，复盘是手动打断默认模式，强制进行一次路径检视。"
    ],
    imagery: "旅者晚上坐在篝火旁翻看地图。白天的每一步都无法撤销，但借着火光，你可以辨认：明天，山在哪边。篝火的温暖不是用来自责的燃料，是用来照亮前路的。"
  },
  {
    title: "旅途结束了…？",
    subtitle: "第 14 节 · 旅程结尾",
    colorA: "#102040", colorB: "#ffd166",
    tags: "整合 · 展望",
    desc: "这门课结束了，然后呢？结课不是终点——它是你意识到「原来我一直会继续走下去」的时刻。",
    core: "这门课结束了，然后呢？",
    theory: [
      "整合与展望：回望整合学过的所有经验，也展望未来——介绍从未探索的心理学领域（弗洛伊德、荣格与现代前沿理论），鼓励从自己感兴趣的领域对生活进行更完全的解读。",
      "核心回响：这门课从头到尾都在说一件事——旅途没有终点，愚者从不问「到了没有」。这不是让人沮丧的真相，而是让人解脱的真相：如果你不必「一次性到达」，你就可以慢慢走。"
    ],
    imagery: "如果你不必交出一份完美的答卷，你就可以在每一份不完美的草稿里学到东西。结课不是终点——它是你意识到「原来我一直会继续走下去」的时刻。"
  }
];

/**
 * Generate a canvas texture for a film frame
 * @param {object} options - { title, subtitle, colorA, colorB }
 * @returns {THREE.CanvasTexture}
 */
export function createFrameTexture(options = {}) {
  const {
    title = "Untitled",
    subtitle = "",
    colorA = "#1a1a2e",
    colorB = "#16213e"
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle grid pattern
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Decorative circle
  ctx.beginPath();
  ctx.arc(canvas.width * 0.75, canvas.height * 0.35, 120, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();

  // Title (with glow for stronger contrast against the gradient)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 66px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 30);

  // Subtitle
  if (subtitle) {
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "28px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 40);
  }
  ctx.shadowBlur = 0;

  // Filmic vignette -> darker edges focus the eye on the content
  const vig = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.25,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.75
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle film grain
  ctx.globalAlpha = 0.05;
  for (let n = 0; n < 2600; n++) {
    const gx = Math.random() * canvas.width;
    const gy = Math.random() * canvas.height;
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(gx, gy, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  // Bright inner frame border -> separates content from the dark film body
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 5;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Get all default frame data (墨澜 · 人生旅程系列)
 */
export function getDefaultFrames() {
  return SCHEMES;
}

// 诙谐 · 新课程筹备中（正式课程内容尚未提供——占位帧，不写任何虚构文案）
const SCHEMES_HUIXIE = [1, 2, 3].map((n) => ({
  title: "敬请期待",
  subtitle: `诙谐 · 新课程筹备中`,
  colorA: "#16161f", colorB: "#3a3a4d",
  tags: "筹备中",
  desc: "诙谐老师的课程正在筹备中，胶片已经备好，内容即将冲洗出来。",
  core: "课程内容正在筹备中，敬请期待。",
  theory: [],
  imagery: ""
}));

/**
 * All course sets: each reel of film belongs to one instructor.
 * frames follow the same schema as SCHEMES.
 */
export const COURSE_SETS = [
  { id: "molan",   instructor: "墨澜", series: "人生旅程系列", frames: SCHEMES },
  { id: "huixie",  instructor: "诙谐", series: "新课程", frames: SCHEMES_HUIXIE }
];

/**
 * Build one long, continuous film-strip texture: 6 tiles side by side, each
 * with the dark film base, perforated edges (bright sprocket holes), edge
 * markings and the frame content. The strip mesh scrolls this texture via
 * texture.offset.x, so the film visually flows along its path.
 *
 * Proportions must match FilmReel: tile = STEP x STRIP_H,
 * content = FRAME_WIDTH x FRAME_HEIGHT, border = BORDER_H top & bottom.
 * @returns {THREE.CanvasTexture}
 */
export function createFilmStripTexture(frames, proportions) {
  const { contentWFrac, contentHFrac, borderFrac } = proportions;
  // Keep the total texture width under the 8192px GPU limit (N * TILE < 8192)
  // so it renders on all real GPUs without downscaling.
  const TILE = 560;
  const N = frames.length;

  const canvas = document.createElement("canvas");
  canvas.width = TILE * N;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d");

  const borderH = Math.round(TILE * borderFrac);
  const contentH = Math.round(TILE * contentHFrac);
  const contentW = Math.round(TILE * contentWFrac);
  const contentX = Math.round((TILE - contentW) / 2);
  const contentY = borderH;

  for (let i = 0; i < N; i++) {
    const x0 = i * TILE;
    const f = frames[i];

    // Charcoal film base
    ctx.fillStyle = "#14141a";
    ctx.fillRect(x0, 0, TILE, TILE);

    // Darker perforated edge bands (top / bottom)
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(x0, 0, TILE, borderH);
    ctx.fillRect(x0, TILE - borderH, TILE, borderH);

    // Plastic sheen across the base
    const sheen = ctx.createLinearGradient(0, 0, 0, TILE);
    sheen.addColorStop(0, "rgba(255,255,255,0.07)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(255,255,255,0.045)");
    ctx.fillStyle = sheen;
    ctx.fillRect(x0, 0, TILE, TILE);

    // Bright sprocket holes with a soft glow — rounded, like real 35mm
    // perforations (Bell & Howell round-corner rectangular holes)
    const holeW = Math.round(TILE * 0.034);
    const holeH = Math.round(borderH * 0.52);
    const holeR = Math.round(holeH * 0.32);
    ctx.save();
    ctx.shadowColor = "rgba(175,185,210,0.8)";
    ctx.shadowBlur = 9;
    ctx.fillStyle = "#d5dae8";
    for (let k = 0; k < 5; k++) {
      const hx = x0 + ((k + 0.5) / 5) * TILE - holeW / 2;
      const hyTop = (borderH - holeH) / 2;
      const hyBot = TILE - borderH + (borderH - holeH) / 2;
      ctx.beginPath();
      ctx.roundRect(hx, hyTop, holeW, holeH, holeR);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(hx, hyBot, holeW, holeH, holeR);
      ctx.fill();
    }
    ctx.restore();

    // Film edge markings (both bands, like real edge print / keykode)
    ctx.fillStyle = "rgba(200,205,220,0.34)";
    ctx.font = `600 ${Math.round(borderH * 0.3)}px 'Courier New', monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`COURSE GALLERY · 35MM · ${String(i + 1).padStart(2, "0")}A`,
      x0 + TILE * 0.06, TILE - borderH / 2 + borderH * 0.02);
    ctx.fillStyle = "rgba(200,205,220,0.22)";
    ctx.textAlign = "right";
    ctx.fillText(`▸▸ ${String(i + 1).padStart(2, "0")}  ISO 100 · 5219`,
      x0 + TILE * 0.94, borderH / 2);

    // Frame divider — the thin unexposed gap between adjacent frames
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(x0 + TILE - 3, borderH, 3, TILE - borderH * 2);

    // ---- Frame content ----
    const cx = x0 + contentX;
    const grad = ctx.createLinearGradient(cx, contentY, cx + contentW, contentY + contentH);
    grad.addColorStop(0, f.colorA);
    grad.addColorStop(1, f.colorB);
    ctx.fillStyle = grad;
    ctx.fillRect(cx, contentY, contentW, contentH);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < contentW; gx += 44) {
      ctx.beginPath(); ctx.moveTo(cx + gx, contentY); ctx.lineTo(cx + gx, contentY + contentH); ctx.stroke();
    }
    for (let gy = 0; gy < contentH; gy += 44) {
      ctx.beginPath(); ctx.moveTo(cx, contentY + gy); ctx.lineTo(cx + contentW, contentY + gy); ctx.stroke();
    }

    // Decorative glow orb
    const orbR = contentH * 0.2;
    const orbX = cx + contentW * 0.74;
    const orbY = contentY + contentH * 0.32;
    const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR);
    orbGrad.addColorStop(0, "rgba(255,255,255,0.18)");
    orbGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = orbGrad;
    ctx.fillRect(orbX - orbR, orbY - orbR, orbR * 2, orbR * 2);

    // Index number (top-left)
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.fillText(`0${i + 1}`, cx + 16, contentY + 12);

    // Tags (top-right)
    if (f.tags) {
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "18px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillText(f.tags, cx + contentW - 16, contentY + 14);
    }

    // Title & subtitle (Chinese-aware, auto-shrink to fit the frame)
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ffffff";
    const zhFont = "'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";
    let titleSize = 56;
    const maxTitleW = contentW * 0.88;
    ctx.font = `bold ${titleSize}px ${zhFont}`;
    while (ctx.measureText(f.title).width > maxTitleW && titleSize > 30) {
      titleSize -= 2;
      ctx.font = `bold ${titleSize}px ${zhFont}`;
    }
    ctx.fillText(f.title, cx + contentW / 2, contentY + contentH / 2 - 26);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `24px ${zhFont}`;
    ctx.fillText(f.subtitle, cx + contentW / 2, contentY + contentH / 2 + 34);
    ctx.shadowBlur = 0;

    // Filmic vignette on the content
    const vig = ctx.createRadialGradient(
      cx + contentW / 2, contentY + contentH / 2, contentH * 0.3,
      cx + contentW / 2, contentY + contentH / 2, contentH * 0.85
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = vig;
    ctx.fillRect(cx, contentY, contentW, contentH);

    // Film grain over the whole tile
    ctx.globalAlpha = 0.05;
    for (let n = 0; n < 2200; n++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
      ctx.fillRect(x0 + Math.random() * TILE, Math.random() * TILE, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;

    // Occasional faint vertical scratches — real film is never pristine
    ctx.globalAlpha = 0.05;
    for (let s = 0; s < 3; s++) {
      const sx = x0 + Math.random() * TILE;
      ctx.strokeStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx + (Math.random() - 0.5) * 14, TILE);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Bright inner border separating content from the film base
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 4;
    ctx.strokeRect(cx + 3, contentY + 3, contentW - 6, contentH - 6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}
