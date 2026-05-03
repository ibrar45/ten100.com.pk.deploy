export function sendSuccess(res, data, { status = 200, message, meta } = {}) {
  return res.status(status).json({
    success: true,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {}),
    ...(data === undefined ? {} : { data }),
  });
}

export function sendError(res, status, code, message, details) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
}

export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

