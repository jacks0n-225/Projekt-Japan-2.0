// Öffne das About-Overlay, wenn der About-Link im Footer angeklickt wird
document.getElementById('open-about').addEventListener('click', function (e) {
  e.preventDefault(); // Standard-Linkverhalten unterbinden
  document.getElementById('about-modal').style.display = 'block';
});

// Schließe das Overlay, wenn auf das "X" geklickt wird
document.querySelector('.about-close').addEventListener('click', function () {
  document.getElementById('about-modal').style.display = 'none';
});


// Hole alle Textabschnitte
const sections = document.querySelectorAll<HTMLElement>('.text-section');
// Hole die Nummern
const num1 = document.getElementById('num1') as HTMLElement;
const num2 = document.getElementById('num2') as HTMLElement;
const num3 = document.getElementById('num3') as HTMLElement;

let activeSectionIndex: number = 0; // Start: Abschnitt 1 (Index 0)
let lastScrollPos: number = window.pageYOffset || document.documentElement.scrollTop;

/**
 * Setzt basierend auf dem aktuellen Abschnitt (index) und der Scrollrichtung (direction)
 * die korrekten Klassen für die Nummern.
 */
function setActiveNumber(index: number, direction: 'down' | 'up'): void {
  // Zuerst alle Klassen entfernen:
  [num1, num2, num3].forEach((el) => {
    el.classList.remove('active', 'exit');
  });

  if (index === 0) {
    // Erster Abschnitt: Nummer 1 aktiv
    num1.classList.add('active');
  } else if (index === 1) {
    // Zweiter Abschnitt: Nummer 2 soll aktiv sein.
    if (direction === 'down') {
      // Vorwärts: Nummer 1 fährt aus (nach oben) und Nummer 2 erscheint von unten.
      num1.classList.add('exit');
      num2.classList.add('active');
    } else {
      // Rückwärts: Direkt Nummer 2 aktiv
      num2.classList.add('active');
    }
  } else if (index === 2) {
    // Dritter Abschnitt: Nummer 3 aktiv.
    if (direction === 'down') {
      // Vorwärts: Nummer 2 fährt aus und Nummer 3 erscheint.
      num2.classList.add('exit');
      num3.classList.add('active');
    } else {
      // Rückwärts: Nummer 3 verschwindet, Nummer 2 wird wieder aktiv.
      num3.classList.remove('active', 'exit');
      num2.classList.add('active');
    }
  }
}

/**
 * Ermittelt anhand des mittleren Viewport-Punktes, welcher Abschnitt gerade aktiv ist,
 * und aktualisiert die sticky Nummer entsprechend.
 */
function updateActiveSection(): void {
  const centerY = window.innerHeight / 2;
  let newIndex = activeSectionIndex; // Standard: bisheriger Index

  sections.forEach((section, index) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= centerY && rect.bottom >= centerY) {
      newIndex = index;
    }
  });

  const currentScrollPos = window.pageYOffset || document.documentElement.scrollTop;
  const direction: 'down' | 'up' = currentScrollPos > lastScrollPos ? 'down' : 'up';
  lastScrollPos = currentScrollPos;

  if (newIndex !== activeSectionIndex) {
    activeSectionIndex = newIndex;
    setActiveNumber(activeSectionIndex, direction);
  }
}

// Scroll-Event abhören
document.addEventListener('scroll', updateActiveSection);

// Initialer Zustand: Abschnitt 1 (Nummer 1 aktiv)
setActiveNumber(0, 'down');

// Hole das Cursor-Mask Element
const cursorMask = document.querySelector('.cursor-mask');

// Aktualisiere die Position der Maske bei jeder Mausbewegung
document.addEventListener('mousemove', (e) => {
  (cursorMask as HTMLElement).style.left = `${e.clientX}px`;
  (cursorMask as HTMLElement).style.top = `${e.clientY}px`;
});



// Erstelle einen Intersection Observer, um die Sichtbarkeit des three.js Containers zu überwachen
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Wenn three.js Container sichtbar ist, Maske ausblenden
      (cursorMask as HTMLElement).style.display = 'none';
    } else {
      // Ansonsten Maske anzeigen
      (cursorMask as HTMLElement).style.display = 'block';
    }
  });
}, { threshold: 0.1 });  // threshold anpassen, falls nötig




// Diese Funktion blendet den Cursor-Kreis aus, wenn der Container am unteren Rand erscheint
function checkScroll() {
  const rect = threeContainer.getBoundingClientRect();
  // Zum Beispiel, wenn der oberste Punkt des Containers < 50px vom Viewport-Top entfernt ist:
  if (rect.top < 50) {
    (cursorMask as HTMLElement).style.display = 'none';
  } else {
    (cursorMask as HTMLElement).style.display = 'block';
  }
}

document.addEventListener('scroll', checkScroll);

// Öffnet das About‑Overlay
document.getElementById('open-about').addEventListener('click', function (e) {
  e.preventDefault();
  document.getElementById('about-modal').style.display = 'block';
});

// Schließt das About‑Overlay
document.querySelector('.about-close').addEventListener('click', function () {
  document.getElementById('about-modal').style.display = 'none';
});


import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { KeyDisplay } from './utils';
import { CharacterControls } from './characterControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

let cameraPanActive = false;
let cameraPanStartTime = 0;
const cameraPanDuration = 2000; // Dauer in ms
let cameraPanInitialPos = new THREE.Vector3();
let cameraPanTargetPos = new THREE.Vector3();


const keysPressed: { [key: string]: boolean } = {};
const keyDisplayQueue = new KeyDisplay();

const backgroundAudio = new Audio("/sound/For the Broken Hearted.mp3");
backgroundAudio.loop = true;
backgroundAudio.volume = 0.5;

let waveAnimationActive = false;
let waveTime = 0;
const waveSpeed = 5;
const waveWidth = 1;
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
let wallMesh: THREE.Mesh;
let doorGroup: THREE.Group;
let controls: OrbitControls;
let initialCameraY = 1;
let resetBaseTime = 0;
let initialVerticalTimeOffset = 0;

let savedStopTime = 0;

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

let doorProgress = 0;
let scrollLocked = false;

let modelWidth = 0;
const doorWidth = 1.5;
const doorHeight = 2.5;
const cameraZ = -50;
const fov = 45;
const threeContainer = document.getElementById('three-container') as HTMLDivElement;
const doorSpacer = document.getElementById('door-scroll-spacer') as HTMLDivElement;
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.addEventListener('beforeunload', () => {
  window.scrollTo(0, 0);
});
let stopBulbMovement = false;
function stopSineMovementAndHideBulb() {
  stopBulbMovement = true;
  bulbMesh.visible = false;
}

let particlesAccelerateUpwards = false;
let particleLowerBound = 0.5;
const volumeHeight = 5 - particleLowerBound;
let specialResetActive = false;
let started = false;
let startTime = performance.now();
let mainAnimationStart = startTime;

const terminalSpeed = 100; // maximale Geschwindigkeit in y-Richtung, passe diesen Wert nach Bedarf an
const particleSpeedIncrease = 50; // Erhöhung pro Update

let whitePaneVelocity = 0;           // Startgeschwindigkeit
const whitePaneAcceleration = 50;     // Beschleunigung (Einheiten pro Sekunde², passe das an)
const whitePaneTerminalSpeed = 100;     // Maximale Geschwindigkeit (Terminal Speed)
const whitePaneStartY = -2000;         // Startposition y
const whitePaneTargetY = -0.1;         // Zielposition y


const particleClock = new THREE.Clock();
const overlay = document.createElement('div');
overlay.innerText = 'Enter';
overlay.style.position = 'absolute';
overlay.style.top = '50%';
overlay.style.left = '50%';
overlay.style.transform = 'translate(-50%, -50%)';
overlay.style.fontSize = '48px';
overlay.style.fontFamily = 'Arial, sans-serif';
overlay.style.color = 'white';
overlay.style.cursor = 'pointer';
overlay.style.display = 'none';
threeContainer.appendChild(overlay);

// === Globale Variablen für den zweiten weißen Bereich (Fall 5.2) und dessen Steuerung ===
let whitePane2: THREE.Mesh | null = null;
let whitePane2StartTime: number = 0;
let movingToWhitePane2: boolean = false;
const autoMoveSpeed: number = 2; // Geschwindigkeit für den automatischen Lauf des Characters (Einheit pro Sekunde)
let characterMovementLocked = false;

overlay.addEventListener('click', () => {
  started = true;
  mainAnimationStart = performance.now();
  initialCameraY = camera.position.y;
  
  controls.target.copy(new THREE.Vector3(
    camera.position.x + 1,
    camera.position.y,
    camera.position.z
  ));
  controls.update();
  
  overlay.style.display = 'none';
  controls.enabled = true;
  controls.enableRotate = false;
  
  backgroundAudio.play();
});

namespace DialogModule {
  export interface Question {
    id: string;
    text: string;
    option1: string;
    option2: string;
    next: {
      "1": string;
      "2": string;
    };
  }
  export const questionMap: { [id: string]: Question } = {
    // Frage 1 bis 3 (unverändert, da diese bereits passen)
    "1": {
      id: "1",
      text: `Frage 1: Morgendliche Entscheidung
Du wachst auf und stehst vor der Frage, ob du den Tag aktiv beginnst oder dich weiter in den Komfort deines Bettes einnistest.
„Deine innere Stimme flüstert: „Manchmal ist es besser, nichts zu verändern – der Rückzug bringt dir Sicherheit.“`,
      option1: "Du stehst auf und machst dich bereit, den Tag aktiv anzugehen.",
      option2: "Du bleibst liegen und verweilst im behaglichen Bett.",
      next: {
        "1": "2",
        "2": "4"
      }
    },
    "2": {
      id: "2",
      text: `Frage 2: Der Weg zur Uni
Egal, ob du aufgestanden bist oder im Bett geblieben, jetzt entscheidest du, ob du den Weg zur Uni antrittst oder den Tag in deinem eigenen Raum fortsetzt.
„Deine innere Stimme sagt dir: „Draußen lauert zu viel Lärm – hier bist du sicher.“`,
      option1: "Du begibst dich bewusst zur Universität und stellst dich dem Tag.",
      option2: "Du wählst, deinen eigenen Rhythmus beizubehalten und bleibst in deinem Raum.",
      next: {
        "1": "3",
        "2": "4"
      }
    },
    "3": {
      id: "3",
      text: `Frage 3: Uni-Projekt – Engagement oder Ablenkung?
An der Uni oder außerhalb deines Zimmers fokussierst du dich auf dein Projekt: Willst du aktiv Hilfe suchen oder dich lieber ablenken lassen?
„Deine innere Stimme erinnert dich: „Echtes Engagement kann weh tun – bleib lieber in deiner sicheren Einsamkeit.“`,
      option1: "Du gehst aktiv auf andere zu, bittest um Unterstützung und suchst Austausch.",
      option2: "Du lässt dich vom Handy ablenken, sodass die Minuten unbemerkt verstreichen.",
      next: {
        "1": "4",
        "2": "4"
      }
    },
    // Ab hier neu formatiert
    "4": {
      id: "4",
      text: `Frage 4: Prüfungen und Prüfungsdruck
Während du an deinem Projekt arbeitest, kündigt sich eine wichtige Prüfung an und der innere Druck steigt merklich an.
„Deine innere Stimme flüstert: „Der Kampf bringt nur weiteren Schmerz – manchmal ist es besser, sich zurückzuziehen.“`,
      option1: "Du nimmst den Druck an, strukturierst dich und gehst systematisch an die Prüfung heran.",
      option2: "Der ansteigende Druck lähmt dich, und du fühlst dich von der Last erdrückt.",
      next: {
        "1": "5",
        "2": "5"
      }
    },
    "5": {
      id: "5",
      text: `Frage 5: Wieder Zuhause – Das Familienessen
Zuhause wartet ein gemeinsames Essen auf dich.
„Deine innere Stimme sagt dir: „Nähe kann verletzen – die Einsamkeit bleibt dir stets treu.“`,
      option1: "Du nimmst an dem Familienessen teil, auch wenn es nur ein einzelner Moment der Nähe ist.",
      option2: "Du isst lieber allein in deinem Zimmer, um nicht permanent exponiert zu sein.",
      next: {
        "1": "6",
        "2": "6"
      }
    },
    "6": {
      id: "6",
      text: `Frage 6: Nachrichten und Party-Einladungen
Am nächsten Morgen checkst du dein Handy: Gruppen- und Privatnachrichten kündigen Pläne für das Wochenende an.
„Deine innere Stimme erinnert: „Kontakt erfordert Einsatz – der Rückzug schützt dich vor dem Schmerz.“`,
      option1: "Du reagierst aktiv und sagst zu, auch wenn du dir unsicher bist, ob du die nötige Energie hast.",
      option2: "Du liest die Nachrichten und antwortest nicht, um keinem direkten Kontakt ausgesetzt zu sein.",
      next: {
        "1": "7",
        "2": "7"
      }
    },
    "7": {
      id: "7",
      text: `Frage 7: Private Nachricht von einem Freund
Ein Freund schreibt dir: „Hey, kommst du Freitag zur Party? Wird cool!“ Du spürst dabei einen leichten Druck.
„Deine innere Stimme flüstert: „Erwarte nichts von anderen – deine Zeit ist besser allein.“`,
      option1: "Du sagst zu, auch wenn du dich innerlich kaum darauf freust.",
      option2: "Du sagst ab und nutzt eine Ausrede, um dich nicht rechtfertigen zu müssen.",
      next: {
        "1": "8",
        "2": "9"
      }
    },
    "8": {
      id: "8",
      text: `Frage 8: Auf der Party
Du bist auf der Party, doch der Abend erfüllt dich nicht mit Freude.
„Deine innere Stimme sagt: „Zwischen den Menschen fühlst du dich doch nur einsam – kehre lieber in die Stille zurück.“`,
      option1: "Du versuchst, in Gespräche zu kommen, um etwas von dem Abend abzubekommen.",
      option2: "Du entscheidest dich, nach Hause zu gehen, weil dich der Abend leer und schwer macht.",
      next: {
        "1": "9",
        "2": "9"
      }
    },
    "9": {
      id: "9",
      text: `Frage 9: Alltägliche Routine und Widerwille
Es ist Mittag, und der Regen draußen unterstreicht deine Trägheit. Jetzt entscheidest du, ob du dich dem Alltagsstress im Supermarkt stellst oder bequem Essen bestellst.
„Deine innere Stimme sagt dir: „Draußen erwartet nur Chaos – hier bist du in deiner eigenen Welt geborgen.“`,
      option1: "Du wählst den Weg in den dichten Verkehr und gehst einkaufen.",
      option2: "Du entscheidest dich für den bequemen Rückzug und bestellst Essen.",
      next: {
        "1": "10",
        "2": "11"
      }
    },
    "10": {
      id: "10",
      text: `Frage 10: Unangenehme Begegnung im öffentlichen Raum
Unterwegs erlebst du eine kurze, unangenehme Begegnung mit einem Fremden, die dich an der Verbindung zur Außenwelt zweifeln lässt.
„Deine innere Stimme flüstert: „Fremde Blicke erinnern dich an deine Verletzlichkeit – es ist leichter, unsichtbar zu bleiben.“`,
      option1: "Du reagierst kurz, versuchst dich zusammenzureißen und gehst weiter.",
      option2: "Du lässt die Begegnung auf dich wirken und ziehst dich emotional zurück.",
      next: {
        "1": "11",
        "2": "11"
      }
    },
    "11": {
      id: "11",
      text: `Frage 11: Familiäre Erwartungen und innere Stimmen
Zu Hause treffen dich die Erwartungen deiner Mutter, die nach deinem Uni-Fortschritt fragt, während eine innere Stimme deine Zweifel befeuert.
„Deine innere Stimme mahnt: „Worte können nicht heilen – lieber ist es, sich vor Verletzungen zu schützen.“`,
      option1: "Du versuchst, deine Sicht der Dinge zu erklären und dich zu rechtfertigen.",
      option2: "Du ziehst dich innerlich zurück und lässt die Kritik an dir abprallen.",
      next: {
        "1": "12",
        "2": "12"
      }
    },
    "12": {
      id: "12",
      text: `Frage 12: Digitaler Rückzug und Ablenkung
In deinem Zimmer suchst du Zuflucht in der digitalen Welt: YouTube, Foren und endloses Doomscrolling fesseln deine Aufmerksamkeit.
„Deine innere Stimme sagt: „Die digitale Welt bietet Ablenkung – weg von den Forderungen der Außenwelt.“`,
      option1: "Du lässt dich in hitzige Online-Diskussionen verstricken.",
      option2: "Du verlierst dich im endlosen Scrollen düsterer Nachrichten.",
      next: {
        "1": "13",
        "2": "13"
      }
    },
    "13": {
      id: "13",
      text: `Frage 13: Konfrontation mit Selbsthilfe und innerer Leere
Beim Durchsehen deines Briefkastens entdeckst du einen Flyer für ein Selbsthilfe-Treffen, der in dir einen Funken Hoffnung weckt – oder einfach nur Unbehagen auslöst.
„Deine innere Stimme flüstert: „Hilfe erscheint oft als Bürde – es ist einfacher, in der eigenen Leere zu verharren.“`,
      option1: "Du nimmst den Flyer ernst und überlegst, der Einladung vielleicht zu folgen.",
      option2: "Du legst den Flyer beiseite, unfähig, Hilfe anzunehmen.",
      next: {
        "1": "14",
        "2": "14"
      }
    },
    "14": {
      id: "14",
      text: `Frage 14: Soziale Vergleiche und persönliche Isolation
In den sozialen Netzwerken siehst du Bilder von Freunden, die ein erfülltes Leben führen, während deine Stimmung immer düsterer wird.
„Deine innere Stimme sagt: „Die glänzenden Fassaden anderer können deine Einsamkeit nicht füllen – es ist sicherer, dich selbst zu umarmen.“`,
      option1: "Du empfindest Neid und erkennst, wie anders dein Leben sich anfühlt.",
      option2: "Du reagierst gleichgültig und ziehst dich noch weiter in deine Isolation zurück.",
      next: {
        "1": "15",
        "2": "15"
      }
    },
    "15": {
      id: "15",
      text: `Frage 15: Erledigungsdruck und innere Zerrissenheit
Mehrere Nachrichten erinnern dich schmerzhaft daran, dass du deine Aufgaben nicht erledigt hast, während du zwischen Selbstmanipulation und Aktivität hin- und hergerissen bist.
„Deine innere Stimme flüstert: „Erwartungen sind oft unerreichbar – warum sich dem Druck weiter aussetzen?“`,
      option1: "Du versuchst, die Vorwürfe zu überwinden und aktiv zu werden.",
      option2: "Du gibst dem Druck nach und lässt die Vorwürfe an dir nagen.",
      next: {
        "1": "16",
        "2": "16"
      }
    },
    "16": {
      id: "16",
      text: `Frage 16: Familiäre Begegnungen und kritischer Austausch
Ein Anruf deines Vaters wirft alte Erwartungen auf: Du wirst zur Rede gestellt, wie es an der Uni läuft, und Kritik fließt in dein Herz.
„Deine innere Stimme sagt: „Manchmal sind Worte zu scharf – es ist besser, sich vor dem Schmerz zu schützen.“`,
      option1: "Du versuchst, deine Sicht zu erklären und dich den Erwartungen zu stellen.",
      option2: "Du ziehst dich emotional zurück und meidest die Auseinandersetzung.",
      next: {
        "1": "17",
        "2": "17"
      }
    },
    "17": {
      id: "17",
      text: `Frage 17: Beruflicher und sozialer Zwang
Dein Chef lädt die Abteilung zu einem Karaokeabend ein, während dein Drang, am Uni-Projekt zu arbeiten, von endlosen Ablenkungen untergraben wird.
„Deine innere Stimme flüstert: „Sozialer Zwang ist wie ein Käfig – manchmal ist es besser, die Tür zu schließen.“`,
      option1: "Du zwingst dich, am Team-Event teilzunehmen, um auch etwas zu erreichen.",
      option2: "Du lehnst den Abend ab und verlierst dich in der Ablenkung zuhause.",
      next: {
        "1": "18",
        "2": "18"
      }
    },
    "18": {
      id: "18",
      text: `Frage 18: Universitäre Herausforderungen und öffentliche Auftritte
Dein Tag kulminiert in der Vorbereitung auf eine wichtige Präsentation, doch der Gedanke, vor anderen aufzutreten, erscheint dir wie ein grelles Licht in deiner finsteren Welt.
„Deine innere Stimme sagt: „Öffentliche Blicke sind verletzend – es ist sicherer, in der Dunkelheit zu bleiben.“`,
      option1: "Du erkennst, dass der öffentliche Auftritt zu viel Schmerz birgt, und entscheidest dich, symbolisch die Tür zur Universität zu schließen.",
      option2: "Erinnerungen an Misserfolge lassen dich begreifen, dass du dich endgültig zurückziehst und alle Versuche, dich zu engagieren, aufgibst.",
      next: {
        "1": "19",
        "2": "19"
      }
    },
    "19": {
      id: "19",
      text: `Frage 19: Endloses Scrollen in düsteren Nachrichtenströmen
Du verbringst den Nachmittag damit, in negativen Online-Nachrichten und Foren zu stöbern. Der unaufhörliche Strom pessimistischer Berichte zieht dich in einen Sog aus Resignation.
„Deine innere Stimme flüstert: „Die Welt da draußen ist zu schwer – der digitale Rückzug schont dein zerbrechliches Selbst.“`,
      option1: "Die Schlagzeilen rauben dir jede Energie, und du entscheidest, den Tag ohne weiteren Uni-Kontakt zu überstehen.",
      option2: "Der endlose Fluss düsterer Nachrichten macht es dir unmöglich, Motivation zu finden – du verweilst weiter in der digitalen Dunkelheit.",
      next: {
        "1": "20",
        "2": "20"
      }
    },
    "20": {
      id: "20",
      text: `Frage 20: Stimmen im Kopf
Die Eindrücke des Tages und das Doomscrolling lösen einen intensiven inneren Dialog aus. Unterschiedliche Stimmen ringen in deinem Kopf um Einfluss – der alte Pessimismus versus ein letzter Funken Hoffnung.
„Deine innere Stimme sagt: „Die Stimmen mögen widersprüchlich sein, doch oft liegt der Trost im Alleinsein – bleibe in deiner sicheren Dunkelheit.“`,
      option1: "Eine zaghafte, doch aufmunternde Stimme fordert dich auf, den Kreislauf zu durchbrechen und einen Neuanfang zu wagen.",
      option2: "Die finstere Seite in dir bestätigt, dass ein ständiger Rückzug der einzig sichere Weg bleibt.",
      next: {
        "1": "21",
        "2": "21"
      }
    },
    "21": {
      id: "21",
      text: `Frage 21: Finale Frage
Du schließt die Tür endgültig und verweilst in der tröstlichen Dunkelheit, wo der Schmerz dir auf vertraute Weise gewährt bleibt. Deine innere Stimme flüstert: „Manchmal ist die Einsamkeit der einzige Ort, an dem du dich wirklich sicher fühlst – wähle weise, was dir Trost bringt.“`,
      option1: "Eine zaghafte, doch aufmunternde Stimme fordert dich auf, den Kreislauf zu durchbrechen und einen Neuanfang zu wagen.",
      option2: "Du öffnest die Tür und trittst ins grelle, unvorhersehbare Licht der Außenwelt – bereit, die Herausforderungen des Neuanfangs anzunehmen.",
      next: {
        "1": "Door",
        "2": "Fall"
      }
    }
  };
}

// Restlicher Code (UI, Eventlistener etc.)
const questionOverlay = document.getElementById('question-overlay') as HTMLDivElement;
const questionText = document.getElementById('question-text') as HTMLParagraphElement;
const answerButtons = document.querySelectorAll('.answer-btn');

let currentQuestionID: string = "1";
let lastAnswer: string | null = null;

function showQuestionOverlay() {
  const currentQuestion = DialogModule.questionMap[currentQuestionID];
  if (!currentQuestion) return;
  questionText.innerText = currentQuestion.text;
  const btn1 = questionOverlay.querySelector('.answer-btn[data-answer="1"]') as HTMLButtonElement;
  const btn2 = questionOverlay.querySelector('.answer-btn[data-answer="2"]') as HTMLButtonElement;
  btn1.innerText = currentQuestion.option1;
  btn2.innerText = currentQuestion.option2;
  questionOverlay.style.display = 'block';
}

function hideQuestionOverlay() {
  questionOverlay.style.display = 'none';
}

answerButtons.forEach(button => {
  button.addEventListener('click', (event: Event) => {
    const selectedAnswer = (event.currentTarget as HTMLButtonElement).getAttribute('data-answer') as "1" | "2";
    lastAnswer = selectedAnswer;
    hideQuestionOverlay();
    removeUI();
    resetBulb();
    
    // Hole die aktuelle Frage
    const currentQuestion = DialogModule.questionMap[currentQuestionID];
    // Ermittle die nächste Frage-ID anhand der aktuellen Frage und der ausgewählten Antwort
    const nextQuestionID = currentQuestion.next[selectedAnswer];
    console.log("Aktuelle Frage:", currentQuestion.id, "| Nächste Frage:", nextQuestionID);
    
    // Beispiele für Sonderlogik anhand der nächsten Frage-ID
    if (nextQuestionID === "Fall") {
      if (characterControls) {
        characterControls.triggerFall();
      }
      waveAnimationActive = true;
      waveTime = 0;
      stopSineMovementAndHideBulb();
      
      specialResetActive = true;
      particles.forEach(particle => {
        particle.velocity.y = Math.abs(particle.velocity.y) + particleSpeedIncrease;
        particle.velocity.y = Math.min(particle.velocity.y, terminalSpeed);
      });
      particleLowerBound = -20;
      
      if (!whitePane) {
        const paneRadius = 100;
        const paneSegments = 32;
        whitePane = new THREE.Mesh(
          new THREE.CircleGeometry(paneRadius, paneSegments),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        whitePane.position.set(camera.position.x, whitePaneStartY, camera.position.z);
        whitePane.lookAt(camera.position);
        scene.add(whitePane);
        whitePaneStartTime = performance.now();
      }
      
      if (characterControls) {
        const characterPos = characterControls.model.position;
        cameraPanTargetPos.set(characterPos.x - 0.0001, 5, 0);
        cameraPanInitialPos.copy(camera.position);
        cameraPanStartTime = performance.now();
        cameraPanActive = true;
      }
      
    } else if (nextQuestionID === "Door") {
      if (!whitePane2) {
        whitePane2 = new THREE.Mesh(
          new THREE.PlaneGeometry(doorWidth+1, doorHeight+1),
          new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        whitePane2.position.set(331, 1.5, 0);
        // Richte die Plane so aus, dass sie horizontal liegt (zum Beispiel als Boden)
        whitePane2.rotation.y = -Math.PI / 2;
        scene.add(whitePane2);
        whitePane2StartTime = performance.now();
        
      }
    }
    
    // Aktualisiere currentQuestionID auf den neuen Zustand
    currentQuestionID = nextQuestionID;
  });
});



let bulbLight: THREE.PointLight;
let bulbMat: THREE.MeshStandardMaterial;
let bulbMesh: THREE.Mesh;
let bulbStopped = false;
const targetBulbScale = new THREE.Vector3(1, 1, 1);
let bulbAnimationStarted = false;
let textShown = false;
let isResettingBulb = false;
let resetStartTime = 0;
const resetDuration = 2000;
const initialResetScale = new THREE.Vector3();
let initialResetIntensity = 0;
const horizontalSpeed = 2.5;
let bulbHorizontalOffset = 0;
let verticalTimeOffset = 0;
let savedY: number | null = null;
let distanceInterval = horizontalSpeed * 2 * Math.PI;
let nextStopDistance = distanceInterval;
const targetBulbY = 1;
const amplitude = 0.75;
let bulbBaseY = 1;
let bulbResumeStartTime = Date.now() * 0.0005;
let prevDoorProgress = 0;
let initialAnimationDone = false;
let buttonSprite1: THREE.Sprite | null = null;
let buttonSprite2: THREE.Sprite | null = null;
const labelDiv = document.createElement('div');
labelDiv.className = 'label';
labelDiv.innerText = 'Test';
labelDiv.style.display = 'none';
document.body.appendChild(labelDiv);
function createTextSprite(message: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSize = 20;
  ctx.font = `${fontSize}px Arial`;
  const textWidth = ctx.measureText(message).width;
  canvas.width = textWidth + 20;
  canvas.height = fontSize + 20;
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = 'white';
  ctx.fillText(message, 10, fontSize);
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  const aspect = canvas.width / canvas.height;
  const baseScale = 0.3;
  sprite.scale.set(baseScale * aspect, baseScale, 1);
  return sprite;
}
let baseBulbScale: THREE.Vector3 | null = null;
let baseRingScale: THREE.Vector3 | null = null;
function removeUI() {
  textShown = false;
}
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});
const particleGroup = new THREE.Group();

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  acceleration: number;
  resetThreshold: number;
}

const particles: Particle[] = [];
const particleCount = 500;
const particleGeometry = new THREE.SphereGeometry(0.01, 8, 8);
const particleMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 1,
});

for (let i = 0; i < particleCount; i++) {
  const mesh = new THREE.Mesh(particleGeometry, particleMaterial);
  mesh.position.set(
    Math.random() * 20 - 10,
    Math.random() * 4.5 + 0.5,
    Math.random() * 20 - 10
  );
  const velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.2,
    (Math.random() - 0.5) * 0.2,
    (Math.random() - 0.5) * 0.2
  );
  const acceleration = 0.3 + Math.random() * 0.2;
  const resetThreshold = 4.8 + Math.random() * 0.4;
  particles.push({ mesh, velocity, acceleration, resetThreshold });
  particleGroup.add(mesh);
}

let landscapeInstancedMesh: THREE.InstancedMesh | null = null;
let landscapePositions: THREE.Vector3[] = [];
function createParticleGeometry(mesh: THREE.Mesh, numParticles: number = 10): THREE.BufferGeometry {
  const sampler = new MeshSurfaceSampler(mesh).build();
  const positions = new Float32Array(numParticles * 3);
  const normals = new Float32Array(numParticles * 3);
  const tempPosition = new THREE.Vector3();
  const tempNormal = new THREE.Vector3();
  
  for (let i = 0; i < numParticles; i++) {
    sampler.sample(tempPosition, tempNormal);
    positions[i * 3]     = tempPosition.x;
    positions[i * 3 + 1] = tempPosition.y;
    positions[i * 3 + 2] = tempPosition.z;
    
    normals[i * 3]     = tempNormal.x;
    normals[i * 3 + 1] = tempNormal.y;
    normals[i * 3 + 2] = tempNormal.z;
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.computeBoundingBox();
  return geometry;
}
let characterControls: CharacterControls;
let prevCharacterPos = new THREE.Vector3();
let prevCameraPos = new THREE.Vector3();
let prevCameraTarget = new THREE.Vector3();
let initialPositionsSaved = false;
let ringMesh: THREE.Mesh | null = null;
function initScene(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  


  const aspect = threeContainer.clientWidth / threeContainer.clientHeight;
  camera = new THREE.PerspectiveCamera(fov, aspect, 1, 3000);
  camera.position.set(cameraZ, 1, 0);
  camera.rotation.order = "YXZ";

  const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
  renderer.shadowMap.enabled = true;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enableRotate = false;
  controls.enablePan = false;
  controls.enabled = false;
 
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * cameraZ;
  const visibleWidth = visibleHeight * aspect;

  const wallShape = new THREE.Shape();
  wallShape.moveTo(-visibleWidth / 2, -visibleHeight / 2);
  wallShape.lineTo(visibleWidth / 2, -visibleHeight / 2);
  wallShape.lineTo(visibleWidth / 2, visibleHeight / 2);
  wallShape.lineTo(-visibleWidth / 2, visibleHeight / 2);
  wallShape.lineTo(-visibleWidth / 2, -visibleHeight / 2);

  const doorHole = new THREE.Path();
  doorHole.moveTo(-doorWidth / 2, -doorHeight / 2);
  doorHole.lineTo(doorWidth / 2, -doorHeight / 2);
  doorHole.lineTo(doorWidth / 2, doorHeight / 2);
  doorHole.lineTo(-doorWidth / 2, doorHeight / 2);
  doorHole.lineTo(-doorWidth / 2, -doorHeight / 2);
  wallShape.holes.push(doorHole);

  const wallGeometry = new THREE.ShapeGeometry(wallShape);
  const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
  wallMesh.position.set(-10, 1, 0);
  wallMesh.rotation.y = Math.PI / -2;
  scene.add(wallMesh);

  doorGroup = new THREE.Group();
  const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
  doorGeometry.translate(doorWidth / 2, 0, 0);
  const doorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
  doorGroup.add(doorMesh);
  doorGroup.position.set(-9.25 - doorWidth / 2, 1, 0.75);
  doorGroup.rotation.y = -Math.PI / 2;
  scene.add(doorGroup);

  scene.add(particleGroup);
  light();

  const particleLoader = new GLTFLoader();
  particleLoader.load(
    'models/Zen Bonsai.glb',
    (gltf) => {
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const bbox = new THREE.Box3().setFromObject(mesh);
          modelWidth = bbox.max.x - bbox.min.x;
          mesh.visible = false;
          const particleGeo = createParticleGeometry(mesh, 500000);
          const positionsAttr = particleGeo.getAttribute('position');
          const count = positionsAttr.count;
          const sphereGeometry = new THREE.SphereGeometry(0.01, 8, 8);
          const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
          const instancedMesh = new THREE.InstancedMesh(sphereGeometry, sphereMaterial, count);
          instancedMesh.receiveShadow = true;
          landscapeInstancedMesh = instancedMesh;
          const dummy = new THREE.Object3D();
          for (let i = 0; i < count; i++) {
            const pos = new THREE.Vector3(positionsAttr.getX(i), positionsAttr.getY(i), positionsAttr.getZ(i));
            landscapePositions.push(pos);
            dummy.position.copy(pos);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
          }
          scene.add(instancedMesh);
        }
      });
    },
    undefined,
    (error) => {
      console.error('Fehler beim Laden des Zen-Modells:', error);
    }
  );



  new GLTFLoader().load('models/Character.glb', function (gltf) {
    // Erstelle eine Gruppe für den Charakter
    const characterGroup = new THREE.Group();
    const model = gltf.scene;
    
    // Verschiebe das Modell relativ zur Gruppe um den nötigen Offset
    // In diesem Beispiel: Verschiebe das Modell in x Richtung um -1,
    // sodass der Group-Ursprung (0,0,0) als Pivot den visuell mittigen Punkt darstellt
    model.position.z = +1;
    
    characterGroup.add(model);
    scene.add(characterGroup);
    
    const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap: Map<string, THREE.AnimationAction> = new Map();
    gltfAnimations.filter(a => a.name !== 'TPose').forEach((a: THREE.AnimationClip) => {
      if (['idle', 'running', 'walking', 'falling', 'freefall'].includes(a.name)) {
        animationsMap.set(a.name, mixer.clipAction(a));
      }
    });
    
    // Beachte: Passe in deinem CharacterControls-Konstruktor den neuen Group-Ursprung an,
    // z.B.:
    characterControls = new CharacterControls(characterGroup, mixer, animationsMap, controls, camera, 'idle');
  });
  
}



function light() {
  const bulbGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  bulbMat = new THREE.MeshStandardMaterial({
    emissive: 0xffffff,
    emissiveIntensity: 1,
    color: 0x000000
  });
  bulbMesh = new THREE.Mesh(bulbGeometry, bulbMat);
  bulbMesh.scale.set(0.005, 0.005, 0.005);
  
  bulbLight = new THREE.PointLight(0xffffff, 10, 7, 3);
  bulbLight.intensity = 0;
  
  bulbLight.add(bulbMesh);
  bulbLight.position.set(0, 1, 0);
  bulbLight.castShadow = true;
  scene.add(bulbLight);
  bulbLight.shadow.mapSize.width = 2048;
  bulbLight.shadow.mapSize.height = 2048;
  bulbLight.shadow.camera.near = 0.0001;
  bulbLight.shadow.camera.far = 50;
  bulbLight.shadow.bias = -0.0005;
}

function updateUI() {
  const footerLeft = document.querySelector('.footer-left') as HTMLElement;
  const footerCenter = document.querySelector('.footer-center') as HTMLElement;
  const musicButton = document.querySelector('#music-button') as HTMLElement;
  const headerTitle = document.querySelector('header h1') as HTMLElement;
  const musicBars = document.querySelectorAll('.music-button-bars .bar');

  // Wenn der Character blockiert ist (steht also still), sollen die Elemente wieder schwarz werden.
  if (characterMovementLocked) {
    footerLeft.style.color = '#000';
    footerCenter.style.color = '#000';
    musicButton.style.borderColor = '#000';
    headerTitle.style.color = '#000';
    musicBars.forEach(bar => {
      (bar as HTMLElement).style.background = '#000';
    });
    return;
  }

  // Vorherige Logik:
  // Falls doorProgress 1 ist und whitePane existiert und noch nicht ihr Ziel erreicht hat,
  // oder falls whitePane noch gar nicht existiert (z.B. vor Frage 5), dann UI weiß.
  // Sobald whitePane existiert und fertig ist, werden wieder schwarz gesetzt.
  if (doorProgress === 1 && (!whitePane || (whitePane && whitePane.position.y < whitePaneTargetY))) {
    footerLeft.style.color = '#fff';
    footerCenter.style.color = '#fff';
    musicButton.style.borderColor = '#fff';
    headerTitle.style.color = '#fff';
    musicBars.forEach(bar => {
      (bar as HTMLElement).style.background = '#fff';
    });
  } else {
    footerLeft.style.color = '#000';
    footerCenter.style.color = '#000';
    musicButton.style.borderColor = '#000';
    headerTitle.style.color = '#000';
    musicBars.forEach(bar => {
      (bar as HTMLElement).style.background = '#000';
    });
  }
}


// updateDoorProgress bleibt so wie bisher, aktualisiert doorProgress und führt andere
// Aktionen (wie das Entfernen der Tür-Elemente) aus. Entferne hier idealerweise das direkte
// Setzen der UI-Farben, damit updateUI die Kontrolle übernimmt.
function updateDoorProgress(): void {
  if (!doorGroup || !doorSpacer) return;
  if (scrollLocked) return;
  
  const rect = doorSpacer.getBoundingClientRect();
  let progress = (window.innerHeight - rect.top) / window.innerHeight;
  progress = Math.min(Math.max(progress, 0), 1);
  doorProgress = progress;
  
  doorGroup.rotation.y = Math.PI / 2 + doorProgress * (-Math.PI / 2);
  
  const finalCameraX = -10;
  camera.position.x = doorProgress === 1 ? finalCameraX : cameraZ - doorProgress * (cameraZ - finalCameraX);
  camera.updateProjectionMatrix();
  if (!started) {
    camera.lookAt(new THREE.Vector3(camera.position.x + 1, camera.position.y, camera.position.z));
  }
  
  if (doorProgress === 1) {
    overlay.style.display = 'block';
    lockScroll();
    if (scene.getObjectById(wallMesh.id)) {
      scene.remove(wallMesh);
    }
    if (scene.getObjectById(doorGroup.id)) {
      scene.remove(doorGroup);
    }
  } else {
    overlay.style.display = 'none';
  }
  
  // Hier kannst du (optional) einen kurzen UI-Update-Call machen, 
  // aber updateUI im Animate-Loop übernimmt den dauerhaften Zustand
  // updateUI();
}


function lockScroll(): void {
  if (scrollLocked) return;
  scrollLocked = true;
  document.body.style.overflow = 'hidden';
  window.addEventListener('touchmove', preventDefault, { passive: false });
  window.addEventListener('keydown', preventScrollKeys, { passive: false });
}

function preventDefault(e: Event) {
  e.preventDefault();
}

function preventScrollKeys(e: KeyboardEvent) {
  const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'];
  if (keys.includes(e.key)) {
    e.preventDefault();
  }
}

function resetBulb() {
  isResettingBulb = true;
  resetStartTime = performance.now();
  initialResetScale.copy(bulbMesh.scale);
  initialResetIntensity = bulbLight.intensity;
  if (savedY === null) {
    savedY = bulbLight.position.y;
  }
  if (ringMesh) {
    scene.remove(ringMesh);
    ringMesh = null;
    baseRingScale = null;
  }
  buttonSprite1 = null;
  buttonSprite2 = null;
  textShown = false;
  initialVerticalTimeOffset = verticalTimeOffset;
  resetBaseTime = performance.now();
  bulbAnimationStarted = false;
}

window.addEventListener('click', (event) => {
  const mouseClick = new THREE.Vector2();
  mouseClick.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouseClick.y = -(event.clientY / window.innerHeight) * 2 + 1;
  const clickRaycaster = new THREE.Raycaster();
  clickRaycaster.setFromCamera(mouseClick, camera);
  
  if (!textShown && bulbAnimationStarted) {
    const intersectsBulb = clickRaycaster.intersectObject(bulbMesh);
    if (intersectsBulb.length > 0) {
      textShown = true;
      showQuestionOverlay();
      return;
    }
  }
});

const clock = new THREE.Clock();

// Parameter für das zweiphasige Kamera-Panning
const totalDuration = 10000; // Gesamt-Dauer: 10.000ms
const fastPhaseDurationPercent = 0.5;  // Phase 1: bis 89% der Zeit (also ca. 8.900ms)
const slowPhaseDurationPercent = 0.5;  // Phase 2: die restlichen 11%

function updateBulbAnimation(delta: number) {
  if (stopBulbMovement) return;
  
  if (prevDoorProgress === 1 && doorProgress < 1 && bulbStopped) {
    bulbBaseY = 1;
    bulbStopped = false;
  }
  prevDoorProgress = doorProgress;
  
  if (!isResettingBulb && !bulbStopped) {
    bulbHorizontalOffset += horizontalSpeed * delta;
    bulbLight.position.x = bulbHorizontalOffset;
    const phase = 2 * Math.PI * ((bulbHorizontalOffset % distanceInterval) / distanceInterval);
    const newY = 1 + amplitude * Math.sin(phase);
    bulbLight.position.y = newY;
  }
  
  if (!bulbStopped && bulbHorizontalOffset >= nextStopDistance) {
    bulbStopped = true;
    bulbBaseY = bulbLight.position.y;
    if (!bulbAnimationStarted) {
      const ringGeometry = new THREE.RingGeometry(0.33, 0.35, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.copy(bulbLight.position);
      ringMesh.scale.set(0.1, 0.1, 0.1);
      scene.add(ringMesh);
      baseRingScale = ringMesh.scale.clone();
      
      bulbAnimationStarted = true;
    }
    nextStopDistance += distanceInterval;
  }
  
  if (bulbStopped && !isResettingBulb) {
    bulbLight.position.y = THREE.MathUtils.lerp(bulbLight.position.y, targetBulbY, delta * 4.0);
    bulbMesh.scale.lerp(targetBulbScale, delta * 4.0);
    if (!baseBulbScale) {
      baseBulbScale = bulbMesh.scale.clone();
    }
  }
  
  if (isResettingBulb) {
    const resetElapsed = performance.now() - resetStartTime;
    const t = Math.min(resetElapsed / resetDuration, 1);
    bulbMesh.scale.lerpVectors(initialResetScale, new THREE.Vector3(1, 1, 1), t);
    bulbLight.intensity = THREE.MathUtils.lerp(initialResetIntensity, 20, t);

    if (!savedY) savedY = bulbLight.position.y;
    const phaseOffset = Math.asin((savedY - 1) / amplitude);
    
    bulbHorizontalOffset += horizontalSpeed * delta;
    bulbLight.position.x = bulbHorizontalOffset;
    const phase = 2 * Math.PI * ((bulbHorizontalOffset % distanceInterval) / distanceInterval) + phaseOffset;
    bulbLight.position.y = 1 + amplitude * Math.sin(phase);

    if (t >= 1) {
      isResettingBulb = false;
      savedY = null;
      mainAnimationStart = performance.now();
      bulbStopped = false;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();


  
  // White Pane Animation – whitePane wird hier erzeugt und aktualisiert
  if (whitePane) {
    whitePaneVelocity += whitePaneAcceleration * delta;
    whitePaneVelocity = Math.min(whitePaneVelocity, whitePaneTerminalSpeed);
    whitePane.position.y += whitePaneVelocity * delta;
    
    if (whitePane.position.y >= whitePaneTargetY) {
      whitePane.position.y = whitePaneTargetY;
      whitePaneVelocity = 0;

      // Hier kannst du die Scroll-Wiederfreigabe etc. durchführen
      document.body.style.overflow = 'auto';
      window.removeEventListener('touchmove', preventDefault);
      window.removeEventListener('keydown', preventScrollKeys);
    }
  }

// Zusätzliche Logik für Fall 5.2 im Animate‑Loop
if (whitePane2) {
  const fadeDuration = 100; // Dauer in ms
  const fadeElapsed = performance.now() - whitePane2StartTime;
  const newOpacity = Math.min(fadeElapsed / fadeDuration, 1);
  (whitePane2.material as THREE.MeshBasicMaterial).opacity = newOpacity;

  if (characterControls) {
    // Hier prüfen wir, ob der Character bereits 5 Einheiten über x = 70 hinausgelaufen ist.
    if (characterControls.model.position.x > 330 + 8.8) {
      movingToWhitePane2 = false;
      document.body.style.overflow = 'auto';
      window.removeEventListener('touchmove', preventDefault);
      window.removeEventListener('keydown', preventScrollKeys);
      whitePane2 = null;
      
      // Bewegung des Characters sperren
      characterMovementLocked = true;
    }
  }
}

  
  const particleDelta = particleClock.getDelta();
  particles.forEach(particle => {
    if (specialResetActive) {
      particle.velocity.y += particle.acceleration * particleDelta;
      const maxYSpeed = 5;
      if (particle.velocity.y > maxYSpeed) {
        particle.velocity.y = maxYSpeed;
      }
    }
    particle.mesh.position.addScaledVector(particle.velocity, particleDelta);
    const relX = particle.mesh.position.x - bulbLight.position.x;
    const relZ = particle.mesh.position.z - bulbLight.position.z;
    if (relX > 10) particle.mesh.position.x -= 20;
    else if (relX < -10) particle.mesh.position.x += 20;
    if (relZ > 10) particle.mesh.position.z -= 20;
    else if (relZ < -10) particle.mesh.position.z += 20;
    if (particle.mesh.position.y > particle.resetThreshold) {
      const currentYVelocity = particle.velocity.y;
      if (specialResetActive) {
        particle.mesh.position.y = -5 + Math.random() * 0.2;
      } else {
        particle.mesh.position.y -= volumeHeight;
      }
      particle.mesh.position.x = Math.random() * 20 - 10;
      particle.mesh.position.z = Math.random() * 20 - 10;
      particle.velocity.y = currentYVelocity;
      particle.resetThreshold = 4.8 + Math.random() * 0.4;
    }
  });
  
  if (!started) {
    renderer.render(scene, camera);
    return;
  }
  
  raycaster.setFromCamera(mouse, camera);
  if (characterControls && !characterMovementLocked) {
    characterControls.update(delta, keysPressed);
  }
  controls.update();
  
  if (!initialPositionsSaved && characterControls) {
    prevCharacterPos.copy(characterControls.model.position);
    prevCameraPos.copy(camera.position);
    prevCameraTarget.copy(controls.target);
    initialPositionsSaved = true;
  }
  
  const elapsed = (performance.now() - mainAnimationStart) / 1000;
  if (!initialAnimationDone && elapsed < 2) {
    const fraction = elapsed / 2;
    const scaleVal = THREE.MathUtils.lerp(0.005, 1, fraction);
    bulbMesh.scale.set(scaleVal, scaleVal, scaleVal);
    bulbLight.intensity = THREE.MathUtils.lerp(0, 20, fraction);
    
    bulbHorizontalOffset += horizontalSpeed * delta;
    bulbLight.position.x = bulbHorizontalOffset;
    
    const phase = 2 * Math.PI * ((bulbHorizontalOffset % distanceInterval) / distanceInterval);
    bulbLight.position.y = targetBulbY + amplitude * Math.sin(phase);
  } else {
    initialAnimationDone = true;
    updateBulbAnimation(delta);
  }
  
  if (ringMesh) {
    ringMesh.position.copy(bulbLight.position);
    ringMesh.lookAt(camera.position);
    if (ringMesh.scale.x < 1.0) {
      ringMesh.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 4.0);
    }
    ringMesh.rotation.z += delta * 0.5;
  }
  
  const hoverIntersects = raycaster.intersectObject(bulbMesh);
  if (hoverIntersects.length > 0 && bulbStopped && ringMesh) {
    const pulseFactor = 1 + 0.1 * Math.sin(performance.now() * 0.005);
    if (!baseBulbScale) baseBulbScale = bulbMesh.scale.clone();
    if (!baseRingScale) baseRingScale = ringMesh.scale.clone();
    
    const ringHoverMultiplier = 1.2;
    const targetBulbScale = baseBulbScale.clone().multiplyScalar(pulseFactor);
    const targetRingScale = baseRingScale.clone().multiplyScalar(ringHoverMultiplier * pulseFactor);
    
    bulbMesh.scale.lerp(targetBulbScale, delta * 4.0);
    ringMesh.scale.lerp(targetRingScale, delta * 4.0);
  }
  
  if (characterControls && bulbLight) {
    const diffXZ = new THREE.Vector3(
      characterControls.model.position.x - bulbLight.position.x,
      0,
      characterControls.model.position.z - bulbLight.position.z
    );
    const distanceXZ = diffXZ.length();
    if (distanceXZ < 2) {
      characterControls.model.position.copy(prevCharacterPos);
      camera.position.copy(prevCameraPos);
      controls.target.copy(prevCameraTarget);
    } else {
      prevCharacterPos.copy(characterControls.model.position);
      prevCameraPos.copy(camera.position);
      prevCameraTarget.copy(controls.target);
    }
  }
  
  if (landscapeInstancedMesh) {
    const dummy = new THREE.Object3D();
    if (waveAnimationActive) {
      waveTime += delta;
    }
  
    for (let i = 0; i < landscapePositions.length; i++) {
      const originalPos = landscapePositions[i];
      const offsetCount = Math.round((bulbLight.position.x - originalPos.x) / modelWidth);
      const newPos = new THREE.Vector3(
        originalPos.x + offsetCount * modelWidth,
        originalPos.y,
        originalPos.z
      );
      const dx = newPos.x - bulbLight.position.x;
      const dz = newPos.z - bulbLight.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
  
      dummy.position.copy(newPos);
      if (waveAnimationActive) {
        const waveRadius = waveTime * waveSpeed;
        const diff = Math.abs(distance - waveRadius);
        let scale = 0;
        if (diff < waveWidth) {
          scale = 0.5 * (1 - diff / waveWidth);
        }
        dummy.scale.set(scale, scale, scale);
      } else {
        if (distance < 7) {
          dummy.scale.set(0.5, 0.5, 0.5);
        } else {
          dummy.scale.set(0, 0, 0);
        }
      }
  
      dummy.updateMatrix();
      landscapeInstancedMesh.setMatrixAt(i, dummy.matrix);
    }
    landscapeInstancedMesh.instanceMatrix.needsUpdate = true;
  }
  

  
  console.log("Camera Position:",
    "x:", camera.position.x.toFixed(3),
    "y:", camera.position.y.toFixed(3),
    "z:", camera.position.z.toFixed(3)
  );

// Kamera-Panning (Tweening) nach Frage 5
if (cameraPanActive) {
  const elapsed = performance.now() - cameraPanStartTime;
  const t = Math.min(elapsed / cameraPanDuration, 1);
  
  // Optional: Ease-Funktion, z.B. easeInOutQuad
  const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const easedT = easeInOutQuad(t);
  
  camera.position.lerpVectors(cameraPanInitialPos, cameraPanTargetPos, easedT);
  
  // Die Kamera soll immer auf den Character schauen:
  if (characterControls) {
    camera.lookAt(characterControls.model.position);
  }

  // Wenn das Tweening vollendet ist, deaktiviere das Panning
  if (t >= 1) {
    cameraPanActive = false;
  }
}

updateUI();

  renderer.render(scene, camera);
}
const musicButton = document.getElementById('music-button') as HTMLButtonElement;
let musicActive: boolean = true;

musicButton.addEventListener('click', () => {
  musicActive = !musicActive;
  if (!musicActive) {
    musicButton.classList.add('stopped');
    backgroundAudio.pause();
  } else {
    musicButton.classList.remove('stopped');
    if (started) {
      backgroundAudio.play();
    }
  }
});
window.addEventListener('scroll', updateDoorProgress);
window.addEventListener('resize', () => {
  const aspect = threeContainer.clientWidth / threeContainer.clientHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
});
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  keyDisplayQueue.updatePosition();
}
document.addEventListener('keydown', (event) => {
  keyDisplayQueue.down(event.key);
  if (event.key === "Shift" && characterControls) {
    characterControls.switchRunToggle(true);
  } else {
    if (event.key.startsWith('Arrow')) {
      keysPressed[event.key] = true;
    } else {
      keysPressed[event.key.toLowerCase()] = true;
    }
  }
}, false);
document.addEventListener('keyup', (event) => {
  keyDisplayQueue.up(event.key);
  if (event.key === "Shift" && characterControls) {
    characterControls.switchRunToggle(false);
  } else {
    if (event.key.startsWith('Arrow')) {
      keysPressed[event.key] = false;
    } else {
      keysPressed[event.key.toLowerCase()] = false;
    }
  }
}, false);
window.addEventListener('load', () => {
  window.scrollTo(0, 0);
  initScene();
  animate();
});

// === Globale Variablen für den weißen Bereich (whitePane) und dessen Startzeitpunkt ===
let whitePane: THREE.Mesh | null = null;
let whitePaneStartTime: number = 0;


