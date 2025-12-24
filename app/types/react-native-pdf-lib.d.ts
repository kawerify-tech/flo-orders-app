declare module 'react-native-pdf-lib' {
  export class PDFDocument {
    static create(): Promise<PDFDocument>;
    addPage(size: [number, number]): PDFPage;
    save(): Promise<Uint8Array>;
  }

  export class PDFPage {
    drawText(text: string, options: {
      x: number;
      y: number;
      size: number;
      font: PDFFont;
      color?: { r: number; g: number; b: number };
    }): void;
    getSize(): { width: number; height: number };
  }

  export class StandardFonts {
    static Helvetica: PDFFont;
  }

  export interface PDFFont {
    // Add any necessary font properties here
  }
} 