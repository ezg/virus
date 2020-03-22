import { action, observe, runInAction, observable, reaction } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { main } from "..";
import { MainState } from "@app/viewstate/MainState";
import 'react-dat-gui/dist/index.css';
import * as PIXI from "pixi.js"
import DatGui, { DatBoolean, DatColor, DatNumber, DatString, DatButton } from "react-dat-gui";
import { Particle, Status, Measure } from "@app/common/Particle";
import { Combinations } from "@app/common/Combination";
import { timeThursdays } from "d3";
import _ from "lodash";


interface IProps {
    vm: MainState;
}

@observer
export class MainView extends React.Component<IProps> {
    private pixiCnt: HTMLDivElement = null;
    private _app: PIXI.Application;
    private _particleContainer: PIXI.Container = new PIXI.Container();
    private _particles = new Array<Particle>();
    private _particleCombinations: Array<Array<Particle>> = [];
    private _stats = new Array<Map<Status, number>>();
    private _nrStatsEntries = 150;
    private _statsUpdateInterval = 1;


    @observable
    private _renderedGameTime:string = "";

    @observable
    private _renderedCollisions:string = "";

    private _collisionSmoother : number[] = [];
 
    constructor(props: any) {
        super(props);
    }

    handleUpdate = (newData) => {
        main.Settings = newData;
    }

    onPauseClick = () => {
        main.IsPaused = !main.IsPaused;
    }

    onGenerateClick = () => {
        this.reset();
    }

    updatePixiCnt = (element: HTMLDivElement) => {
        this.pixiCnt = element;
        if (this.pixiCnt && this.pixiCnt.children.length <= 0) {
            this.setup();
        }
    }

    reset(): void {
        let r = main.Settings.ParticleRadius;
        this._particles = [];
        main.GameTime = 0;

        while (this._particleContainer.children[0]) {
            this._particleContainer.removeChild(this._particleContainer.children[0]);
        }

        for (let i = 0; i < main.Settings.NrOfParticles; i++) {
            let origin = new PIXI.Point(main.Random.real(r, main.Width - r), main.Random.real(r, main.Height - r));
            let particle = new Particle(origin, r);
            this._particles.push(particle);
            particle.UpdateDrawing();
            this._particleContainer.addChild(particle);

            if (i % 3 === 0) {
                //particle.Measure = Measure.Quarantine;
            }
        }
        // one is sick
        this._particles[0].Status = Status.Sick;
        this._particles[0].IsZeroPatient = true;

        this._particleCombinations = Combinations.k_combinations(this._particles, 2);
        this._stats = new Array<Map<Status, number>>();
    }

    setup(): void {
        let dpr = window.devicePixelRatio || 1;
        main.Width = this.pixiCnt.clientWidth / dpr;
        main.Height = this.pixiCnt.clientHeight / dpr;
        this._app = new PIXI.Application({
            width: main.Width, height: main.Height,
            backgroundColor: 0x1a1a1a,
            antialias: true,
            resolution: dpr
        });
        this.pixiCnt.appendChild(this._app.view);
        this._app.stage.addChild(this._particleContainer);

        let collisionCounter =0;
        this._app.ticker.add((delta) => {
            if (!main.IsPaused) {
                this._particleCombinations.filter(ps => {
                    let anyDead = ps.filter(p => p.Status === Status.Dead).length > 0;
                    let quarantine = main.Settings.QuarantinedCanSpread ? false : ps.filter(p => p.Measure === Measure.Quarantine).length > 0;
                    return !anyDead && !quarantine;
                })
                .forEach(combo => {
                    let collided = Particle.HandleCollision(combo[0], combo[1]);
                    collisionCounter += collided ? 1 : 0;
                });

                this._particles.forEach((p) => {
                    p.Update(delta);
                    p.BoundCollisionResponse(main.Width, main.Height);
                });
            }

            if (!main.IsPaused) {
                main.GameTime = main.GameTime + delta;
            }

            if (!main.IsPaused) {
                if (Math.floor(main.GameTime) % this._statsUpdateInterval === 0) {
                    this.updateStats();
                    this.redrawSummary();
                }
            }

            this._renderedGameTime = Math.floor(main.GameTime / 10.0).toString();
            if (Math.floor(main.GameTime) % 10 === 0) {
                this._collisionSmoother.push (collisionCounter / this._particles.length);
                let avg = _.meanBy(this._collisionSmoother, (p) => p);
                this._renderedCollisions =  (avg).toFixed(2)
                collisionCounter = 0;
                this._collisionSmoother = _.takeRight(this._collisionSmoother, 20);
            }
        });

        this.reset();

        this._summaryCanvas = document.createElement("canvas");
        this._summaryCanvas.width = this._nrStatsEntries;
        this._summaryCanvas.height = 100 / dpr;
        this._summaryCanvasContext = this._summaryCanvas.getContext("2d");
        this._summarySprite = new PIXI.Sprite(PIXI.Texture.from(this._summaryCanvas));
        this._summarySprite.texture.baseTexture.resolution = dpr;

        this._summarySprite.position.x = main.Width - this._summaryCanvas.width;
        this._summarySprite.position.y = main.Height - this._summaryCanvas.height;

        this._app.stage.addChild(this._summarySprite);
    }
    private updateStats(): void {
        let stat = new Map<Status, number>();
        this._particles.forEach(p => {
            if (!stat.has(p.Status)) {
                stat.set(p.Status, 0);
            }
            stat.set(p.Status, stat.get(p.Status) + 1)
        });
        this._stats = [...[stat], ...this._stats];
        this._stats = _.take(this._stats, this._nrStatsEntries);
    }

    private redrawSummary(): void {

        this._summaryCanvasContext.clearRect(0, 0, this._summaryCanvas.width, this._summaryCanvas.height);

        var imageData = this._summaryCanvasContext.getImageData(0, 0, this._summaryCanvas.width, this._summaryCanvas.height);
        var data = imageData.data;
        let w = this._summaryCanvas.width;
        let h = this._summaryCanvas.height;

        for (let e = 0; e < this._stats.length; e++) {
            let stat = this._stats[e];
            let x = (this._nrStatsEntries - 1) - e;
            let pixelSum = 0;
            let lasColor = [];
            Array.from([Status.Healthy, Status.Recoverd, Status.Contagious, Status.Sick, Status.Dead]).forEach(k => {
                let amount = stat.has(k) ? stat.get(k) : 0;
                if (amount > 0) {
                    let pixels = Math.round((amount / this._particles.length) * h);
                    let color = PIXI.utils.hex2rgb(Particle.GetStatusColor(k));
                    for (let y = pixelSum; y < pixelSum + pixels; y++) {
                        let i = y * (w * 4) + x * 4;
                        data[i] = color[0] * 255;
                        data[i + 1] = color[1] * 255;
                        data[i + 2] = color[2] * 255;
                        data[i + 3] = 255 * 0.9;
                    }
                    lasColor = color;
                    pixelSum += pixels;
                }
            });
            if (pixelSum < h) {
                for (let y = pixelSum; y < h; y++) {
                    let i = y * (w * 4) + x * 4;
                    data[i] = lasColor[0] * 255;
                    data[i + 1] = lasColor[1] * 255;
                    data[i + 2] = lasColor[2] * 255;
                    data[i + 3] = 255 * 0.9;
                }
            }
        }

        this._summaryCanvasContext.putImageData(imageData, 0, 0);
        this._summarySprite.texture.update();
    }

    private _summaryCanvas: HTMLCanvasElement;
    private _summaryCanvasContext: CanvasRenderingContext2D;
    private _summarySprite: PIXI.Sprite;

    render() {
        let vm = this.props.vm;
        if (!vm || !this.props.vm) {
            return null;
        }
        // v

        return (<div>
            <div className="pixi-container" ref={this.updatePixiCnt} />

            <DatGui data={vm.Settings} onUpdate={this.handleUpdate}>
                <DatButton label="reset" onClick={this.onGenerateClick} />
                <DatButton label={vm.IsPaused ? "play" : "pause"} onClick={this.onPauseClick} />

                <DatNumber path='NrOfParticles' label='# Particles' min={2} max={500} step={1} />
                <DatNumber path='ParticleRadius' label='Particle Size' min={1} max={20} step={1} />
                <DatNumber path='Randomness' label='Random Wandering' min={0} max={1} step={0.01} />
                <DatNumber path='VelocityFactor' label='Particle Speed' min={0} max={20} step={0.01} />
                <DatNumber path='Contagiousness' label='Contagiousness' min={0} max={1} step={0.01} />
                <DatNumber path='Deadliness' label='Deadliness' min={0} max={1} step={0.01} />
               
                <DatBoolean path='QuarantineSick' label='Quarantine sick' />
                <DatBoolean path='QuarantineContagious' label='Quarantine contagious' />
                <DatBoolean path='QuarantinedCanSpread' label='Spread in quarantine' />
                <DatNumber path='TimeToSick' label='Time to sick' min={0} max={100} step={1} />
                <DatNumber path='TimeToRecover' label='Time to recover' min={0} max={100} step={1} />
            </DatGui>


            <label className="game-time">{"Simulation Time: " + this._renderedGameTime}</label>
            <label className="collisions">{"Avg Social Contact per time Step: " + this._renderedCollisions}</label>
            <div className="legend"> 
            <ul>
            <li>
                <div className="color-rect" style={{backgroundColor: PIXI.utils.hex2string(Particle.GetStatusColor(Status.Healthy))}}></div>
                Healthy
            </li>
            <li>
                <div className="color-rect" style={{backgroundColor: PIXI.utils.hex2string(Particle.GetStatusColor(Status.Recoverd))}}></div>
                Recovered
            </li>
            <li>
                <div className="color-rect" style={{backgroundColor: PIXI.utils.hex2string(Particle.GetStatusColor(Status.Contagious))}}></div>
                Contagious
            </li>
            <li>
                <div className="color-rect" style={{backgroundColor: PIXI.utils.hex2string(Particle.GetStatusColor(Status.Sick))}}></div>
                Sick
            </li>
            <li>
                <div className="color-rect" style={{backgroundColor: PIXI.utils.hex2string(Particle.GetStatusColor(Status.Dead))}}></div>
                Dead
            </li>
            </ul>
            </div>
        </div>)
    }
}   