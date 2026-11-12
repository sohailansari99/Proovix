require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const Candidate = require('../../src/modules/candidates/candidate.model');
const Skill = require('../../src/modules/skills/skill.model');
const Evidence = require('../../src/modules/evidence/evidence.model');
const CandidateSkill = require('../../src/modules/skills/candidateSkill.model');
const ReviewLog = require('../../src/modules/reviews/reviewLog.model');
const { generateToken } = require('../../src/core/utils/jwt');

let mongod;
let candidateJwt, reviewerJwt, adminJwt;
let candidateId, reviewerId, adminId;
let evidenceId, skillId;

async function seedReviewers() {
  const candidateUser = await User.create({
    email: 'candidate@cand.com',
    passwordHash: '$2b$12$dXj6jH6M5Z7lK6vF3yQ8eOXZ5vGpLqB7YJ5kR3nH0rW9tL4mE6uSy',
    role: 'CANDIDATE',
    emailVerified: true
  });
  const candidate = await Candidate.create({
    userId: candidateUser._id,
    fullName: 'Candidate User',
    username: 'canduser'
  });
  candidateId = candidate._id;
  candidateJwt = generateToken({ userId: candidateUser._id.toString(), role: 'CANDIDATE' });

  const reviewer1 = await User.create({
    email: 'reviewer1@rev.com',
    passwordHash: '$2b$12$dXj6jH6M5Z7lK6vF3yQ8eOXZ5vGpLqB7YJ5kR3nH0rW9tL4mE6uSy',
    role: 'REVIEWER',
    emailVerified: true,
    reviewerTracks: ['FRONTEND']
  });
  reviewerId = reviewer1._id;
  reviewerJwt = generateToken({ userId: reviewer1._id.toString(), role: 'REVIEWER' });

  const adminUser = await User.create({
    email: 'admin@admin.com',
    passwordHash: '$2b$12$dXj6jH6M5Z7lK6vF3yQ8eOXZ5vGpLqB7YJ5kR3nH0rW9tL4mE6uSy',
    role: 'ADMIN',
    emailVerified: true
  });
  adminId = adminUser._id;
  adminJwt = generateToken({ userId: adminUser._id.toString(), role: 'ADMIN' });

  const skill = await Skill.create({
    name: 'React',
    slug: 'react',
    category: 'UI Library',
    track: 'FRONTEND',
    description: 'JS library for UIs',
    competencies: ['Hooks', 'Components']
  });
  skillId = skill._id;

  const cs = await CandidateSkill.create({
    candidateId,
    skillId,
    verificationStatus: 'UNVERIFIED'
  });

  const ev = await Evidence.create({
    candidateId,
    candidateSkillId: cs._id,
    type: 'PROJECT',
    title: 'Test Evidence',
    track: 'FRONTEND'
  });
  evidenceId = ev._id;
}

describe('Reviews Tests', () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    await seedReviewers();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  test('candidate gets 403 on reviews route', async () => {
    const res = await request(app)
      .get('/api/v1/reviews/queue')
      .set('Authorization', `Bearer ${candidateJwt}`);
    expect(res.status).toBe(403);
  });

  test('rejecting requires reason of at least 10 characters', async () => {
    const res = await request(app)
      .post(`/api/v1/reviews/evidence/${evidenceId}/decision`)
      .set('Authorization', `Bearer ${reviewerJwt}`)
      .send({ status: 'REJECTED', note: 'Short' });
    expect(res.status).toBe(400);
  });

  test('approving requires AI analysis', async () => {
    const res = await request(app)
      .post(`/api/v1/reviews/evidence/${evidenceId}/decision`)
      .set('Authorization', `Bearer ${reviewerJwt}`)
      .send({ status: 'VERIFIED', note: 'This is a longer note that meets requirements' });
    expect(res.status).toBe(400);
  });

  test('self-review is blocked', async () => {
    await Evidence.findByIdAndUpdate(evidenceId, { assignedReviewerId: candidateId });

    const res = await request(app)
      .post(`/api/v1/reviews/evidence/${evidenceId}/decision`)
      .set('Authorization', `Bearer ${candidateJwt}`)
      .send({ status: 'REJECTED', note: 'This is a longer note that meets requirements' });
    expect(res.status).not.toBe(200);
  });
});
