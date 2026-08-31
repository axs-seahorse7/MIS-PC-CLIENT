export const EMPTY_FORM = {
  productId: null,
  erpNo: null,
  wipBarCode: "",
  itemPlanned: "",
  date: "",
  planNo: "",
  quality: "OK",
  machineName: "",
  station: "",
  productName: "",
  planQty: 0,
  doneQty: 0,
};

// server-driven target/achievement snapshot — comes back on every scan
// response (SINGLE / GROUP_CREATE / GROUP_SCAN / CUSTOMER_BINDING / Save
// Group). Drives the PLAN / PRODUCTION / ACHIEVED / REMAINS % cards. All
// read-only in the UI.
export const EMPTY_STAGE_STATS = {
  targetQty: 0,
  achievedQty: 0,
  remainingQty: 0,
  achievementPercent: 0,
  production_order_status: "PENDING",
  remainsQty: 0,
};
