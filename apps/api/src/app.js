
const express = require("express");

const cors = require("cors");

const errorHandler = require("./core/errors/errorHandler");

const { sendSuccess } = require("./core/utils/apiResponse");

const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/users.routes");
const candidateRoutes = require("./modules/candidates/candidate.routes");
const skillRoutes = require("./modules/skills/skill.routes");
const candidateSkillRoutes = require("./modules/skills/candidateSkill.routes");


const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
);

app.use(express.json());

app.get("/api/v1/health", (req, res) => {
  sendSuccess(res, 200, "Proovix API is running");
});

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/candidates", candidateRoutes);
app.use("/api/v1/skills", skillRoutes);
app.use(
  "/api/v1/candidates/me/skills",
  candidateSkillRoutes
);

app.use(errorHandler);

module.exports = app;
