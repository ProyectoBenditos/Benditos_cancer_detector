export type VolumeKeyAction =
  | { type: "rotate"; dx: number; dy: number }
  | { type: "zoom"; delta: number }
  | { type: "reset" }
  | null;

export function volumeKeyAction(key: string): VolumeKeyAction {
  switch (key) {
    case "ArrowLeft": return { type: "rotate", dx: 0, dy: -0.1 };
    case "ArrowRight": return { type: "rotate", dx: 0, dy: 0.1 };
    case "ArrowUp": return { type: "rotate", dx: -0.1, dy: 0 };
    case "ArrowDown": return { type: "rotate", dx: 0.1, dy: 0 };
    case "+":
    case "=": return { type: "zoom", delta: -0.1 };
    case "-": return { type: "zoom", delta: 0.1 };
    case "0": return { type: "reset" };
    default: return null;
  }
}
