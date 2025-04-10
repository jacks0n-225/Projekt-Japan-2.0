import { KeyDisplay } from './utils';
import { CharacterControls } from './characterControls';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

let started = false;

let startTime = performance.now();
let mainAnimationStart = startTime; 

const particleClock = new THREE.Clock();

// OVERLAY: Zeigt "Enter" in der Mitte des Bildschirms
const overlay = document.createElement('div');
overlay.innerText = 'Enter';
overlay.style.position = 'fixed';
overlay.style.top = '50%';
overlay.style.left = '50%';
overlay.style.transform = 'translate(-50%, -50%)';
overlay.style.fontSize = '48px';
overlay.style.fontFamily = 'Arial, sans-serif';
overlay.style.color = 'white';
overlay.style.cursor = 'pointer';
document.body.appendChild(overlay);

overlay.addEventListener('click', () => {
    started = true;
    mainAnimationStart = performance.now();
    document.body.removeChild(overlay);
});

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);  // Hintergrund: Schwarz

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// ÄNDERN: Kamera-Startposition: Um 180° gedreht (entspricht -5 statt 5 in X)
camera.position.set(-5, 5, 0);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.update();

// LIGHTS & BULB
let bulbLight: THREE.PointLight;
let bulbMat: THREE.MeshStandardMaterial;
let bulbMesh: THREE.Mesh;
let bulbStopped = false;

// Variablen für die spätere Animation (Schrumpfen & Ring)
const targetBulbScale = new THREE.Vector3(0.5, 0.5, 0.5);  // Zielgröße nach Schrumpfen
let targetBulbY = 1.5;

// Flag, ob die Bulb-Animation gestartet wurde
let bulbAnimationStarted = false;

// Flag, ob der Textmodus (Hover-Effekt) aktiviert wurde
let textShown = false;

// Variablen für den Reset-Tween:
let isResettingBulb = false;
let resetStartTime = 0;
const resetDuration = 2000; // Dauer des Resets in Millisekunden
const initialResetScale = new THREE.Vector3();
let initialResetIntensity = 0;

let bulbHorizontalOffset = 0;

let verticalTimeOffset = 0;

let savedY: number | null = null;

// Globale Variablen für die Spiellogik (Fragen/Antworten)
let firstAnswer: string | null = null;
let questionStage: number = 1; // For questions 1 to 10

// Neues: Array mit 10 Fragen (Moves)
const questions = [
    {
        text: "It’s a warm Tuesday morning. Your alarm clock rings, but your body feels heavy. You know you should get up for work or university, but your thoughts keep spinning. The idea of talking to people feels overwhelming.",
        option1: "You force yourself out of bed, but your head pounds and everything feels distant.",
        option2: "You stay in bed, telling yourself you'll get up later – but then it’s already afternoon."
    },
    {
        text: "Wednesday evening. Your friend texts you: 'Hey, wanna hang out? We haven’t seen you in a while.' Your fingers hover over the keyboard, but your chest tightens.",
        option1: "'Sure, let's make plans!' – but secretly, you hope they don’t follow up.",
        option2: "You leave the message unread. It’s just simpler that way."
    },
    {
        text: "You haven’t seen anyone in a week. Your room feels strangely small, but the thought of going outside makes you anxious. Your heart beats faster just imagining running into someone.",
        option1: "You open a window to get some fresh air. At least that.",
        option2: "You stay in bed, pulling the covers over your head."
    },
    {
        text: "Your parents ask how university/work is going. They sound concerned, but you don’t have a good answer.",
        option1: "'Everything’s fine, don’t worry.' – even though that’s a lie.",
        option2: "'I think I need a break.' – but you know they won’t understand."
    },
    {
        text: "It’s 3 AM. Your screen glows in the dark. You can’t remember the last time you actually felt happy.",
        option1: "'Tomorrow will be better.' – but you don’t really believe it.",
        option2: "'I'm useless.'"
    },
    {
        text: "Someone in deiner Familie schlägt vor, dass du mit einem Therapeuten sprichst. 'Maybe it could help.'",
        option1: "'Yeah, maybe you’re right.' – but you never actually book an appointment.",
        option2: "'I don’t need help, I’m fine.'"
    },
    {
        text: "You receive an email about a job or school opportunity. It could be a new beginning. But just the thought of entering a new environment paralyzes you.",
        option1: "You ignore the email and tell yourself you’ll deal with it later.",
        option2: "You start the application but close the window before finishing."
    },
    {
        text: "You haven’t left the house in a month. Your fridge is empty. Your stomach growls.",
        option1: "You order food online.",
        option2: "You eat less to avoid going outside."
    },
    {
        text: "You spend your time in online forums, talking to others who feel the same. There’s comfort in that, but also the growing belief that there’s no way out.",
        option1: "'Maybe I’m not alone.'",
        option2: "'This is my home now.'"
    },
    {
        text: "You stand in front of a mirror. Your face feels unfamiliar. Your eyes look tired. It’s quiet. You could go outside. Or not.",
        option1: "You turn away and sit back at your computer.",
        option2: "You open the door, but your heart pounds so fast that you shut it again."
    }
];

// Globale Variablen für zusätzliche Button-Sprites (statt dem ursprünglichen "Reset"-Button)
let buttonSprite1: THREE.Sprite | null = null;
let buttonSprite2: THREE.Sprite | null = null;

// Funktion zum Erstellen der Bulb
function light() {
    const bulbGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    bulbMat = new THREE.MeshStandardMaterial({
        emissive: 0xffffff,
        emissiveIntensity: 1,
        color: 0x000000
    });
    bulbMesh = new THREE.Mesh(bulbGeometry, bulbMat);
    // Anfangswert Bulb
    bulbMesh.scale.set(0.005, 0.005, 0.005);
    
    bulbLight = new THREE.PointLight(0xffffff, 50000, 7, 3);
    // Licht anfangs ausgeschaltet
    bulbLight.intensity = 0;
    
    bulbLight.add(bulbMesh);
    bulbLight.position.set(0, 2, 0);
    bulbLight.castShadow = true;
    scene.add(bulbLight);
    bulbLight.shadow.mapSize.width = 2048;
    bulbLight.shadow.mapSize.height = 2048;
    bulbLight.shadow.camera.near = 0.0001;
    bulbLight.shadow.camera.far = 50;
    bulbLight.shadow.bias = -0.0005;
}

light();
// Initiale horizontale Position
bulbHorizontalOffset = bulbLight.position.x;

// Globaler Ring
let ringMesh: THREE.Mesh | null = null;

// Globale Variable für Hover-Strich
let hoverLineMesh: THREE.Mesh | null = null;

// HTML-Label, "Test" 
const labelDiv = document.createElement('div');
labelDiv.className = 'label';
labelDiv.innerText = 'Test';
labelDiv.style.display = 'none';
document.body.appendChild(labelDiv);

// **Text-Sprite** 
let textSprite: THREE.Sprite | null = null;

// Hilfsfunktion für Text-Sprites
function createTextSprite(message: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const fontSize = 32;
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

// Entfernen der UI-Elemente
function removeUI() {
    if (hoverLineMesh) {
        if (textSprite) {
            hoverLineMesh.remove(textSprite);
            textSprite = null;
        }
        if (buttonSprite1) {
            hoverLineMesh.remove(buttonSprite1);
            buttonSprite1 = null;
        }
        if (buttonSprite2) {
            hoverLineMesh.remove(buttonSprite2);
            buttonSprite2 = null;
        }
    }
    textShown = false;
}

// Raycaster & Mouse-Tracking 
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// PARTICLES (zusätzlich zu unserem neuen Untergrund)
const particleGroup = new THREE.Group();
scene.add(particleGroup);

interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
}
const particles: Particle[] = [];
const particleCount = 500;
const particleGeometry = new THREE.SphereGeometry(0.005, 8, 8);
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
    particles.push({ mesh, velocity });
    particleGroup.add(mesh);
}

// Globale Variablen für den InstancedMesh aus Landscape.glb und zum Speichern der Originalpositionen
let landscapeInstancedMesh: THREE.InstancedMesh | null = null;
let landscapePositions: THREE.Vector3[] = [];

// NEUER UNTERGRUND: Partikel aus Zen.glb
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

const particleLoader = new GLTFLoader();
particleLoader.load(
  'models/Zen Bonsai.glb',
  (gltf) => {
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Originales Mesh ausblenden
        mesh.visible = false;
        
        // Partikelgeometrie aus dem Modell erzeugen
        const particleGeometry = createParticleGeometry(mesh, 500000);

        // InstancedMesh mit Kugeln statt simplen Punkten
        const positionsAttr = particleGeometry.getAttribute('position');
        const count = positionsAttr.count;
        const sphereGeometry = new THREE.SphereGeometry(0.01, 8, 8);
        const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const instancedMesh = new THREE.InstancedMesh(sphereGeometry, sphereMaterial, count);
        instancedMesh.receiveShadow = true;

        // Speichere Instanz und Positionen
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

// MODEL WITH ANIMATIONS
let characterControls: CharacterControls;
let prevCharacterPos = new THREE.Vector3();
new GLTFLoader().load('models/Character.glb', function (gltf) {
    const model = gltf.scene;
    model.traverse((object: any) => {
        if (object.isMesh) object.castShadow = true;
    });
    scene.add(model);
    const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
    console.log('Geladene Animationen:', gltfAnimations.map(a => a.name));
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap: Map<string, THREE.AnimationAction> = new Map();
    gltfAnimations.filter(a => a.name !== 'TPose').forEach((a: THREE.AnimationClip) => {
        if (['idle', 'running', 'walking', 'falling', 'freefall'].includes(a.name)) {
            animationsMap.set(a.name, mixer.clipAction(a));
        }
    });
    characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, camera, 'idle');
    startFallTimer();
});

// CONTROL KEYS
const keysPressed: any = {};
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key);
    if (event.key === "Shift" && characterControls) {
        characterControls.switchRunToggle(true);
    } else {
        keysPressed[event.key.toLowerCase()] = true;
    }
}, false);
document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    if (event.key === "Shift" && characterControls) {
        characterControls.switchRunToggle(false);
    } else {
        keysPressed[event.key.toLowerCase()] = false;
    }
}, false);

const clock = new THREE.Clock();

// Fall-Timer
let fallTimer: number | null = null;
function startFallTimer() {
    if (fallTimer !== null) clearTimeout(fallTimer);
    fallTimer = window.setTimeout(() => {
        if (characterControls) {
            if (characterControls.currentAction === 'walking' || characterControls.currentAction === 'running') {
                characterControls.triggerFall();
            } else {
                characterControls.setFallPending(true);
            }
        }
        fallTimer = null;
    }, 10000);
}
function clearFallTimer() {
    if (fallTimer !== null) {
        clearTimeout(fallTimer);
        fallTimer = null;
    }
}

// Reset-Funktion
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
    }
    if (hoverLineMesh) {
        scene.remove(hoverLineMesh);
        hoverLineMesh = null;
    }
    textSprite = null;
    buttonSprite1 = null;
    buttonSprite2 = null;
    textShown = false;
}

// Klick-Listener
window.addEventListener('click', (event) => {
    const mouseClick = new THREE.Vector2();
    mouseClick.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseClick.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const clickRaycaster = new THREE.Raycaster();
    clickRaycaster.setFromCamera(mouseClick, camera);

    // Wenn Antwort-Buttons angezeigt werden, prüfe ob einer angeklickt wurde
    if (questionStage >= 1 && questionStage <= 10 && buttonSprite1 && buttonSprite2) {
        if (clickRaycaster.intersectObject(buttonSprite1).length > 0) {
            removeUI();
            questionStage++;
            resetBulb();
            return;
        }
        if (clickRaycaster.intersectObject(buttonSprite2).length > 0) {
            removeUI();
            questionStage++;
            resetBulb();
            return;
        }
    }

    // Wenn noch keine UI angezeigt wird, und wir uns in einer Fragephase (1-10) befinden, 
    // so zeige beim Klick auf die Bulb die entsprechende Frage und Antwortmöglichkeiten.
    if (questionStage >= 1 && questionStage <= 10 && bulbAnimationStarted && !textShown) {
        const intersectsBulb = clickRaycaster.intersectObject(bulbMesh);
        if (intersectsBulb.length > 0) {
            textShown = true;
            if (hoverLineMesh) {
                const currentQuestion = questions[questionStage - 1];
                textSprite = createTextSprite(currentQuestion.text);
                textSprite.visible = true;
                textSprite.position.set(0.9, 0.3, 0);
                hoverLineMesh.add(textSprite);
                buttonSprite1 = createTextSprite(currentQuestion.option1);
                buttonSprite1.visible = true;
                buttonSprite1.position.set(0.9, 0.1, 0);
                hoverLineMesh.add(buttonSprite1);
                buttonSprite2 = createTextSprite(currentQuestion.option2);
                buttonSprite2.visible = true;
                buttonSprite2.position.set(0.9, -0.1, 0);
                hoverLineMesh.add(buttonSprite2);
            }
            return;
        }
    }
});

// ANIMATE
function animate() {
    const delta = clock.getDelta();

    const particleDelta = particleClock.getDelta();
    particles.forEach(particle => {
        particle.mesh.position.addScaledVector(particle.velocity, particleDelta);
        const relX = particle.mesh.position.x - bulbLight.position.x;
        const relZ = particle.mesh.position.z - bulbLight.position.z;
        if (relX > 10) particle.mesh.position.x -= 20;
        else if (relX < -10) particle.mesh.position.x += 20;
        if (relZ > 10) particle.mesh.position.z -= 20;
        else if (relZ < -10) particle.mesh.position.z += 20;
        if (particle.mesh.position.y < 0.5) {
            particle.mesh.position.y = 0.5;
            particle.velocity.y = Math.abs(particle.velocity.y);
        } else if (particle.mesh.position.y > 5) {
            particle.mesh.position.y = 5;
            particle.velocity.y = -Math.abs(particle.velocity.y);
        }
    });
    
    if (!started) {
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
        return;
    }
    
    const elapsed = (performance.now() - mainAnimationStart) / 1000;
    
    raycaster.setFromCamera(mouse, camera);
    
    if (characterControls) {
        characterControls.update(delta, keysPressed);
        if (!characterControls.isFallen &&
            (characterControls.currentAction === 'walking' || characterControls.currentAction === 'running') &&
            fallTimer === null) {
            startFallTimer();
        } else if (characterControls.currentAction === 'idle') {
            clearFallTimer();
        }
    }
    orbitControls.update();

    // Kamera-Animation während der ersten 2 Sekunden (zusammen mit dem Bulb-Licht)
    if (elapsed < 2) {
        const fraction = elapsed / 2;
        // Nutze eine weiche Ramp (Easing) – hier smoothFraction:
        const smoothFraction = Math.sin((fraction * Math.PI) / 2);

        // Bulb-Animation (wie gehabt):
        const scaleVal = THREE.MathUtils.lerp(0.005, 1, smoothFraction);
        bulbMesh.scale.set(scaleVal, scaleVal, scaleVal);
        const intensityFraction = Math.max(0, (elapsed - 0.5) / 1.5);
        bulbLight.intensity = THREE.MathUtils.lerp(0, 20, intensityFraction);
        const horizontalSpeed = 2.5;
        bulbHorizontalOffset += horizontalSpeed * delta;
        bulbLight.position.x = bulbHorizontalOffset;
        
        // ÄNDERN: Kamera Pedestal Werte – hier wird die Kamerahöhe interpoliert
        // Aktuell: von camInitialY bis camFinalY
        const camInitialY = 5;   // ÄNDERN: Startwert der Kamerahöhe (muss zum Anfang passen)
        const camFinalY = 1;     // ÄNDERN: Endwert der Kamerahöhe (Ziel nach Pedestal)
        camera.position.y = THREE.MathUtils.lerp(camInitialY, camFinalY, smoothFraction);

        // ÄNDERN: Kamera Tilt (Blickrichtung) wird interpoliert
        // Hier nutzen wir die gleichen Werte wie bei der Pedestal-Interpolation.
        // Initialer Blick: auf (character.x, camInitialY, character.z)
        // Finaler Blick: auf (character.x, character.y + 1, character.z)
        if (characterControls) {
            const initialTarget = new THREE.Vector3(
                characterControls.model.position.x,
                camInitialY, // ÄNDERN: Muss zum Startwert passen
                characterControls.model.position.z
            );
            const finalTarget = new THREE.Vector3(
                characterControls.model.position.x,
                characterControls.model.position.y + 1, // Endziel des Blicks
                characterControls.model.position.z
            );
            const newTarget = new THREE.Vector3().lerpVectors(initialTarget, finalTarget, smoothFraction);
            orbitControls.target.copy(newTarget);
            camera.lookAt(newTarget);
        }
    }
    
    // Sicherstellen, dass der Character nicht näher als 2 Einheiten (horizontal) an die Bulb herankommt,
    // ohne die Y-Position (Bodenhöhe) zu beeinflussen:
    if (characterControls && bulbLight) {
        const diffXZ = new THREE.Vector3(
            characterControls.model.position.x - bulbLight.position.x,
            0,
            characterControls.model.position.z - bulbLight.position.z
        );
        const distanceXZ = diffXZ.length();
        if (distanceXZ < 2) {
            characterControls.model.position.copy(prevCharacterPos);
        } else {
            prevCharacterPos.copy(characterControls.model.position);
        }
    }
    
    // (Der Schachbrett-Code wurde entfernt – stattdessen zeigt der Zen-Partikel-Untergrund)
    
    if (bulbMesh && bulbLight) {
        if (isResettingBulb) {
            const resetElapsed = performance.now() - resetStartTime;
            const t = Math.min(resetElapsed / resetDuration, 1);
            bulbMesh.scale.lerpVectors(initialResetScale, new THREE.Vector3(1, 1, 1), t);
            bulbLight.intensity = THREE.MathUtils.lerp(initialResetIntensity, 20, t);
            const baseHorizontalSpeed = 2.5;
            const accelerationFactor = 1 + t;
            bulbHorizontalOffset += baseHorizontalSpeed * accelerationFactor * delta;
            bulbLight.position.x = bulbHorizontalOffset;
            bulbLight.position.y = savedY!;
            if (t >= 1) {
                isResettingBulb = false;
                verticalTimeOffset = Math.acos((savedY! - 1.25) / 0.75) - (Date.now() * 0.0005);
                savedY = null;
                mainAnimationStart = performance.now() - 2000;
                bulbStopped = false;
                bulbAnimationStarted = false;
            }
        } else {
            if (elapsed < 2) {
                // Dieser Zweig wird bereits im if(elapsed < 2) abgehandelt.
            } else if (elapsed >= 2 && elapsed < 3) {
                bulbMesh.scale.set(1, 1, 1);
                const lightFraction = (elapsed - 2) / 1;
                bulbLight.intensity = THREE.MathUtils.lerp(bulbLight.intensity, 20, lightFraction);
                const time = Date.now() * 0.0005 + verticalTimeOffset;
                bulbLight.position.y = Math.cos(time) * 0.75 + 1.25;
                const horizontalSpeed = 2.5;
                bulbHorizontalOffset += horizontalSpeed * delta;
                bulbLight.position.x = bulbHorizontalOffset;
            } else if (elapsed >= 3 && elapsed < 5) {
                const time = Date.now() * 0.0005 + verticalTimeOffset;
                bulbLight.position.y = Math.cos(time) * 0.75 + 1.25;
                bulbLight.intensity = 20;
                const horizontalSpeed = 2.5;
                bulbHorizontalOffset += horizontalSpeed * delta;
                bulbLight.position.x = bulbHorizontalOffset;
            }
            
            if (!bulbAnimationStarted && elapsed >= 5) {
                targetBulbScale.set(0.5, 0.5, 0.5);
                targetBulbY = 1.5;
                bulbStopped = true;
                const ringGeometry = new THREE.RingGeometry(0.33, 0.35, 32);
                const ringMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    side: THREE.DoubleSide
                });
                ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                ringMesh.rotation.x = -Math.PI / 2;
                ringMesh.position.copy(bulbLight.position);
                ringMesh.scale.set(0.1, 0.1, 0.1);
                scene.add(ringMesh);
                
                const lineGeometry = new THREE.BoxGeometry(1, 0.02, 0.02);
                lineGeometry.translate(0.5, 0, 0);
                const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
                hoverLineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
                hoverLineMesh.scale.set(0, 1, 1);
                scene.add(hoverLineMesh);
                
                bulbAnimationStarted = true;
            }
    
            if (bulbStopped) {
                bulbMesh.scale.lerp(targetBulbScale, delta * 4.0);
                bulbLight.position.y = THREE.MathUtils.lerp(bulbLight.position.y, targetBulbY, delta * 4.0);
            }
        }
    }
    
    if (ringMesh) {
        ringMesh.position.copy(bulbLight.position);
        ringMesh.lookAt(camera.position);
        if (ringMesh.scale.x < 1.0) {
            ringMesh.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 4.0);
        }
        ringMesh.rotation.z += delta * 0.5;
    }
    
    if (hoverLineMesh && ringMesh) {
        const worldPos = new THREE.Vector3();
        ringMesh.getWorldPosition(worldPos);
        hoverLineMesh.position.copy(worldPos);
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
        hoverLineMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), cameraRight);
    }
    
    if (hoverLineMesh) {
        const targetScale = textShown ? 1 : 0;
        hoverLineMesh.scale.x = THREE.MathUtils.lerp(hoverLineMesh.scale.x, targetScale, delta * 4.0);
        if (textSprite) {
            textSprite.visible = textShown && hoverLineMesh.scale.x > 0.01;
        }
        labelDiv.style.display = 'none';
    }
    
    // --- Aktualisierung des Landscape InstancedMesh ---
    if (landscapeInstancedMesh) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < landscapePositions.length; i++) {
        const pos = landscapePositions[i];
        if (Math.abs(pos.x - bulbLight.position.x) <= 10 && Math.abs(pos.z - bulbLight.position.z) <= 10) {
          dummy.position.copy(pos);
          dummy.scale.set(1, 1, 1);
        } else {
          dummy.position.copy(pos);
          dummy.scale.set(0, 0, 0);
        }
        dummy.updateMatrix();
        landscapeInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      landscapeInstancedMesh.instanceMatrix.needsUpdate = true;
    }
    // --- Ende Aktualisierung ---
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
document.body.appendChild(renderer.domElement);
animate();

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    keyDisplayQueue.updatePosition();
}
window.addEventListener('resize', onWindowResize);