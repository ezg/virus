import * as PIXI from "pixi.js";
import { main } from "..";
import { MathUtil } from "./Util";
import { observable, reaction } from "mobx";
import * as d3 from "d3";

export class Particle extends PIXI.Graphics {
    private static _reoveredColor = 0x0abcfc;
    private static _sickColor = 0xDE0004;
    private static _deadColor = 0x777777;
    private static _contagiousColor = 0xe76f51;
    private static _healthyColor = 0x03ab00;

    private _chanceOfDying = main.Random.real(0, 1, true);

    public IsZeroPatient: boolean = false;

    @observable
    public Status: Status = Status.Healthy;

    @observable
    public Measure: Measure = Measure.None;

    public Velocity: PIXI.IPoint;

    @observable
    public ContagiousToSickTimer: number = 0;

    @observable
    public SickToRecoverTimer: number = 0;

    public Radius: number = 0;
    public Mass: number = 1;
    public Idx: number = 0;

    constructor(p: PIXI.Point, radius: number) {
        super();
        this.Radius = radius;
        this.Idx = main.Random.integer(0, 10000);
        this.Velocity = new PIXI.Point(main.Random.real(-0.2, 0.2), main.Random.real(-0.2, 0.2));
        this.position = p.clone();

        reaction(() => this.Status, () => {
            this.UpdateDrawing();
        });

        reaction(() => [this.Status, this.Measure, this.ContagiousToSickTimer, this.SickToRecoverTimer], () => {
            this.UpdateDrawing();
        });

        reaction(() => [this.Status, main.Settings.QuarantineSick], () => {
            if (this.Status === Status.Sick && main.Settings.QuarantineSick) {
                this.Measure = Measure.Quarantine;
            }
            else if (this.Status === Status.Contagious && main.Settings.QuarantineContagious) {
                this.Measure = Measure.Quarantine;
            }
            else {
                this.Measure = Measure.None;
            }
        });

        

        reaction(() => this.Measure, () => {
            if (this.Measure === Measure.Quarantine ) {
                this.Velocity = new PIXI.Point(0, 0);
            }
            else {
                this.Velocity = new PIXI.Point(main.Random.real(-0.2, 0.2), main.Random.real(-0.2, 0.2))
            }
        });
    }

    public Update(delta: number): void {
        /*let tt2 = main.Simplex.gen((this.position.x + this.Idx) / (main.Width), (this.position.y + this.Idx) / (main.Height))  
        let tt1 = main.Simplex.gen((this.position.x + this.Idx) / (main.Width), (this.position.y + this.Idx) / (main.Height))  
        let n = new PIXI.Point(tt1 * 0.1, tt2 * 0.1);

        this.Velocity = MathUtil.Add(this.Velocity, n);
        if(MathUtil.Length(this.Velocity) > 2) {
            this.Velocity = MathUtil.MultiplyConst(MathUtil.Normalize(this.Velocity), 2);
        }*/

        if (this.Status !== Status.Dead && this.Measure !== Measure.Quarantine) {
            let r = main.Settings.Randomness;
            this.Velocity = MathUtil.Add(this.Velocity, new PIXI.Point(main.Random.real(-1 * r, r), main.Random.real(-1 * r, r)));
            if (MathUtil.Length(this.Velocity) > 1) {
                this.Velocity = MathUtil.MultiplyConst(MathUtil.Normalize(this.Velocity), 1);
            }
        }

        this.position = MathUtil.Add(this.position, MathUtil.MultiplyConst(this.Velocity, main.Settings.VelocityFactor));
        this.alpha = 1;//this.IsDead ? 0 : this.Lifespan / 500.0;

        if (this.Status === Status.Contagious) {
            this.ContagiousToSickTimer += delta;
            if (this.ContagiousToSickTimer > main.Settings.TimeToSick * 10) {
                this.Status = Status.Sick;
            }
        }
        else if (this.Status === Status.Sick) {
            if (!(this.IsZeroPatient && !main.Settings.PatientZeroRecovers)) {
                this.SickToRecoverTimer += delta;
                if (this.SickToRecoverTimer > main.Settings.TimeToRecover * 10) {
                    if (this._chanceOfDying <= main.Settings.Deadliness) {
                        this.Status = Status.Dead;
                        this.Velocity = new PIXI.Point(0, 0);
                    }
                    else {
                        this.Status = Status.Recoverd;
                    }
                }
            }
        }
    }
    public BoundCollisionResponse(width: number, height: number): void {
        if (this.x <= this.Radius || this.x >= width - this.Radius) {
            this.Velocity.x = -this.Velocity.x;
        }

        if (this.y <= this.Radius || this.y > (height - this.Radius)) {
            this.Velocity.y = -this.Velocity.y;
        }
    }

    public static HandleCollision(p0: Particle, p1: Particle): boolean {
        let d = (p0.position.x - p1.position.x) * (p0.position.x - p1.position.x) + (p0.position.y - p1.position.y) * (p0.position.y - p1.position.y);
        if (d <= (p0.Radius + p1.Radius) * (p0.Radius + p1.Radius)) {
            let chance = main.Random.real(0, 1, true)

            if ((p0.Status === Status.Sick || p0.Status === Status.Contagious) && p1.Status === Status.Healthy) {
                p1.Status = (chance <= main.Settings.Contagiousness) ? Status.Contagious : p1.Status;
            }
            else if ((p1.Status === Status.Sick || p1.Status === Status.Contagious) && p0.Status === Status.Healthy) {
                p0.Status = (chance <= main.Settings.Contagiousness) ? Status.Contagious : p0.Status;
            }

            let n = MathUtil.Subtract(p0.position, p1.position);
            n = MathUtil.Normalize(n);
            let a1 = MathUtil.Dot(p0.Velocity, n);
            let a2 = MathUtil.Dot(p1.Velocity, n);

            let optimizedP = Math.min((2.0 * (a1 - a2)) / (p0.Mass + p1.Mass), 0);

            if (p0.Measure !== Measure.Quarantine) {
                //let v0p = MathUtil.Subtract(p0.Velocity, MathUtil.MultiplyConst(n, optimizedP * (p1.Mass + (p1.Measure === Measure.Quarantine ? p0.Mass : 0))));
                //p0.Velocity = v0p;

                let cst = optimizedP * (p1.Mass + (p1.Measure === Measure.Quarantine ? p0.Mass : 0));
                p0.Velocity.x = p0.Velocity.x - n.x * cst;
                p0.Velocity.y = p0.Velocity.y - n.y * cst;
            }

            if (p1.Measure !== Measure.Quarantine) {
                //let v1p = MathUtil.Add(p1.Velocity, MathUtil.MultiplyConst(n, optimizedP * (p0.Mass + (p0.Measure === Measure.Quarantine ? p1.Mass : 0))));
                //p1.Velocity = v1p;

                let cst = optimizedP * (p0.Mass + (p0.Measure === Measure.Quarantine ? p1.Mass : 0));
                p1.Velocity.x = p1.Velocity.x + n.x * cst;
                p1.Velocity.y = p1.Velocity.y + n.y * cst;
            }
            return true;
        }
        return false;
    }

    public static GetStatusColor(status:Status):number {
        let c = 0x00C788;
        if (status === Status.Healthy) {
            c = Particle._healthyColor;
        }
        else if (status === Status.Recoverd) {
            c = Particle._reoveredColor;
        }
        else if (status === Status.Sick) {
            c = Particle._sickColor;
        }
        else if (status === Status.Contagious) {
            c = Particle._contagiousColor;
        }
        else if (status === Status.Dead) {
            c = Particle._deadColor;
        }
        return c;
    }

    public UpdateDrawing(): void {
        let c = Particle.GetStatusColor(this.Status);
        this.clear();
        this.beginFill(c, this.Status !== Status.Dead ? 1: 0.6);
        this.lineStyle(0.2, 0x000000);
        this.drawCircle(0, 0, this.Radius);
        this.endFill();

        if (this.Measure === Measure.Quarantine) {
            this.lineStyle(0.5, 0xeeeeee);
            this.drawCircle(0, 0, this.Radius * 2);
        }
    }
}

export enum Status {
    Healthy, Contagious, Sick, Recoverd, Dead
}

export enum Measure {
    None, Quarantine
}