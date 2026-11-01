declare module 'qrcode' {
  export interface QRCodeRenderOptions {
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';
  }
  export function toDataURL(text: string, options?: QRCodeRenderOptions): Promise<string>;
  export function toString(text: string, options?: QRCodeRenderOptions): Promise<string>;
  export function toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeRenderOptions): Promise<void>;
}
