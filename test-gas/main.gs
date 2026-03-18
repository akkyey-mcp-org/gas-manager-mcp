function main() {
  Logger.log("Starting main logic...");
  
  // utils.gs からの関数呼び出し
  const message = getWelcomeMessage("Antigravity");
  Logger.log(message);
  
  // PropertiesService の操作
  PropertiesService.getScriptProperties().setProperty("last_run", new Date().toISOString());
  const lastRun = PropertiesService.getScriptProperties().getProperty("last_run");
  Logger.log("Last run: " + lastRun);
  
  // SpreadsheetApp の操作
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.insertSheet("IntegratedTest");
  
  const data = [
    ["Project", "Status"],
    ["Emulator", "Active"],
    ["Integration", "In-Progress"]
  ];
  
  const range = sheet.getRange(1, 1, 3, 2);
  range.setValues(data);
  
  Logger.log("Data written to sheet. Row count: " + sheet.getLastRow());
  
  // 検証用戻り値
  return {
    status: "success",
    rowCount: sheet.getLastRow()
  };
}
