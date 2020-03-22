import { MainView } from '@app/view/MainView';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { main } from '.';
import "./App.scss";

declare let module: any;

window.addEventListener("orientationchange", () => { }, false);

ReactDOM.render(<MainView vm={main} />, document.getElementById("root"));
main.Init();