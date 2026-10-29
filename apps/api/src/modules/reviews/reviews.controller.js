const AppError = require("../../core/errors/AppError");
const { sendSuccess } = require("../../core/utils/apiResponse");
const { getViewer } = require("./assignment.service");
const { getQueue, getDetail, decide, getStats, getHistory } = require("./reviews.service");

const handle = (fn) => async (req, res, next) => {
  try {
    const viewer = await getViewer(req.user.userId);
    await fn(req, res, viewer);
  } catch (error) {
    next(error);
  }
};

const stats = handle(async (req, res, viewer) => {
  sendSuccess(res, 200, "Review stats retrieved successfully", await getStats(viewer));
});

const queue = handle(async (req, res, viewer) => {
  const { status, search, page } = req.query;
  sendSuccess(res, 200, "Review queue retrieved successfully", await getQueue({ status, search, page }, viewer));
});

const history = handle(async (req, res, viewer) => {
  const { scope, page } = req.query;
  const data = await getHistory(viewer, { scope: scope === "all" ? "all" : "mine", page });
  sendSuccess(res, 200, "Review history retrieved successfully", data);
});

const detail = handle(async (req, res, viewer) => {
  sendSuccess(res, 200, "Evidence retrieved successfully", await getDetail(req.params.evidenceId, viewer));
});


const decision = handle(async (req, res, viewer) => {
  const { status, note } = req.body || {};

  if (typeof status !== "string") throw new AppError("Review decision is required", 400);

  sendSuccess(res, 200, "Decision recorded", await decide(viewer, req.params.evidenceId, { status, note }));
});

module.exports = { stats, queue, history, detail, decision };