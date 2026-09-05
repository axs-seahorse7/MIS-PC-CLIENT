// src/utils/qzTray.js
import qz from "qz-tray";
import api from "../services/API/api";

let connected = false;
let configuredOnce = false;

function configureSecurity() {
  if (configuredOnce) return;
  configuredOnce = true;

  qz.security.setCertificatePromise((resolve, reject) => {
    api
      .get("/print/cert", { responseType: "text" })
      .then((res) => resolve(res.data))
      .catch(reject);
  });

  qz.security.setSignatureAlgorithm("SHA512");

  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    api
      .post(
        "/print/sign",
        { request: toSign },
        { responseType: "text" }
      )
      .then((res) => resolve(res.data))
      .catch(reject);
  });
}

export async function ensureQzConnected() {
  configureSecurity();
  if (qz.websocket.isActive()) {
    connected = true;
    return;
  }
  await qz.websocket.connect();
  connected = true;
}

export async function printRawZpl(printerName, zpl) {
  await ensureQzConnected();

  let finalPrinterName = printerName;

  try {
    // 1. Ask QZ Tray to find the system's exact matching printer name
    // This removes character mismatches like hyphens, spaces, or casing
    finalPrinterName = await qz.printers.find(printerName);
    console.log("🎯 Exact printer matched by system:", finalPrinterName);
  } catch (findError) {
    console.warn(`Could not find exact match for '${printerName}', falling back to default string.`);
  }

  // 2. Initialize the configuration with the verified name mapping
  const config = qz.configs.create(finalPrinterName, {
    forceRaw: true
  });

  const data = [
    {
      type: "raw",
      format: "command", 
      data: zpl,
    },
  ];

  // 3. Dispatch payload to the device queue
  await qz.print(config, data);
  console.log("🚀 Payload cleanly deposited into hardware print queue.");
}


export async function listQzPrinters() {
  await ensureQzConnected();
  return qz.printers.find();
}