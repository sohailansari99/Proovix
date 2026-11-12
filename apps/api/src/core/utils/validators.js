// Validation utilities for API requests

const mongoose = require("mongoose");
const AppError = require("../errors/AppError");

// String validation helpers
const requireString = (value, fieldName = "Field", maxLength = 1000) => {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new AppError(`${fieldName} must be ${maxLength} characters or fewer`, 400);
  }
  return trimmed;
};

const optionalString = (value, fieldName = "Field", maxLength = 1000) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new AppError(`${fieldName} must be a string`, 400);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new AppError(`${fieldName} must be ${maxLength} characters or fewer`, 400);
  }
  return trimmed;
};

// Email validation - only Gmail allowed per requirements
const isValidGmail = (email) => {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
};

// Validate ObjectId from mongoose
const requireObjectId = (id, fieldName = "ID") => {
  if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`${fieldName} must be a valid ObjectId`, 400);
  }
};

// HTTP URL validation - must start with http:// or https://
const optionalHttpUrl = (url, fieldName = "URL") => {
  if (!url) return "";

  if (typeof url !== "string") {
    throw new AppError(`${fieldName} must be a valid HTTP or HTTPS URL`, 400);
  }

  const trimmed = url.trim();

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new AppError(`${fieldName} must be a valid HTTP or HTTPS URL`, 400);
  }

  return trimmed;
};

// Password strength validation
const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return null; // Password is valid
};

module.exports = {
  requireString,
  optionalString,
  isValidGmail,
  requireObjectId,
  optionalHttpUrl,
  validatePassword,
};
