import { action, observable, reaction, runInAction } from 'mobx';
import { Random } from "random-js";
import tumult from "tumult"

export class MainState {
    public Random: Random = new Random();

    public Simplex = new tumult.Simplex2("some_seed");

    @observable
    public Settings = new Settings();

    @observable
    public IsPaused:boolean = false;

    @observable
    public GameTime:number = 0;

    @observable
    public Width:number = 0;

    @observable
    public Height:number = 0;

    private _disposables: (() => void)[] = [];

    public Init(): void {
       
        /*this._disposables.push(reaction(() => this.IsAuthenticated, (IsAuthenticated) => {
            if (IsAuthenticated) {
                MontanaGateway.Instance.LogTelemetry({ event: "app started" });
                MontanaGateway.Instance.GetUserProfile().then((userModel: IUser) => {
                    runInAction(() => this.RootModel.SetUser(userModel));
                });
            }
        }, { fireImmediately: true }));*/


    }
}

export class Settings {
    public NrOfParticles = 100;
    public Deadliness = 0.01;
    public ParticleRadius = 3;
    public Contagiousness = 0.2;
    public Randomness = 0.1;
    public VelocityFactor = 1;
    public TimeToSick = 20;
    public TimeToRecover = 50;
    public PatientZeroRecovers = false;
    public QuarantineSick = false;
    public QuarantineContagious = false;
    public QuarantinedCanSpread = false;
}