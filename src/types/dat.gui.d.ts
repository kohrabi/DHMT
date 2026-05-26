declare module 'dat.gui' {
  export class GUI {
    constructor(options?: { name?: string; width?: number });
    domElement: HTMLElement;
    add(obj: any, prop: string, min?: any, max?: any, step?: any): GUIController;
    addFolder(name: string): GUI;
    open(): void;
    destroy(): void;
  }
  export interface GUIController {
    name(name: string): GUIController;
    listen(): GUIController;
    updateDisplay(): void;
    onChange(callback: (value?: any) => void): GUIController;
    onFinishChange(callback: (value?: any) => void): GUIController;
  }
  export default GUI;
}
