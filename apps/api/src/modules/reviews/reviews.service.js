const Evidence = require("../evidence/evidence.model");
const Candidate = require("../candidates/candidate.model");
const ReviewLog = require("./reviewLog.model");
const { recalculateCandidateSkillScore } = require("../evidence/evidence.service");
const { scopeFilter, canAccess } = require("./assignment.service");

const AppError = require("../../core/errors/AppError");
const { requireObjectId } = require("../../core/utils/validators");

const STATUSES = ["PENDING", "VERIFIED", "REJECTED", "CHANGES_REQUESTED"];
const DECISIONS = ["VERIFIED", "REJECTED", "CHANGES_REQUESTED"];
const PAGE_SIZE = 15;

const CANDIDATE_POPULATE = {
  path: "candidateId",
  select: "fullName username headline location githubUrl linkedinUrl portfolioUrl",
};
const LIST_SKILL_POPULATE = {
  path: "candidateSkillId",
  populate: { path: "skillId", select: "name slug category track" },
};
const DETAIL_SKILL_POPULATE = {
  path: "candidateSkillId",
  populate: { path: "skillId", select: "name slug category description competencies track" },
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toPage = (value) => Math.max(1, Number.parseInt(value, 10) || 1);

const shapeLog = (log) => ({
  _id: log._id,
  action: log.action,
  note: log.note,
  createdAt: log.createdAt,
  evidenceId: log.evidenceId,
  evidenceTitle: log.evidenceTitle,
  candidateName: log.candidateId?.fullName || "",
  reviewerEmail: log.reviewerId?.email || "",
});

const getQueue = async ({ status = "PENDING", search = "", page = 1 } = {}, viewer) => {
  if (typeof status !== "string") throw new AppError("Invalid status filter", 400);

  const clauses = [scopeFilter(viewer)];

  if (status !== "ALL") {
    if (!STATUSES.includes(status)) throw new AppError("Invalid status filter", 400);
    clauses.push({ verificationStatus: status });
  }

  const term = typeof search === "string" ? search.trim().slice(0, 60) : "";

  if (term) {
    const pattern = new RegExp(escapeRegex(term), "i");
    const matches = await Candidate.find({
      $or: [{ fullName: pattern }, { username: pattern }],
    })
      .select("_id")
      .limit(200);

    clauses.push({
      $or: [{ title: pattern }, { candidateId: { $in: matches.map((m) => m._id) } }],
    });
  }

  const filter = { $and: clauses };
  const pageNumber = toPage(page);
  const sort = status === "PENDING" ? { createdAt: 1 } : { updatedAt: -1 };

  const [rows, total] = await Promise.all([
    Evidence.find(filter)
      .sort(sort)
      .skip((pageNumber - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate(CANDIDATE_POPULATE)
      .populate(LIST_SKILL_POPULATE)
      .lean(),
    Evidence.countDocuments(filter),
  ]);

  const items = rows.map(({ aiAnalysis, ...rest }) => ({
    ...rest,
    hasAnalysis: Boolean(aiAnalysis),
    assignedToMe: String(rest.assignedReviewerId || "") === String(viewer.userId),
  }));

  return { items, total, page: pageNumber, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
};

const getDetail = async (evidenceId, viewer) => {
  requireObjectId(evidenceId, "Evidence ID");

  const evidence = await Evidence.findById(evidenceId)
    .populate(CANDIDATE_POPULATE)
    .populate(DETAIL_SKILL_POPULATE)
    .lean();

  if (!evidence) throw new AppError("Evidence not found", 404);

  if (!canAccess(evidence, viewer)) {
    throw new AppError("This submission is assigned to another reviewer", 403);
  }

  const logs = await ReviewLog.find({ evidenceId })
    .sort({ createdAt: -1 })
    .populate({ path: "reviewerId", select: "email" })
    .lean();

  return { evidence, history: logs.map(shapeLog) };
};

const decide = async (viewer, evidenceId, { status, note } = {}) => {
  requireObjectId(evidenceId, "Evidence ID");

  if (!DECISIONS.includes(status)) {
    throw new AppError("Decision must be VERIFIED, REJECTED or CHANGES_REQUESTED", 400);
  }
  if (note !== undefined && typeof note !== "string") {
    throw new AppError("Note must be text", 400);
  }

  const cleanNote = (note || "").trim();

  if (cleanNote.length > 1000) throw new AppError("Note must be 1000 characters or fewer", 400);
  if (status !== "VERIFIED" && cleanNote.length < 10) {
    throw new AppError("Give the candidate a reason (at least 10 characters)", 400);
  }

  const evidence = await Evidence.findById(evidenceId);

  if (!evidence) throw new AppError("Evidence not found", 404);

  if (!canAccess(evidence, viewer)) {
    throw new AppError("This submission is assigned to another reviewer", 403);
  }

  if (evidence.verificationStatus !== "PENDING") {
    throw new AppError("This evidence has already been reviewed", 409);
  }

  // Nobody reviews their own work.
  const owner = await Candidate.findById(evidence.candidateId).select("userId");

  if (owner && String(owner.userId) === String(viewer.userId)) {
    throw new AppError("You cannot review your own evidence", 403);
  }

  if (status === "VERIFIED" && !evidence.aiAnalysis) {
    throw new AppError("The AI analysis has not been run yet. Ask the candidate to run it first", 400);
  }

  // Atomic: only one reviewer can win, and unassigned items get claimed by the decider.
  const now = new Date();
  const guard = { _id: evidenceId, verificationStatus: "PENDING" };

  if (viewer.role !== "ADMIN") {
    guard.$or = [{ assignedReviewerId: null }, { assignedReviewerId: viewer.userId }];
  }
  if (status === "VERIFIED") guard.aiAnalysis = { $ne: null };

  const updated = await Evidence.findOneAndUpdate(
    guard,
    {
      $set: {
        verificationStatus: status,
        reviewedBy: viewer.userId,
        assignedReviewerId: evidence.assignedReviewerId || viewer.userId,
        reviewedAt: now,
        reviewNote: cleanNote,
        verifiedAt: status === "VERIFIED" ? now : null,
      },
    },
    { new: true }
  );

  if (!updated) {
    throw new AppError("This evidence changed or was already reviewed. Refresh and try again", 409);
  }

  await ReviewLog.create({
    evidenceId: updated._id,
    candidateId: updated.candidateId,
    reviewerId: viewer.userId,
    action: status,
    previousStatus: "PENDING",
    note: cleanNote,
    evidenceTitle: updated.title,
  });

  await recalculateCandidateSkillScore(updated.candidateSkillId);

  return getDetail(evidenceId, viewer);
};

const getStats = async (viewer) => {
  const [grouped, reviewedByMe, recent] = await Promise.all([
    Evidence.aggregate([
      { $match: scopeFilter(viewer) },
      { $group: { _id: "$verificationStatus", count: { $sum: 1 } } },
    ]),
    ReviewLog.countDocuments({ reviewerId: viewer.userId }),
    ReviewLog.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate({ path: "reviewerId", select: "email" })
      .populate({ path: "candidateId", select: "fullName" })
      .lean(),
  ]);

  const counts = { PENDING: 0, VERIFIED: 0, REJECTED: 0, CHANGES_REQUESTED: 0 };
  grouped.forEach((row) => {
    if (row._id in counts) counts[row._id] = row.count;
  });

  return { counts, reviewedByMe, recent: recent.map(shapeLog) };
};

const getHistory = async (viewer, { scope = "mine", page = 1 } = {}) => {
  const filter = scope === "all" ? {} : { reviewerId: viewer.userId };
  const pageNumber = toPage(page);

  const [logs, total] = await Promise.all([
    ReviewLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate({ path: "reviewerId", select: "email" })
      .populate({ path: "candidateId", select: "fullName" })
      .lean(),
    ReviewLog.countDocuments(filter),
  ]);

  return {
    items: logs.map(shapeLog),
    total,
    page: pageNumber,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
};

module.exports = { getQueue, getDetail, decide, getStats, getHistory };