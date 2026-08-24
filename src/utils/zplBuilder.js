// src/utils/zplBuilder.js

// Maps your packaging_config.barcode_format values to the correct ZPL
// barcode command. Widths/heights are reasonable label defaults — adjust
// per your actual label stock size (this assumes a small box label,
// roughly 2"x1" at 203dpi).
const BARCODE_ZPL = {
  CODE128: (data) => `^BY2,3,60\n^FO50,120^BCN,60,Y,N,N\n^FD${data}^FS`,
  QR: (data) => `^FO50,110^BQN,2,6\n^FDQA,${data}^FS`,
  EAN13: (data) => `^BY2,3,60\n^FO50,120^BEN,60,Y,N\n^FD${data}^FS`,
  DATAMATRIX: (data) => `^FO50,110^BXN,6,200\n^FD${data}^FS`,
};

/**
 * Builds a ZPL label string for a packed box.
 * @param {{ barcodeData: string, barcodeFormat: string, productName?: string, boxSize?: number, date?: string }} opts
 */
/**
 * Builds a ZPL label string for a packed box optimized for 300 DPI printers.
 * @param {{ barcodeData: string }} opts
 */
// src/utils/zplBuilder.js

/**
 * Builds a ZPL label string for a packed box optimized for a Zebra 300 DPI printer.
 * @param {{ barcodeData: string }} opts
 */
// src/utils/zplBuilder.js

/**
 * Builds a clean, single-line ZPL label string optimized for 300 DPI Zebra hardware.
 * @param {{ barcodeData: string }} opts
 */
export function buildBoxLabelZpl({ barcodeData }) {
  return (
    "^XA" +
    "^PW900" +
    "^LL600" +
    "^CI28" +

    // QR
    "^FO50,50" +
    "^BQN,2,5" +
    `^FDQA,${barcodeData}^FS` +

    // BOX CODE directly below
    "^FO50,250" +
    "^A0N,40,40" +
    `^FD${barcodeData}^FS` +

    "^XZ"
  );
}