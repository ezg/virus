import * as PIXI from "pixi.js";

export class MathUtil {
    public static Add(p1: PIXI.IPoint, p2: PIXI.IPoint): PIXI.IPoint {
        return new PIXI.Point(p1.x + p2.x, p1.y + p2.y);
    }

    public static AddConst(p1: PIXI.IPoint, f: number): PIXI.IPoint {
        return new PIXI.Point(p1.x + f, p1.y + f);
    }

    public static Subtract(p1: PIXI.IPoint, p2: PIXI.IPoint): PIXI.IPoint {
        return new PIXI.Point(p1.x - p2.x, p1.y - p2.y);
    }

    public static SubtractConst(p1: PIXI.IPoint, f: number): PIXI.IPoint {
        return new PIXI.Point(p1.x - f, p1.y - f);
    }

    public static Multiply(p1: PIXI.IPoint, p2: PIXI.IPoint): PIXI.IPoint {
        return new PIXI.Point(p1.x * p2.x, p1.y * p2.y);
    }

    public static MultiplyConst(p1: PIXI.IPoint, f: number): PIXI.IPoint {
        return new PIXI.Point(p1.x * f, p1.y * f);
    }

    public static DivideConst(p1: PIXI.IPoint, f: number): PIXI.IPoint {
        return new PIXI.Point(p1.x / f, p1.y / f);
    }

    public static Length(p: PIXI.IPoint): number {
        return Math.sqrt(p.x * p.x + p.y * p.y);
    }

    public static Normalize(p: PIXI.IPoint): PIXI.IPoint {
        let l = MathUtil.Length(p);
        return new PIXI.Point(p.x / l, p.y / l);
    }

    public static Dot(p1: PIXI.IPoint, p2: PIXI.IPoint): number {
        return p1.x * p2.x + p1.y * p2.y;
    }
}
