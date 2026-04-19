const level = process.env.LOG_LEVEL || "info";

function out(sev, msg, extra = {}) {
  if (sev === "debug" && level !== "debug") return;
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      sev,
      msg,
      ...extra,
    })
  );
}

export const logger = {
  info: (msg, extra) => out("info", msg, extra),
  warn: (msg, extra) => out("warn", msg, extra),
  error: (msg, extra) => out("error", msg, extra),
  debug: (msg, extra) => out("debug", msg, extra),
};  