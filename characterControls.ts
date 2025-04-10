// characterControls.ts

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class CharacterControls {
    model: THREE.Group;
    mixer: THREE.AnimationMixer;
    animationsMap: Map<string, THREE.AnimationAction>;
    orbitControl: OrbitControls;
    camera: THREE.Camera;
    currentAction: string;
    isRunning: boolean = false;
    public isFallen: boolean = false;
    private fallPending: boolean = false;

    walkDirection = new THREE.Vector3();
    rotateAngle = new THREE.Vector3(0, 1, 0);
    rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
    cameraTarget = new THREE.Vector3();

    fadeDuration: number = 0.2;
    runVelocity: number = 5;
    walkVelocity: number = 2;

    constructor(model: THREE.Group, mixer: THREE.AnimationMixer, animationsMap: Map<string, THREE.AnimationAction>,
                orbitControl: OrbitControls, camera: THREE.Camera, currentAction: string) {
        this.model = model;
        // Character in Idle-Position um 90° gedreht
        this.model.rotation.y = Math.PI / -2;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.animationsMap.forEach((value, key) => {
            if (key === currentAction) {
                value.play();
            }
        });
        this.orbitControl = orbitControl;
        this.camera = camera;
        this.updateCameraTarget(0, 0);
    }

    public switchRunToggle(pressed: boolean) {
        this.isRunning = pressed;
    }

    public triggerFall() {
        if (this.animationsMap.has('falling')) {
            const fallAction = this.animationsMap.get('falling');
            const current = this.animationsMap.get(this.currentAction);
            if (current) {
                current.fadeOut(this.fadeDuration);
            }

            console.log("Start falling, Position:", this.model.position.clone());

            fallAction?.reset().setLoop(THREE.LoopOnce, 1).fadeIn(this.fadeDuration).play();
            fallAction!.clampWhenFinished = true;
            this.currentAction = 'falling';
            this.isFallen = true;

            const onFinished = (event: any) => {
                if (event.action === fallAction) {
                    this.mixer.removeEventListener('finished', onFinished);
                    const lastPosition = this.model.position.clone();
                    console.log("Falling beendet, letzte Position:", lastPosition);

                    setTimeout(() => {
                        this.startFreeFall(lastPosition);
                    }, this.fadeDuration * 1000);
                }
            };

            this.mixer.addEventListener('finished', onFinished);
        }
    }

    private startFreeFall(lastPosition: THREE.Vector3) {
        if (this.animationsMap.has('freefall')) {
            console.log("Starte freefall an Position:", lastPosition);

            const freefallAction = this.animationsMap.get('freefall');
            freefallAction?.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(this.fadeDuration * 5).play();
            this.currentAction = 'freefall';

            this.model.position.lerp(lastPosition, 0.5);

            setTimeout(() => {
                this.model.position.set(lastPosition.x, lastPosition.y, lastPosition.z);
            }, this.fadeDuration * 10000);
        }
    }

    public setFallPending(pending: boolean) {
        this.fallPending = pending;
    }

    public isFallPendingFlag(): boolean {
        return this.fallPending;
    }

    public update(delta: number, keysPressed: any) {
        // Falls der Charakter gefallen ist, nur den Mixer updaten
        if (this.isFallen) {
            this.mixer.update(delta);
            return;
        }

        // Wir verwenden ausschließlich die Pfeiltasten:
        // Nur "ArrowUp" löst Vorwärtsbewegung aus.
        const forwardPressed = keysPressed["ArrowUp"] === true || keysPressed["w"] === true;

        let play = 'idle';
        if (forwardPressed) {
            play = this.isRunning ? 'running' : 'walking';
            if (this.fallPending) {
                this.triggerFall();
                this.fallPending = false;
                return;
            }
        }
        if (this.currentAction !== play && this.animationsMap.has(play)) {
            const toPlay = this.animationsMap.get(play);
            const current = this.animationsMap.get(this.currentAction);
            if (current) {
                current.fadeOut(this.fadeDuration);
            }
            toPlay?.reset().fadeIn(this.fadeDuration).play();
            this.currentAction = play;
        }
        this.mixer.update(delta);
        
        // Nur wenn "ArrowUp" gedrückt ist, wird der Charakter bewegt.
        if (forwardPressed && (this.currentAction === 'running' || this.currentAction === 'walking')) {
            // Entferne die Kamerasteuerung und verwende stattdessen die Ausrichtung des Charakters:
            const forwardVector = new THREE.Vector3(0, 0, -1);
            forwardVector.applyQuaternion(this.model.quaternion);
            forwardVector.normalize();
        
            // Berechne die Verschiebung basierend auf der Geschwindigkeit
            const velocity = this.currentAction === 'running' ? this.runVelocity : this.walkVelocity;
            const moveX = forwardVector.x * velocity * delta;
            const moveZ = forwardVector.z * velocity * delta;
            this.model.position.x += moveX;
            this.model.position.z += moveZ;
            this.updateCameraTarget(moveX, moveZ);
        }
        
    }

    private updateCameraTarget(moveX: number, moveZ: number) {
        this.camera.position.x += moveX;
        this.camera.position.z += moveZ;
        this.cameraTarget.x = this.model.position.x;
        this.cameraTarget.y = this.model.position.y + 1; // Kamera leicht über dem Charakter
        this.cameraTarget.z = this.model.position.z;
        this.orbitControl.target = this.cameraTarget;
    }


}
