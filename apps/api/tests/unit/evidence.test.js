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
const { generateToken } = require('../../src/core/utils/jwt');

let mongod;
let jwt;
let candidateId;
let candidateSkillId;
let skillId;

async function seedData() {
  const user = await User.create({
    email: 'test@test.com',
    passwordHash: '$2b$12$dXj6jH6M5Z7lK6vF3yQ8eOXZ5vGpLqB7YJ5kR3nH0rW9tL4mE6uSy',
    role: 'CANDIDATE',
    emailVerified: true
  });

  const candidate = await Candidate.create({
    userId: user._id,
    fullName: 'Test Candidate',
    username: 'testcandidate'
  });
  candidateId = candidate._id;

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
  candidateSkillId = cs._id;

  jwt = generateToken({ userId: user._id.toString(), role: 'CANDIDATE' });
}

describe('Evidence Tests', () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    await seedData();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  afterEach(async () => {
    await Evidence.deleteMany({});
    await CandidateSkill.updateOne({ _id: candidateSkillId }, { $set: { verificationStatus: 'UNVERIFIED', confidenceScore: 0, aiAnalysis: null } });
  });

  test('create evidence should succeed', async () => {
    const res = await request(app)
      .post('/api/v1/candidates/me/evidence')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        candidateSkillId: candidateSkillId.toString(),
        type: 'PROJECT',
        title: 'My Project',
        description: 'A test project'
      });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('My Project');
  });

  test('editing PENDING evidence clears analysis and sets PENDING', async () => {
    const createRes = await request(app)
      .post('/api/v1/candidates/me/evidence')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        candidateSkillId: candidateSkillId.toString(),
        type: 'PROJECT',
        title: 'My Project'
      });
    const evidenceId = createRes.body.data._id;

    // Mark as analyzed and pending review
    await Evidence.findByIdAndUpdate(evidenceId, {
      verificationStatus: 'PENDING',
      confidenceScore: 85,
      aiAnalysis: { summary: 'test' }
    });

    const editRes = await request(app)
      .patch(`/api/v1/candidates/me/evidence/${evidenceId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ title: 'Updated Title' });

    expect(editRes.status).toBe(200);
    const updated = await Evidence.findById(evidenceId);
    expect(updated.verificationStatus).toBe('PENDING');
    expect(updated.confidenceScore).toBe(0);
    expect(updated.aiAnalysis).toBeNull();
  });

  test('cannot edit VERIFIED evidence', async () => {
    const createRes = await request(app)
      .post('/api/v1/candidates/me/evidence')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        candidateSkillId: candidateSkillId.toString(),
        type: 'PROJECT',
        title: 'My Project'
      });
    const evidenceId = createRes.body.data._id;

    await Evidence.findByIdAndUpdate(evidenceId, { verificationStatus: 'VERIFIED' });

    const res = await request(app)
      .patch(`/api/v1/candidates/me/evidence/${evidenceId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(400);
  });

  test('cannot edit REJECTED evidence', async () => {
    const createRes = await request(app)
      .post('/api/v1/candidates/me/evidence')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        candidateSkillId: candidateSkillId.toString(),
        type: 'PROJECT',
        title: 'My Project'
      });
    const evidenceId = createRes.body.data._id;

    await Evidence.findByIdAndUpdate(evidenceId, { verificationStatus: 'REJECTED' });

    const res = await request(app)
      .patch(`/api/v1/candidates/me/evidence/${evidenceId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(400);
  });
});
