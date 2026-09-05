import { notification } from "antd";
import api from "../../services/API/api.js";
import { printRawZpl } from "../../utils/qzTray";

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


    try {
      // -------------------------------------------------------
      // Get production ZPL generated from the saved template
      // -------------------------------------------------------
      const { data: response } = await api.get(`/print/box-print-jobs/${packaging.print_job_id}/zpl`);
      const zpl = response?.data?.zpl;

      if (!zpl) {
        throw new Error("Server did not return Master Label ZPL.");
      }


      // -------------------------------------------------------
      // Send to QZ Tray
      // -------------------------------------------------------
      await printRawZpl(printerName, zpl);

      // -------------------------------------------------------
      // Mark print job successful
      // -------------------------------------------------------
      await api.patch(`/print/box-print-jobs/${packaging.print_job_id}`,{status: "PRINTED"});

      notification.success({
        message: "Box label printed",
        description: `Box ${packaging.box_code} — ${packaging.barcode_data}`,
        placement: "topRight",
      });
    } catch (err) {
      console.error("❌ MASTER LABEL PRINT FAILED:", err);

      try {
        await api.patch(`/print/box-print-jobs/${packaging.print_job_id}`,
          {
            status: "FAILED",
            error_message: err?.message || "Print failed",
          }
        );
      } catch (statusErr) {
        console.error("❌ Failed to update print job status:", statusErr);
      }

      notification.error({
        message: "Print failed",
        description:err?.message || "Could not send label to printer.",
        placement: "topRight",
      });
    }
  };

  return { printBoxLabel };
}