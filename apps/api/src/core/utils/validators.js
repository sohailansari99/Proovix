const AppError = require("../errors/AppError");

const OBJECT_ID = /^[a-f\d]{24}$/i;

const requireObjectId = (value, label = "ID") => {
  if (typeof value !== "string" || !OBJECT_ID.test(value)) {
    throw new AppError(`${label} is invalid`, 400);
  }
  return value;
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Returns a trimmed http(s) link, or "" when the field is empty.
const optionalHttpUrl = (value, label = "Link") => {
  if (value === undefined || value === null || value === "") return "";
  if (
    typeof value !== "string" ||
    value.trim().length > 500 ||
    !isHttpUrl(value.trim())
  ) {
    throw new AppError(`${label} must be a valid http(s) link`, 400);
  }
  return value.trim();
};

const requireString = (value, label, max) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new AppError(
      `${label} is required and must be ${max} characters or fewer`,
      400
    );
  }
  return value.trim();
};

const optionalString = (value, label, max) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.trim().length > max) {
    throw new AppError(`${label} must be ${max} characters or fewer`, 400);
  }
  return value.trim();
};

module.exports = {
  requireObjectId,
  isHttpUrl,
  optionalHttpUrl,
  requireString,
  optionalString,
};