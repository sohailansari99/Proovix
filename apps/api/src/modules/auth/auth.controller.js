const { registerUser, loginUser } = require("./auth.service");
const { sendSuccess } = require("../../core/utils/apiResponse");

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await registerUser({
      email,
      password,
    });

    return sendSuccess(res, 201, "User registered successfully", user);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await loginUser({
      email,
      password,
    });

    return sendSuccess(res, 200, "Login successful", result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
};