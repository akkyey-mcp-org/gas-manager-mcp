function getWelcomeMessage(name) {
  return "Welcome to the integration test, " + name + "!";
}

function unusedFunction() {
  Logger.log("This should be detected as dead code.");
}

// 重複関数検知用（意図的に重複させる場合は別のファイルに書くか、ここでコメントアウト管理）
// function main() { Logger.log("Duplicate!"); }
