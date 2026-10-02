import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

const CONFIG = window.SENTENCE_BLASTER_CONFIG || {};
const ASSET_ROOT = "./assets/models";
const IS_TOUCH = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

const $ = (selector) => document.querySelector(selector);
const dom = {
  canvas: $("#game-canvas"),
  loadingScreen: $("#loading-screen"),
  loadingLabel: $("#loading-label"),
  loadingProgress: $("#loading-progress"),
  startScreen: $("#start-screen"),
  accessForm: $("#access-form"),
  sessionCode: $("#session-code"),
  verifyCode: $("#verify-code"),
  codeStatus: $("#code-status"),
  studentFields: $("#student-fields"),
  studentName: $("#student-name"),
  className: $("#class-name"),
  sessionClass: $("#session-class"),
  sessionTitle: $("#session-title"),
  hud: $("#hud"),
  hudName: $("#hud-name"),
  hudClass: $("#hud-class"),
  hudScore: $("#hud-score"),
  missionNumber: $("#mission-number"),
  missionTitle: $("#mission-title"),
  missionInstruction: $("#mission-instruction"),
  sentenceStrip: $("#sentence-strip"),
  sentenceProgress: $("#sentence-progress"),
  healthBar: $("#health-bar"),
  healthValue: $("#health-value"),
  hintButton: $("#hint-button"),
  hintCount: $("#hint-count"),
  pauseButton: $("#pause-button"),
  hitMarker: $("#hit-marker"),
  mobileControls: $("#mobile-controls"),
  moveZone: $("#move-zone"),
  joystickBase: $("#joystick-base"),
  joystickKnob: $("#joystick-knob"),
  lookZone: $("#look-zone"),
  mobileFire: $("#mobile-fire"),
  mobileJump: $("#mobile-jump"),
  writingModal: $("#writing-modal"),
  writingStep: $("#writing-step"),
  writingTitle: $("#writing-title"),
  sceneIcon: $("#scene-icon"),
  sceneDescription: $("#scene-description"),
  planChips: $("#plan-chips"),
  sentenceInput: $("#sentence-input"),
  writingFeedback: $("#writing-feedback"),
  writingHint: $("#writing-hint"),
  submitSentence: $("#submit-sentence"),
  pauseScreen: $("#pause-screen"),
  resumeButton: $("#resume-button"),
  restartButton: $("#restart-button"),
  resultScreen: $("#result-screen"),
  resultBadge: $("#result-badge"),
  resultTitle: $("#result-title"),
  resultSummary: $("#result-summary"),
  finalScore: $("#final-score"),
  finalAccuracy: $("#final-accuracy"),
  finalTime: $("#final-time"),
  standardResults: $("#standard-results"),
  saveStatus: $("#save-status"),
  playAgain: $("#play-again"),
  toast: $("#toast")
};

const demoSession = {
  id: "DEMO-SESSION",
  code: String(CONFIG.demoCode || "1234"),
  className: "Open session",
  title: "Capital Letters & Full Stops",
  attemptsAllowed: 3,
  questionCount: 15
};

const STAGE_POSITIONS = [
  new THREE.Vector3(0, 1.9, 10),
  new THREE.Vector3(0, 1.9, -1),
  new THREE.Vector3(0, 1.9, -13),
  new THREE.Vector3(0, 1.75, -25),
  new THREE.Vector3(0, 2.05, -38)
];
const MAX_POINTS_PER_QUESTION = 10;

const capitalQuestions = [
  ["my cat is black.", ["my", "MY", "My"], "My"],
  ["she has a red dress.", ["SHE", "She", "she"], "She"],
  ["he is my brother.", ["he", "He", "HE"], "He"],
  ["this is my school.", ["This", "THIS", "this"], "This"],
  ["the dog is running.", ["the", "THE", "The"], "The"],
  ["i like apples.", ["i", "I", "iI"], "I"],
  ["we play football.", ["WE", "we", "We"], "We"],
  ["they are happy.", ["They", "they", "THEY"], "They"],
  ["it is a blue bag.", ["it", "It", "IT"], "It"],
  ["our teacher is kind.", ["OUR", "Our", "our"], "Our"]
].map((item, index) => ({
  bankId: `C${index + 1}`, standard: "4.3.1", title: "Capital Blast", type: "choice",
  instruction: `Choose the correct first word: ${item[0]}`, choices: item[1], correct: item[2],
  hint: "A sentence begins with one capital letter.", evidence: "Uses a capital letter at the beginning of a sentence."
}));

const punctuationQuestions = [
  "I like ice cream", "She has a doll", "The bird can fly", "This is my pencil", "He is wearing a hat",
  "We go to school", "My bag is blue", "The cat is sleeping", "They play football", "It is a sunny day"
].map((sentence, index) => ({
  bankId: `P${index + 1}`, standard: "4.3.1", title: "Full Stop Factory", type: "choice",
  instruction: `${sentence} ___  Choose the correct punctuation.`, choices: index % 2 ? ["!", "?", "."] : ["?", ".", "!"], correct: ".",
  hint: "This is a statement. It ends with a full stop.", evidence: "Uses a full stop at the end of a statement."
}));

const sequenceSentences = [
  ["I", "have", "a", "blue", "bag."], ["She", "has", "a", "red", "dress."],
  ["He", "is", "my", "good", "friend."], ["The", "cat", "is", "sleeping."],
  ["We", "play", "in", "the", "park."], ["This", "is", "my", "pencil."],
  ["The", "bird", "can", "fly."], ["My", "mother", "is", "kind."],
  ["They", "are", "very", "happy."], ["It", "is", "a", "big", "box."]
];
const sequenceQuestions = sequenceSentences.map((words, index) => ({
  bankId: `S${index + 1}`, standard: "4.3.3", title: "Word Rescue", type: "sequence",
  instruction: "Blast the words in the correct order.", choices: shuffledCopy(words), sequence: words,
  hint: `Begin with “${words[0]}”. Read the sentence aloud.`, evidence: "Plans and arranges words to form a simple sentence."
}));

const guidedQuestions = [
  ["📦", "A blue box", "Write a sentence about the box.", ["Who? The box", "Action? is", "What? blue"], ["the box is blue", "this is a blue box", "it is a blue box"]],
  ["⚽", "A red ball", "Write a sentence about the ball.", ["Who? The ball", "Action? is", "What? red"], ["the ball is red", "this is a red ball", "it is a red ball"]],
  ["🐈", "A cat sleeping", "Write a sentence about the cat.", ["Who? The cat", "Action? is sleeping"], ["the cat is sleeping", "a cat is sleeping", "it is sleeping"]],
  ["👧📖", "A girl reading", "Write a sentence about the girl.", ["Who? The girl", "Action? is reading"], ["the girl is reading", "a girl is reading", "she is reading"]],
  ["👦🏃", "A boy running", "Write a sentence about the boy.", ["Who? The boy", "Action? is running"], ["the boy is running", "a boy is running", "he is running"]],
  ["🐕🍚", "A dog eating", "Write a sentence about the dog.", ["Who? The dog", "Action? is eating"], ["the dog is eating", "a dog is eating", "it is eating"]],
  ["👧👦🎲", "Children playing", "Write a sentence about the children.", ["Who? The children", "Action? are playing"], ["the children are playing", "two children are playing", "they are playing"]],
  ["🐦🌳", "A bird in a tree", "Write a sentence about the bird.", ["Who? The bird", "Where? in the tree"], ["the bird is in the tree", "a bird is in the tree", "it is in the tree"]]
].map((item, index) => ({
  bankId: `G${index + 1}`, standard: "4.3.1 & 4.3.3", title: "Guided Writing Lab", type: "writing",
  instruction: "Reach the WRITE station and write a guided sentence.", targetText: "WRITE", icon: item[0], scene: item[1],
  prompt: item[2], plan: item[3], accepted: item[4], hint: "Use the planning clues. Begin with a capital letter and end with a full stop.",
  evidence: "Plans, drafts and writes a guided simple sentence."
}));

const independentQuestions = [
  ["🪁", "A boy flying a kite", ["the boy is flying a kite", "a boy is flying a kite", "he is flying a kite"]],
  ["🏊", "A girl swimming", ["the girl is swimming", "a girl is swimming", "she is swimming"]],
  ["🚲", "A boy riding a bicycle", ["the boy is riding a bicycle", "a boy is riding a bicycle", "he is riding a bicycle"]],
  ["🍎", "A girl eating an apple", ["the girl is eating an apple", "a girl is eating an apple", "she is eating an apple"]],
  ["🐕⚽", "A dog playing with a ball", ["the dog is playing with a ball", "a dog is playing with a ball", "it is playing with a ball"]]
].map((item, index) => ({
  bankId: `I${index + 1}`, standard: "4.3.1 & 4.3.3", title: "Final Sentence Boss", type: "writing", independent: true,
  instruction: "Reach the FINAL WRITE station and write independently.", targetText: "FINAL WRITE", icon: item[0], scene: item[1],
  prompt: "Write one sentence about the picture.", plan: [], accepted: item[2], hint: "Who can you see? What is happening?",
  evidence: "Drafts and writes a simple sentence independently."
}));

let activeMissions = [];

const state = {
  phase: "loading",
  session: null,
  student: "",
  className: "",
  score: 0,
  health: 100,
  hintsLeft: 3,
  hintsTotal: 3,
  missionIndex: -1,
  missionStartedAt: 0,
  startedAt: 0,
  shots: 0,
  correctShots: 0,
  wrongAttempts: 0,
  currentHintsUsed: 0,
  currentSequence: [],
  missionLocked: false,
  details: [],
  writingDrafts: [],
  submissionId: "",
  pausedByModal: false
};

function shuffledCopy(items) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function pickQuestions(pool, count) {
  return shuffledCopy(pool).slice(0, count).map((question) => ({ ...question }));
}

function buildMissionSet(requestedCount) {
  const count = [10, 15, 20].includes(Number(requestedCount)) ? Number(requestedCount) : 15;
  const distribution = {
    10: { capital: 3, punctuation: 3, sequence: 2, guided: 1, independent: 1 },
    15: { capital: 4, punctuation: 4, sequence: 4, guided: 2, independent: 1 },
    20: { capital: 5, punctuation: 5, sequence: 5, guided: 3, independent: 2 }
  }[count];
  const regular = shuffledCopy([
    ...pickQuestions(capitalQuestions, distribution.capital),
    ...pickQuestions(punctuationQuestions, distribution.punctuation),
    ...pickQuestions(sequenceQuestions, distribution.sequence),
    ...pickQuestions(guidedQuestions, distribution.guided)
  ]);
  const finalWriting = pickQuestions(independentQuestions, distribution.independent);
  return [...regular, ...finalWriting].map((mission, index) => ({
    ...mission,
    id: `Q${String(index + 1).padStart(2, "0")}-${mission.bankId}`,
    position: STAGE_POSITIONS[index % STAGE_POSITIONS.length].clone()
  }));
}

let scene;
let camera;
let renderer;
let clock;
let loader;
let listener;
let audioContext;
let weapon;
let muzzleFlash;
let currentGuard;
let currentGuardMixer;
let currentGuardActions = {};
let activeTargetGroup;
let objectiveBeacon;
let writingMission;
let toastTimer;
let jumpRequested = false;
let guardFireTimer = 2.5;

const assets = new Map();
const mixers = [];
const activeTargets = [];
const particles = [];
const enemyBolts = [];
const healthPickups = [];
const mapColliders = [];
const raycaster = new THREE.Raycaster();
const keys = new Set();
const player = {
  position: new THREE.Vector3(0, 1.65, 21),
  velocityY: 0,
  yaw: 0,
  pitch: 0,
  onGround: true,
  walkSpeed: 6.2,
  sprintSpeed: 9.2
};
const mobileInput = { moveX: 0, moveY: 0, lookId: null, lookX: 0, lookY: 0, moveId: null };

bootstrap();

async function bootstrap() {
  bindInterface();
  initThree();
  try {
    await loadAssets();
    buildWorld();
    setLoading(100, "Mission ready");
  } catch (error) {
    console.warn("Some 3D assets could not load. Using safe fallback objects.", error);
    buildWorld();
    setLoading(100, "Mission ready in light mode");
  }
  setTimeout(() => {
    dom.loadingScreen.classList.remove("active");
    dom.startScreen.classList.add("active");
    state.phase = "start";
  }, 350);
  clock = new THREE.Clock();
  renderer.setAnimationLoop(animate);
}

function bindInterface() {
  dom.verifyCode.addEventListener("click", verifySessionCode);
  dom.sessionCode.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      verifySessionCode();
    }
  });
  dom.accessForm.addEventListener("submit", startGameFromForm);
  dom.hintButton.addEventListener("click", useHint);
  dom.pauseButton.addEventListener("click", pauseGame);
  dom.resumeButton.addEventListener("click", resumeGame);
  dom.restartButton.addEventListener("click", () => location.reload());
  dom.playAgain.addEventListener("click", () => location.reload());
  dom.submitSentence.addEventListener("click", checkWriting);
  dom.writingHint.addEventListener("click", useWritingHint);
  dom.sentenceInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") checkWriting();
  });

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", (event) => {
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(event.code)) keys.add(event.code);
    if (event.code === "Space" && state.phase === "playing") {
      event.preventDefault();
      jumpRequested = true;
    }
    if (event.code === "Escape" && state.phase === "playing" && document.pointerLockElement !== dom.canvas) pauseGame();
  });
  document.addEventListener("keyup", (event) => keys.delete(event.code));
  document.addEventListener("mousemove", onMouseLook);
  document.addEventListener("pointerlockchange", () => {
    if (!IS_TOUCH && state.phase === "playing" && document.pointerLockElement !== dom.canvas && !state.pausedByModal) pauseGame();
  });
  dom.canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || state.phase !== "playing") return;
    if (!IS_TOUCH && document.pointerLockElement !== dom.canvas) {
      dom.canvas.requestPointerLock?.();
      return;
    }
    fireBlaster();
  });

  bindTouchControls();
}

function bindTouchControls() {
  const resetJoystick = () => {
    mobileInput.moveId = null;
    mobileInput.moveX = 0;
    mobileInput.moveY = 0;
    dom.joystickKnob.style.transform = "translate(0px, 0px)";
  };

  dom.moveZone.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    mobileInput.moveId = event.pointerId;
    dom.moveZone.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });
  dom.moveZone.addEventListener("pointermove", (event) => {
    if (event.pointerId === mobileInput.moveId) updateJoystick(event);
  });
  dom.moveZone.addEventListener("pointerup", resetJoystick);
  dom.moveZone.addEventListener("pointercancel", resetJoystick);

  dom.lookZone.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    mobileInput.lookId = event.pointerId;
    mobileInput.lookX = event.clientX;
    mobileInput.lookY = event.clientY;
    dom.lookZone.setPointerCapture(event.pointerId);
  });
  dom.lookZone.addEventListener("pointermove", (event) => {
    if (event.pointerId !== mobileInput.lookId || state.phase !== "playing") return;
    const dx = event.clientX - mobileInput.lookX;
    const dy = event.clientY - mobileInput.lookY;
    mobileInput.lookX = event.clientX;
    mobileInput.lookY = event.clientY;
    player.yaw -= dx * 0.0052;
    player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.0048, -1.25, 1.2);
  });
  const clearLook = (event) => {
    if (event.pointerId === mobileInput.lookId) mobileInput.lookId = null;
  };
  dom.lookZone.addEventListener("pointerup", clearLook);
  dom.lookZone.addEventListener("pointercancel", clearLook);
  dom.mobileFire.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    fireBlaster();
  });
  dom.mobileJump.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    jumpRequested = true;
  });

  function updateJoystick(event) {
    const rect = dom.joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width * 0.34;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, radius / length);
    const x = dx * scale;
    const y = dy * scale;
    dom.joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
    mobileInput.moveX = THREE.MathUtils.clamp(dx / radius, -1, 1);
    mobileInput.moveY = THREE.MathUtils.clamp(dy / radius, -1, 1);
  }
}

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6fc5e9);
  scene.fog = new THREE.Fog(0x78c5df, 34, 92);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 180);
  camera.rotation.order = "YXZ";
  camera.position.copy(player.position);

  renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: !IS_TOUCH, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, IS_TOUCH ? 1.35 : 1.8));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = !IS_TOUCH;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  listener = new THREE.AudioListener();
  camera.add(listener);

  scene.add(new THREE.HemisphereLight(0xdff7ff, 0x5f6c3b, 2.3));
  const sun = new THREE.DirectionalLight(0xfff2ce, 3.1);
  sun.position.set(13, 24, 9);
  sun.castShadow = !IS_TOUCH;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -48;
  scene.add(sun);

  loader = new GLTFLoader();
}

async function loadAssets() {
  const manifest = [
    ["enemy", `${ASSET_ROOT}/characters/Character_Enemy.gltf`],
    ["pistol", `${ASSET_ROOT}/guns/Pistol.gltf`],
    ["crate", `${ASSET_ROOT}/environment/Crate.gltf`],
    ["structure1", `${ASSET_ROOT}/environment/Structure_1.gltf`],
    ["structure2", `${ASSET_ROOT}/environment/Structure_2.gltf`],
    ["barrier", `${ASSET_ROOT}/environment/Barrier_Fixed.gltf`],
    ["streetLight", `${ASSET_ROOT}/environment/StreetLight.gltf`],
    ["tree", `${ASSET_ROOT}/environment/Tree_1.gltf`],
    ["health", `${ASSET_ROOT}/environment/Health.gltf`]
  ];
  let completed = 0;
  await Promise.all(manifest.map(async ([key, path]) => {
    try {
      const gltf = await loader.loadAsync(path);
      assets.set(key, gltf);
    } finally {
      completed += 1;
      setLoading(Math.round((completed / manifest.length) * 85), `Loading mission assets ${completed}/${manifest.length}`);
    }
  }));
}

function buildWorld() {
  buildGround();
  buildBoundaries();
  buildMapDecor();
  buildWeapon();
  buildObjectiveBeacon();
  setLoading(94, "Building Capital City");
}

function buildGround() {
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x537a46, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(46, 100), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -13;
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 94),
    new THREE.MeshStandardMaterial({ color: 0x314457, roughness: 0.96 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.015, -13);
  road.receiveShadow = true;
  scene.add(road);

  const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xffd65a });
  for (let z = 23; z > -52; z -= 8) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 3.2), stripeMaterial);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.025, z);
    scene.add(stripe);
  }
}

function buildBoundaries() {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x273950, transparent: true, opacity: 0.2 });
  const boundaryGeo = new THREE.BoxGeometry(1, 3, 100);
  [-22, 22].forEach((x) => {
    const wall = new THREE.Mesh(boundaryGeo, wallMaterial);
    wall.position.set(x, 1.5, -13);
    scene.add(wall);
  });
}

function buildMapDecor() {
  const placements = [
    ["structure1", -12.5, 0, 10, 9.5, 0.1],
    ["structure2", 12.3, 0, 4, 10.5, -0.2],
    ["structure2", -12.5, 0, -18, 9.5, Math.PI],
    ["structure1", 12.7, 0, -31, 10, Math.PI],
    ["barrier", -7.1, 0, 16, 3.8, Math.PI / 2],
    ["barrier", 7.1, 0, 1.5, 3.8, -Math.PI / 2],
    ["barrier", -7.1, 0, -11, 3.8, Math.PI / 2],
    ["barrier", 7.1, 0, -23, 3.8, -Math.PI / 2]
  ];
  placements.forEach(([key, x, y, z, size, rotation]) => addModel(key, new THREE.Vector3(x, y, z), size, rotation, true));

  for (const [x, z] of [[-8, 20], [8, 15], [-9, 1], [9, -9], [-9, -26], [9, -42]]) {
    addModel("streetLight", new THREE.Vector3(x, 0, z), 4.6, x < 0 ? 0 : Math.PI);
  }
  for (const [x, z] of [[-17, 20], [17, 18], [-17, -2], [17, -13], [-17, -37], [17, -43]]) {
    addModel("tree", new THREE.Vector3(x, 0, z), 4.2, Math.random() * Math.PI);
  }
  for (const [x, z, color] of [[-5.3, 8, 0xff7448], [5.2, -3, 0x58a8ff], [-5.1, -15, 0xffd24f], [5.1, -27, 0x6fd17c], [-5.4, -40, 0xe46d85]]) {
    const crate = addModel("crate", new THREE.Vector3(x, 0, z), 1.3, Math.random() * Math.PI, true);
    if (!crate) addFallbackCrate(x, z, color);
  }
  for (const [x, z] of [[2.7, 3], [-2.8, -20], [2.8, -34]]) {
    const pickup = addModel("health", new THREE.Vector3(x, 0, z), .85, 0);
    if (pickup) {
      pickup.userData.energyPickup = true;
      healthPickups.push(pickup);
    }
  }
  buildKiteScene();
}

function addModel(key, position, targetSize, rotationY = 0, collider = false) {
  const gltf = assets.get(key);
  if (!gltf?.scene) return null;
  const model = gltf.scene.clone(true);
  normalizeModel(model, targetSize);
  model.position.add(position);
  model.rotation.y = rotationY;
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = !IS_TOUCH;
      child.receiveShadow = true;
    }
  });
  scene.add(model);
  if (collider) {
    const box = new THREE.Box3().setFromObject(model);
    box.expandByScalar(-0.15);
    mapColliders.push(box);
  }
  return model;
}

function normalizeModel(model, targetSize) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetSize / Math.max(size.x, size.y, size.z, 0.001);
  model.scale.multiplyScalar(scale);
  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = scaledBox.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= scaledBox.min.y;
}

function addFallbackCrate(x, z, color) {
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.MeshStandardMaterial({ color, roughness: .8 })
  );
  crate.position.set(x, .7, z);
  crate.castShadow = true;
  scene.add(crate);
}

function buildKiteScene() {
  const group = new THREE.Group();
  const kite = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xff5e64, side: THREE.DoubleSide, emissive: 0x401015, emissiveIntensity: .25 })
  );
  kite.rotation.z = Math.PI / 4;
  group.add(kite);
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -.9, 0), new THREE.Vector3(-2.2, -4.6, .2)]);
  group.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff })));
  group.position.set(-4.4, 5.5, -39);
  group.rotation.y = .2;
  scene.add(group);
}

function buildWeapon() {
  const gltf = assets.get("pistol");
  weapon = new THREE.Group();
  if (gltf?.scene) {
    const model = gltf.scene.clone(true);
    normalizeModel(model, .52);
    model.rotation.set(0, Math.PI, 0);
    model.position.set(.02, -.08, 0);
    weapon.add(model);
  } else {
    const fallback = new THREE.Mesh(
      new THREE.BoxGeometry(.16, .14, .62),
      new THREE.MeshStandardMaterial({ color: 0x39dbea, metalness: .45, roughness: .3 })
    );
    fallback.position.z = -.25;
    weapon.add(fallback);
  }
  weapon.position.set(.38, -.32, -.7);
  weapon.rotation.set(-.06, -.05, 0);
  camera.add(weapon);
  scene.add(camera);

  muzzleFlash = new THREE.PointLight(0x66edff, 0, 2.5);
  muzzleFlash.position.set(0, 0, -.7);
  weapon.add(muzzleFlash);
}

function buildObjectiveBeacon() {
  objectiveBeacon = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, .08, 12, 32),
    new THREE.MeshBasicMaterial({ color: 0x3ee7ff, transparent: true, opacity: .8 })
  );
  ring.rotation.x = Math.PI / 2;
  objectiveBeacon.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(.35, .8, 6, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x3ee7ff, transparent: true, opacity: .09, side: THREE.DoubleSide })
  );
  beam.position.y = 3;
  objectiveBeacon.add(beam);
  objectiveBeacon.visible = false;
  scene.add(objectiveBeacon);
}

async function verifySessionCode() {
  const code = dom.sessionCode.value.trim();
  if (!code) {
    setCodeStatus("Enter the code shown by your teacher.", true);
    return;
  }
  dom.verifyCode.disabled = true;
  setCodeStatus("Checking code…");
  try {
    const session = await getSession(code);
    if (!session?.active) throw new Error(session?.message || "This class code is not active.");
    state.session = session;
    dom.studentName.value = "";
    dom.className.value = "";
    dom.sessionClass.textContent = `${session.questionCount || 15} QUESTIONS`;
    dom.sessionTitle.textContent = session.title || "Writing Mission";
    dom.studentFields.classList.remove("hidden");
    setCodeStatus("Code accepted. Type your name and class.", false, true);
  } catch (error) {
    state.session = null;
    dom.studentFields.classList.add("hidden");
    setCodeStatus(error.message || "Unable to check this code.", true);
  } finally {
    dom.verifyCode.disabled = false;
  }
}

function setCodeStatus(message, isError = false, isSuccess = false) {
  dom.codeStatus.textContent = message;
  dom.codeStatus.style.color = isError ? "#ff9ba7" : isSuccess ? "#57e38d" : "";
}

async function startGameFromForm(event) {
  event.preventDefault();
  if (!state.session) {
    await verifySessionCode();
    if (!state.session) return;
  }
  const studentName = dom.studentName.value.trim().replace(/\s+/g, " ");
  const className = dom.className.value.trim().replace(/\s+/g, " ");
  if (studentName.length < 2) {
    showToast("Type your full name first.", "error");
    dom.studentName.focus();
    return;
  }
  if (!className) {
    showToast("Type your class first.", "error");
    dom.className.focus();
    return;
  }

  initAudio();
  state.student = studentName;
  state.className = className;
  activeMissions = buildMissionSet(state.session.questionCount);
  state.score = 0;
  state.health = 100;
  state.hintsLeft = Math.max(5, Math.ceil(activeMissions.length / 3));
  state.hintsTotal = state.hintsLeft;
  state.details = [];
  state.shots = 0;
  state.correctShots = 0;
  dom.hudScore.textContent = `0/${activeMissions.length * MAX_POINTS_PER_QUESTION}`;
  dom.hintCount.textContent = state.hintsLeft;
  state.startedAt = Date.now();
  state.phase = "playing";
  player.position.set(0, 1.65, 21);
  player.yaw = 0;
  player.pitch = 0;
  camera.position.copy(player.position);
  dom.hudName.textContent = state.student;
  dom.hudClass.textContent = state.className;
  dom.startScreen.classList.remove("active");
  dom.hud.classList.remove("hidden");
  if (IS_TOUCH) {
    dom.mobileControls.classList.remove("hidden");
    try { await document.documentElement.requestFullscreen?.(); } catch {}
    if (screen.orientation?.lock) {
      try { await screen.orientation.lock("landscape"); } catch {}
    }
    if (innerHeight > innerWidth) showToast("Rotate your phone for the best view.");
  } else {
    dom.canvas.requestPointerLock?.();
  }
  startMission(0);
}

function startMission(index) {
  clearMissionObjects();
  if (index > 0 && index % STAGE_POSITIONS.length === 0) {
    player.position.set(0, 1.65, 21);
    player.yaw = 0;
    player.pitch = 0;
    camera.position.copy(player.position);
    showToast(`Round ${Math.floor(index / STAGE_POSITIONS.length) + 1} begins!`, "success");
  }
  state.phase = "playing";
  state.missionIndex = index;
  state.currentSequence = [];
  state.missionLocked = false;
  state.writingDrafts = [];
  state.wrongAttempts = 0;
  state.currentHintsUsed = 0;
  state.missionStartedAt = Date.now();
  guardFireTimer = 2.2 + Math.random() * 1.4;
  const mission = activeMissions[index];
  dom.missionNumber.textContent = `MISSION ${index + 1} / ${activeMissions.length}`;
  dom.missionTitle.textContent = mission.title;
  dom.missionInstruction.textContent = mission.instruction;
  dom.sentenceStrip.classList.add("hidden");
  objectiveBeacon.position.set(mission.position.x, .05, mission.position.z + 2);
  objectiveBeacon.visible = true;
  spawnGuard(mission);

  if (mission.type === "choice") spawnChoiceTargets(mission);
  if (mission.type === "sequence") spawnSequenceTargets(mission);
  if (mission.type === "writing") spawnWritingTarget(mission);
  showToast(`${mission.title}: ${mission.instruction}`);
}

function clearMissionObjects() {
  activeTargets.splice(0).forEach((target) => {
    target.material?.map?.dispose?.();
    target.parent?.remove(target);
  });
  if (activeTargetGroup) {
    scene.remove(activeTargetGroup);
    activeTargetGroup = null;
  }
  if (currentGuard) {
    scene.remove(currentGuard);
    const index = mixers.indexOf(currentGuardMixer);
    if (index >= 0) mixers.splice(index, 1);
    currentGuard = null;
    currentGuardMixer = null;
    currentGuardActions = {};
  }
  enemyBolts.splice(0).forEach((bolt) => scene.remove(bolt));
}

function spawnChoiceTargets(mission) {
  activeTargetGroup = new THREE.Group();
  activeTargetGroup.position.copy(mission.position);
  mission.choices.forEach((choice, index) => {
    const target = makeTextTarget(choice, index === 1 ? 0xffbd4a : 0x3ee7ff);
    target.position.set((index - 1) * 3.35, (index % 2) * .25, 0);
    target.userData = { hitTarget: true, missionId: mission.id, value: choice, correct: choice === mission.correct };
    activeTargets.push(target);
    activeTargetGroup.add(target);
  });
  scene.add(activeTargetGroup);
}

function spawnSequenceTargets(mission) {
  activeTargetGroup = new THREE.Group();
  activeTargetGroup.position.copy(mission.position);
  const positions = [[-4,1.2], [-2,0], [0,1.05], [2.2,-.1], [4,1.2]];
  mission.choices.forEach((choice, index) => {
    const target = makeTextTarget(choice, index % 2 ? 0x3ee7ff : 0xffbd4a, 2.35, 1.2);
    target.position.set(positions[index][0], positions[index][1], 0);
    target.userData = { hitTarget: true, missionId: mission.id, value: choice, sequenceIndex: index };
    activeTargets.push(target);
    activeTargetGroup.add(target);
  });
  scene.add(activeTargetGroup);
  dom.sentenceProgress.textContent = "_ ".repeat(mission.sequence.length).trim();
  dom.sentenceStrip.classList.remove("hidden");
}

function spawnWritingTarget(mission) {
  activeTargetGroup = new THREE.Group();
  activeTargetGroup.position.copy(mission.position);
  const target = makeTextTarget(mission.targetText, mission.independent ? 0xff5f70 : 0x57e38d, mission.independent ? 5 : 3.8, 1.45);
  target.userData = { hitTarget: true, missionId: mission.id, value: "write", correct: true };
  activeTargets.push(target);
  activeTargetGroup.add(target);
  scene.add(activeTargetGroup);

}

function makeTextTarget(text, accent = 0x3ee7ff, width = 2.8, height = 1.35) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  const hex = `#${new THREE.Color(accent).getHexString()}`;
  roundRect(ctx, 18, 18, 732, 324, 46);
  ctx.fillStyle = "rgba(5, 18, 39, .94)";
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = hex;
  ctx.stroke();
  ctx.fillStyle = "#f7fcff";
  ctx.font = `900 ${text.length > 10 ? 76 : text.length > 6 ? 96 : 122}px Inter, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 384, 182, 680);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.renderOrder = 4;
  return mesh;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function spawnGuard(mission) {
  const gltf = assets.get("enemy");
  if (!gltf?.scene) {
    currentGuard = new THREE.Mesh(
      new THREE.CapsuleGeometry(.55, 1.05, 8, 16),
      new THREE.MeshStandardMaterial({ color: mission.independent ? 0xed3d55 : 0xffb443, roughness: .45 })
    );
    currentGuard.position.set(4.6, 1.05, mission.position.z - 1.5);
    scene.add(currentGuard);
    return;
  }
  currentGuard = cloneSkeleton(gltf.scene);
  normalizeModel(currentGuard, mission.independent ? 3.2 : 2.25);
  currentGuard.position.set(mission.independent ? 4.4 : 4.1, 0, mission.position.z - .7);
  currentGuard.rotation.y = Math.PI;
  currentGuard.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = !IS_TOUCH;
      child.receiveShadow = true;
      child.userData.guard = true;
    }
  });
  scene.add(currentGuard);
  currentGuardMixer = new THREE.AnimationMixer(currentGuard);
  currentGuardActions = {};
  (gltf.animations || []).forEach((clip) => { currentGuardActions[clip.name] = currentGuardMixer.clipAction(clip); });
  mixers.push(currentGuardMixer);
  playGuardAnimation("Idle", true);
}

function playGuardAnimation(name, loop = false) {
  const action = currentGuardActions[name];
  if (!action) return;
  Object.values(currentGuardActions).forEach((item) => item.fadeOut(.15));
  action.reset().fadeIn(.12).setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1).play();
  action.clampWhenFinished = !loop;
  if (!loop) setTimeout(() => currentGuard && playGuardAnimation("Idle", true), 850);
}

function fireBlaster() {
  if (state.phase !== "playing" || state.missionLocked) return;
  state.shots += 1;
  playTone("laser");
  muzzleFlash.intensity = 5;
  weapon.rotation.x = -.18;
  setTimeout(() => { if (muzzleFlash) muzzleFlash.intensity = 0; }, 55);

  const mission = activeMissions[state.missionIndex];
  if (mission && player.position.distanceTo(mission.position) > 18) {
    spawnShotParticle(camera.getWorldDirection(new THREE.Vector3()));
    showToast("Move closer to the glowing mission station.");
    return;
  }
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersections = raycaster.intersectObjects(activeTargets.concat(enemyBolts), false);
  if (intersections.length) {
    const target = intersections[0].object;
    if (target.userData.hazard) {
      scene.remove(target);
      const boltIndex = enemyBolts.indexOf(target);
      if (boltIndex >= 0) enemyBolts.splice(boltIndex, 1);
      flashHitMarker();
      playTone("success");
      showToast("Energy bolt blocked!", "success");
    } else {
      hitTarget(target);
    }
  } else {
    spawnShotParticle(raycaster.ray.direction);
  }
}

function hitTarget(target) {
  const mission = activeMissions[state.missionIndex];
  flashHitMarker();
  pulseTarget(target);
  if (mission.type === "choice") {
    if (target.userData.correct) {
      state.correctShots += 1;
      playTone("success");
      playGuardAnimation("Yes");
      completeMission({ selected: target.userData.value, expected: mission.correct, correct: true });
    } else {
      state.wrongAttempts += 1;
      playTone("error");
      playGuardAnimation("No");
      showToast(`“${target.userData.value}” is not correct. Try again.`, "error");
    }
  } else if (mission.type === "sequence") {
    const expected = mission.sequence[state.currentSequence.length];
    if (target.userData.value === expected) {
      state.correctShots += 1;
      state.currentSequence.push(expected);
      target.visible = false;
      dom.sentenceProgress.textContent = `${state.currentSequence.join(" ")} ${"_ ".repeat(mission.sequence.length - state.currentSequence.length).trim()}`;
      playTone("success");
      if (state.currentSequence.length === mission.sequence.length) {
        playGuardAnimation("Yes");
        completeMission({ selected: state.currentSequence.join(" "), expected: mission.sequence.join(" "), correct: true });
      } else {
        showToast(`Good! Next word: ${state.currentSequence.length + 1}`, "success");
      }
    } else {
      state.wrongAttempts += 1;
      playTone("error");
      playGuardAnimation("No");
      showToast("That word does not come next. Look at your sentence.", "error");
    }
  } else if (mission.type === "writing") {
    openWriting(mission);
  }
}

function completeMission(answerData) {
  if (state.missionLocked) return;
  state.missionLocked = true;
  state.phase = "transition";
  const mission = activeMissions[state.missionIndex];
  const elapsedSeconds = Math.round((Date.now() - state.missionStartedAt) / 1000);
  const points = Math.max(3, MAX_POINTS_PER_QUESTION - state.wrongAttempts * 2 - state.currentHintsUsed);
  state.score += points;
  dom.hudScore.textContent = `${state.score}/${activeMissions.length * MAX_POINTS_PER_QUESTION}`;
  state.details.push({
    missionId: mission.id,
    title: mission.title,
    standard: mission.standard,
    evidence: mission.evidence,
    response: answerData.selected,
    expected: answerData.expected,
    correct: answerData.correct,
    errors: state.wrongAttempts,
    hintsUsed: state.currentHintsUsed,
    points,
    elapsedSeconds,
    drafts: [...state.writingDrafts]
  });
  objectiveBeacon.visible = false;
  showToast(`Mission repaired! +${points} points`, "success");
  setTimeout(() => {
    if (state.missionIndex < activeMissions.length - 1) startMission(state.missionIndex + 1);
    else finishGame();
  }, 1350);
}

function openWriting(mission) {
  writingMission = mission;
  state.pausedByModal = true;
  state.phase = "writing";
  document.exitPointerLock?.();
  dom.mobileControls.classList.add("hidden");
  dom.writingStep.textContent = mission.independent ? "INDEPENDENT WRITING" : "GUIDED WRITING";
  dom.writingTitle.textContent = mission.prompt;
  dom.sceneIcon.textContent = mission.icon;
  dom.sceneDescription.textContent = mission.scene;
  dom.planChips.innerHTML = mission.plan.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  dom.sentenceInput.value = "";
  dom.writingFeedback.textContent = "";
  dom.writingFeedback.className = "feedback";
  dom.writingModal.classList.remove("hidden");
  dom.writingModal.classList.add("active");
  setTimeout(() => dom.sentenceInput.focus(), 100);
}

function checkWriting() {
  if (!writingMission) return;
  const raw = dom.sentenceInput.value.trim();
  if (!raw) {
    setWritingFeedback("Write your sentence first.", true);
    return;
  }
  state.writingDrafts.push(raw);
  const firstIsCapital = /^[A-Z]/.test(raw);
  const hasFullStop = /\.$/.test(raw);
  const content = raw.replace(/[.!?]+$/, "").trim().toLowerCase().replace(/\s+/g, " ");
  const meaningCorrect = writingMission.accepted.includes(content);

  if (!firstIsCapital) {
    state.wrongAttempts += 1;
    setWritingFeedback("Check the first letter. A sentence begins with a capital letter.", true);
    playTone("error");
    return;
  }
  if (!hasFullStop) {
    state.wrongAttempts += 1;
    setWritingFeedback("Your sentence needs a full stop at the end.", true);
    playTone("error");
    return;
  }
  if (!meaningCorrect) {
    state.wrongAttempts += 1;
    setWritingFeedback("Read the picture clue again. Check who and what is happening.", true);
    playTone("error");
    return;
  }

  setWritingFeedback("Excellent sentence!", false, true);
  playTone("success");
  playGuardAnimation("Yes");
  setTimeout(() => {
    dom.writingModal.classList.remove("active");
    dom.writingModal.classList.add("hidden");
    state.pausedByModal = false;
    state.phase = "playing";
    if (IS_TOUCH) dom.mobileControls.classList.remove("hidden");
    completeMission({ selected: raw, expected: writingMission.accepted.join(" | "), correct: true });
    writingMission = null;
  }, 750);
}

function setWritingFeedback(message, isError = false, isSuccess = false) {
  dom.writingFeedback.textContent = message;
  dom.writingFeedback.className = `feedback${isError ? " error" : isSuccess ? " success" : ""}`;
}

function useHint() {
  if (state.phase !== "playing") return;
  if (state.hintsLeft <= 0) {
    showToast("No hints left.", "error");
    return;
  }
  state.hintsLeft -= 1;
  state.currentHintsUsed += 1;
  dom.hintCount.textContent = state.hintsLeft;
  showToast(activeMissions[state.missionIndex].hint);
}

function useWritingHint() {
  if (!writingMission) return;
  if (state.hintsLeft <= 0) {
    setWritingFeedback("No hints left.", true);
    return;
  }
  state.hintsLeft -= 1;
  state.currentHintsUsed += 1;
  dom.hintCount.textContent = state.hintsLeft;
  setWritingFeedback(writingMission.hint);
}

function pauseGame() {
  if (state.phase !== "playing") return;
  state.phase = "paused";
  document.exitPointerLock?.();
  dom.mobileControls.classList.add("hidden");
  dom.pauseScreen.classList.remove("hidden");
  dom.pauseScreen.classList.add("active");
}

function resumeGame() {
  if (state.phase !== "paused") return;
  state.phase = "playing";
  dom.pauseScreen.classList.remove("active");
  dom.pauseScreen.classList.add("hidden");
  if (IS_TOUCH) dom.mobileControls.classList.remove("hidden");
  else dom.canvas.requestPointerLock?.();
}

async function finishGame() {
  state.phase = "finished";
  document.exitPointerLock?.();
  dom.hud.classList.add("hidden");
  dom.mobileControls.classList.add("hidden");
  const elapsedSeconds = Math.round((Date.now() - state.startedAt) / 1000);
  const accuracy = state.shots ? Math.round((state.correctShots / state.shots) * 100) : 100;
  const maximumScore = activeMissions.length * MAX_POINTS_PER_QUESTION;
  const percentageScore = Math.round((state.score / maximumScore) * 100);
  const grade = percentageScore >= 90 ? "A" : percentageScore >= 75 ? "B" : percentageScore >= 60 ? "C" : "D";
  dom.resultBadge.textContent = grade;
  dom.finalScore.textContent = `${percentageScore}/100`;
  dom.finalAccuracy.textContent = `${accuracy}%`;
  dom.finalTime.textContent = formatTime(elapsedSeconds);
  dom.resultSummary.textContent = `${state.student}, you completed all ${activeMissions.length} questions.`;
  dom.standardResults.innerHTML = [
    standardSummary("4.3.1", "Capital letters and full stops"),
    standardSummary("4.3.3", "Plan, draft and write simple sentences")
  ].join("");
  dom.resultScreen.classList.add("active");

  const result = {
    submissionId: makeId(),
    sessionId: state.session.id,
    sessionCode: state.session.code,
    studentName: state.student,
    className: state.className,
    gameVersion: CONFIG.gameVersion || "1.1.0",
    score: percentageScore,
    accuracy,
    shots: state.shots,
    correctShots: state.correctShots,
    hintsUsed: state.hintsTotal - state.hintsLeft,
    elapsedSeconds,
    completedAt: new Date().toISOString(),
    details: state.details
  };
  state.submissionId = result.submissionId;
  const saved = await saveResult(result);
  dom.saveStatus.textContent = saved
    ? "Result saved for your teacher."
    : "Result saved on this device. Ask your teacher to check the game connection.";
}

function standardSummary(code, label) {
  const evidence = state.details.filter((detail) => detail.standard.includes(code));
  const possible = evidence.length * MAX_POINTS_PER_QUESTION;
  const earned = evidence.reduce((sum, detail) => sum + (detail.points || 0), 0);
  const percentage = Math.round((earned / possible) * 100);
  return `<div class="standard-row"><div><strong>${code}</strong><span>${label}</span></div><strong>${percentage}%</strong></div>`;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `SB-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function getSession(code) {
  const demo = CONFIG.demoMode || !CONFIG.backendUrl || CONFIG.backendUrl.includes("PASTE_");
  if (demo) {
    await wait(350);
    if (code !== demoSession.code) return { active: false, message: "Demo code is 1234." };
    return { ...demoSession, active: true };
  }
  return jsonp(CONFIG.backendUrl, { action: "bootstrap", code });
}

async function saveResult(result) {
  localStorage.setItem(`sentenceBlasterResult:${result.submissionId}`, JSON.stringify(result));
  const demo = CONFIG.demoMode || !CONFIG.backendUrl || CONFIG.backendUrl.includes("PASTE_");
  if (demo) {
    await wait(450);
    return true;
  }
  try {
    const body = new URLSearchParams({ action: "submitResult", payload: JSON.stringify(result) });
    await fetch(CONFIG.backendUrl, { method: "POST", mode: "no-cors", body });
    for (let attempt = 0; attempt < 7; attempt += 1) {
      await wait(700 + attempt * 180);
      const status = await jsonp(CONFIG.backendUrl, { action: "submissionStatus", submissionId: result.submissionId });
      if (status?.saved) {
        localStorage.removeItem(`sentenceBlasterResult:${result.submissionId}`);
        return true;
      }
    }
  } catch (error) {
    console.warn("Result could not be confirmed.", error);
  }
  return false;
}

function jsonp(url, params, timeout = 9000) {
  return new Promise((resolve, reject) => {
    const callbackName = `__sb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timer = setTimeout(() => cleanup(new Error("The server took too long to respond.")), timeout);
    const query = new URLSearchParams({ ...params, callback: callbackName, t: Date.now() });
    window[callbackName] = (data) => cleanup(null, data);
    script.onerror = () => cleanup(new Error("Unable to connect to the class server."));
    script.src = `${url}${url.includes("?") ? "&" : "?"}${query.toString()}`;
    document.head.append(script);
    function cleanup(error, data) {
      clearTimeout(timer);
      delete window[callbackName];
      script.remove();
      if (error) reject(error); else resolve(data);
    }
  });
}

function animate() {
  const delta = Math.min(clock?.getDelta() || 0, .05);
  if (state.phase === "playing") updatePlayer(delta);
  mixers.forEach((mixer) => mixer.update(delta));
  updateWorld(delta);
  renderer.render(scene, camera);
}

function updatePlayer(delta) {
  let inputX = mobileInput.moveX;
  let inputZ = mobileInput.moveY;
  if (keys.has("KeyA")) inputX -= 1;
  if (keys.has("KeyD")) inputX += 1;
  if (keys.has("KeyW")) inputZ -= 1;
  if (keys.has("KeyS")) inputZ += 1;
  const length = Math.hypot(inputX, inputZ);
  if (length > 1) { inputX /= length; inputZ /= length; }
  const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? player.sprintSpeed : player.walkSpeed;
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const movement = forward.multiplyScalar(-inputZ).add(right.multiplyScalar(inputX)).multiplyScalar(speed * delta);
  const candidate = player.position.clone().add(movement);
  candidate.x = THREE.MathUtils.clamp(candidate.x, -20.5, 20.5);
  candidate.z = THREE.MathUtils.clamp(candidate.z, -49, 24);
  if (!collidesAt(candidate)) player.position.copy(candidate);

  if (jumpRequested && player.onGround) {
    player.velocityY = 5.4;
    player.onGround = false;
    playTone("jump");
  }
  jumpRequested = false;
  if (!player.onGround) {
    player.velocityY -= 13.5 * delta;
    player.position.y += player.velocityY * delta;
    if (player.position.y <= 1.65) {
      player.position.y = 1.65;
      player.velocityY = 0;
      player.onGround = true;
    }
  }

  camera.position.copy(player.position);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  const bobAmount = length > .08 && player.onGround ? Math.sin(performance.now() * .011) * .012 : 0;
  weapon.position.y = -.32 + bobAmount;
  weapon.rotation.x = THREE.MathUtils.lerp(weapon.rotation.x, -.06, .16);
}

function collidesAt(position) {
  const point = new THREE.Vector3(position.x, .9, position.z);
  return mapColliders.some((box) => box.containsPoint(point));
}

function updateWorld(delta) {
  if (objectiveBeacon?.visible) {
    objectiveBeacon.rotation.y += delta * .7;
    const pulse = 1 + Math.sin(performance.now() * .004) * .06;
    objectiveBeacon.scale.setScalar(pulse);
  }
  if (activeTargetGroup) {
    activeTargets.forEach((target, index) => {
      if (!target.visible) return;
      target.lookAt(camera.position);
      target.position.y += Math.sin(performance.now() * .0024 + index) * .0009;
    });
  }
  particles.forEach((particle, index) => {
    particle.position.addScaledVector(particle.userData.velocity, delta);
    particle.userData.life -= delta;
    if (particle.userData.life <= 0) {
      scene.remove(particle);
      particles.splice(index, 1);
    }
  });
  updateGuardCombat(delta);
  updateHealthPickups(delta);
}

function updateHealthPickups(delta) {
  healthPickups.forEach((pickup) => {
    if (!pickup.visible) return;
    pickup.rotation.y += delta * 1.2;
    const distance2D = Math.hypot(pickup.position.x - player.position.x, pickup.position.z - player.position.z);
    if (state.phase === "playing" && distance2D < 1.45 && state.health < 100) {
      pickup.visible = false;
      state.health = Math.min(100, state.health + 30);
      dom.healthValue.textContent = state.health;
      dom.healthBar.style.width = `${state.health}%`;
      dom.healthBar.style.background = "linear-gradient(90deg,#57e38d,#3ee7ff)";
      playTone("success");
      showToast("Energy restored +30", "success");
    }
  });
}

function updateGuardCombat(delta) {
  if (state.phase === "playing" && currentGuard) {
    const guardPosition = currentGuard.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.3, 0));
    const distance = guardPosition.distanceTo(player.position);
    guardFireTimer -= delta;
    if (distance < 20 && distance > 4 && guardFireTimer <= 0) {
      const bolt = new THREE.Mesh(
        new THREE.SphereGeometry(.13, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xff5367 })
      );
      bolt.position.copy(guardPosition);
      bolt.userData.hazard = true;
      bolt.userData.velocity = player.position.clone().sub(guardPosition).normalize().multiplyScalar(5.6);
      bolt.userData.life = 5;
      enemyBolts.push(bolt);
      scene.add(bolt);
      playGuardAnimation("Idle_Shoot");
      guardFireTimer = 3 + Math.random() * 1.8;
    }
  }

  for (let index = enemyBolts.length - 1; index >= 0; index -= 1) {
    const bolt = enemyBolts[index];
    bolt.position.addScaledVector(bolt.userData.velocity, delta);
    bolt.userData.life -= delta;
    if (bolt.position.distanceTo(player.position) < .55) {
      scene.remove(bolt);
      enemyBolts.splice(index, 1);
      damagePlayer(10);
    } else if (bolt.userData.life <= 0) {
      scene.remove(bolt);
      enemyBolts.splice(index, 1);
    }
  }
}

function damagePlayer(amount) {
  state.health = Math.max(0, state.health - amount);
  dom.healthValue.textContent = state.health;
  dom.healthBar.style.width = `${state.health}%`;
  dom.healthBar.style.background = state.health <= 30
    ? "linear-gradient(90deg,#ff5f70,#ffbd4a)"
    : "linear-gradient(90deg,#57e38d,#3ee7ff)";
  playTone("error");
  if (state.health <= 0) {
    const mission = activeMissions[state.missionIndex];
    state.score = Math.max(0, state.score - 5);
    dom.hudScore.textContent = state.score;
    state.health = 100;
    player.position.set(0, 1.65, Math.min(22, mission.position.z + 10));
    dom.healthValue.textContent = state.health;
    dom.healthBar.style.width = "100%";
    dom.healthBar.style.background = "linear-gradient(90deg,#57e38d,#3ee7ff)";
    showToast("Energy restored. Keep moving and block the red bolts!", "error");
  }
}

function onMouseLook(event) {
  if (state.phase !== "playing" || document.pointerLockElement !== dom.canvas) return;
  player.yaw -= event.movementX * .0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * .002, -1.25, 1.2);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, IS_TOUCH ? 1.35 : 1.8));
}

function spawnShotParticle(direction) {
  const particle = new THREE.Mesh(
    new THREE.SphereGeometry(.035, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x75f4ff })
  );
  particle.position.copy(camera.position).addScaledVector(direction, .7);
  particle.userData.velocity = direction.clone().multiplyScalar(45);
  particle.userData.life = .32;
  particles.push(particle);
  scene.add(particle);
}

function pulseTarget(target) {
  const original = target.scale.clone();
  target.scale.multiplyScalar(1.16);
  setTimeout(() => target.scale.copy(original), 110);
}

function flashHitMarker() {
  dom.hitMarker.classList.add("show");
  setTimeout(() => dom.hitMarker.classList.remove("show"), 120);
}

function showToast(message, kind = "") {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.className = `toast show ${kind}`.trim();
  toastTimer = setTimeout(() => { dom.toast.className = "toast"; }, 2400);
}

function setLoading(percent, label) {
  dom.loadingProgress.style.width = `${percent}%`;
  dom.loadingLabel.textContent = label;
}

function initAudio() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume?.();
  } catch {}
}

function playTone(type) {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const settings = {
    laser: [520, 160, .09, "sawtooth"],
    success: [520, 820, .18, "sine"],
    error: [180, 120, .16, "square"],
    jump: [240, 360, .11, "sine"]
  }[type] || [300, 300, .1, "sine"];
  oscillator.type = settings[3];
  oscillator.frequency.setValueAtTime(settings[0], now);
  oscillator.frequency.exponentialRampToValueAtTime(settings[1], now + settings[2]);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(.08, now + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, now + settings[2]);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + settings[2] + .02);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
