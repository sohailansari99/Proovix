const User = require("../users/user.model");
const Evidence = require("../evidence/evidence.model");
const AppError = require("../../core/errors/AppError");

// The reviewer in this track with the fewest open items (ties are random).
const pickReviewer = async (track, excludeUserId) => {
  if (!track) return null;

  const reviewers = await User.find({
    role: "REVIEWER",
    status: "ACTIVE",
    emailVerified: true,
    reviewerTracks: track,
    _id: { $ne: excludeUserId },
  })
    .select("_id")
    .lean();

  if (reviewers.length === 0) return null;

  const loads = await Evidence.aggregate([
    {
      $match: {
        assignedReviewerId: { $in: reviewers.map((r) => r._id) },
        verificationStatus: "PENDING",
      },
    },
    { $group: { _id: "$assignedReviewerId", count: { $sum: 1 } } },
  ]);

  const loadById = new Map(loads.map((row) => [String(row._id), row.count]));

  let lowest = Infinity;
  let candidates = [];

  for (const reviewer of reviewers) {
    const load = loadById.get(String(reviewer._id)) || 0;

    if (load < lowest) {
      lowest = load;
      candidates = [reviewer];
    } else if (load === lowest) {
      candidates.push(reviewer);
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)]._id;
};

const assignEvidence = async (evidenceId, track, candidateUserId) => {
  const reviewerId = await pickReviewer(track, candidateUserId);

  if (!reviewerId) return null; // stays in the track's shared pool

  await Evidence.updateOne(
    { _id: evidenceId, assignedReviewerId: null },
    { $set: { assignedReviewerId: reviewerId, assignedAt: new Date() } }
  );

  return reviewerId;
};

const getViewer = async (userId) => {
  const user = await User.findById(userId).select("role reviewerTracks").lean();

  if (!user) throw new AppError("User not found", 404);

  return { userId: user._id, role: user.role, tracks: user.reviewerTracks || [] };
};

// Which evidence this reviewer may see and decide on.
const scopeFilter = (viewer) => {
  if (viewer.role === "ADMIN") return {};

  return {
    $or: [
      { assignedReviewerId: viewer.userId },
      { assignedReviewerId: null, track: { $in: viewer.tracks } },
      { assignedReviewerId: null, track: null },
    ],
  };
};

const canAccess = (evidence, viewer) => {
  if (viewer.role === "ADMIN") return true;

  if (evidence.assignedReviewerId) {
    return String(evidence.assignedReviewerId) === String(viewer.userId);
  }

  return !evidence.track || viewer.tracks.includes(evidence.track);
};

module.exports = { assignEvidence, getViewer, scopeFilter, canAccess };