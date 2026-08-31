import { notification } from "antd";
import api from "../../services/API/api.js"; // adjust path if your folder depth differs
import { printRawZpl } from "../../utils/qzTray"; // adjust path if your folder depth differs
import { buildBoxLabelZpl } from "../../utils/zplBuilder"; // adjust path if your folder depth differs

export default function useBoxLabelPrinter() {
  const printBoxLabel = async (packaging) => {
    const printerName = packaging.printer_name;

    if (!printerName) {
      notification.error({
        message: "Print skipped",
        description: "No printer configured for this packaging rule.",
        placement: "topRight",
      });
      return;
    }

    console.log("🖨️ PRINT BOX LABEL CALLED", {
      jobId: packaging.print_job_id,
      barcode: packaging.barcode_data,
      product: packaging.product_name,
      sapCode: packaging.sap_code,
      partCode: packaging.part_code,
      quantity: packaging.quantity,
      packedAt: packaging.packed_at,
      time: new Date().toISOString(),
    });

    try {
      const zpl = buildBoxLabelZpl({
        barcodeData: packaging.barcode_data,
        productName: packaging.product_name,
        partCode: packaging.part_code,
        sapCode: packaging.sap_code,
        quantity: packaging.quantity,
        packedAt: packaging.packed_at,
      });

      console.log("Sending ZPL payload:", zpl);

      await printRawZpl(printerName, zpl);

      console.log("✅ Print job completely handed over to QZ Tray!");

      await api.patch(`/print/box-print-jobs/${packaging.print_job_id}`, { status: "PRINTED" });

      notification.success({
        message: "Box label printed",
        description: `Box ${packaging.box_code} — ${packaging.barcode_data}`,
        placement: "topRight",
      });
    } catch (err) {
      console.error("❌ PRINT FAILED:", err);

      await api.patch(`/print/box-print-jobs/${packaging.print_job_id}`, {
        status: "FAILED",
        error_message: err?.message || "Print failed",
      });

      notification.error({
        message: "Print failed",
        description: err?.message || "Could not send label to printer.",
        placement: "topRight",
      });
    }
  };

  return { printBoxLabel };
}
