// Use production env for real server testing
require('dotenv').config();

const API_URL = "http://localhost:5000/api/v1";

async function post(path, data, token = null) {
  const url = `${API_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(`${path} failed (${r.status}): ${json.message || JSON.stringify(json)}`);
    return json;
  });
}

async function get(path, token = null) {
  const url = `${API_URL}${path}`;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return await fetch(url, { headers }).then(async r => {
    const json = await r.json();
    if (!r.ok) throw new Error(`${path} failed (${r.status}): ${json.message || JSON.stringify(json)}`);
    return json;
  });
}

async function verifyFlow() {
  const timestamp = Date.now();
  const email = `test_${timestamp}@gmail.com`;
  const username = `user_${timestamp}`;
  const reviewerEmail = `reviewer_${timestamp}@gmail.com`;

  try {
    console.log("1. Registering candidate...");
    await post("/auth/register", {
      email,
      password: "Password123!"
    });

    // In production environment without stubbing, we must find the verification link.
    // If the API logs it to the terminal as per verification.service.js:44,
    // we would need to capture that output. Since this is an automated script,
    // we assume the environment might be configured to stub in dev if needed,
    // but per requirements we are testing production logic.
    // If auto-verification isn't possible, this script will fail here
    // unless the environment allows verification bypass.

    console.log("2. Logging in as candidate...");
    const login = await post("/auth/login", { email, password: "Password123!" });
    const token = login.data.token;

    console.log("3. Creating candidate profile...");
    await post("/candidates", { fullName: "Test Candidate", username }, token);

    console.log("4. Fetching available skills...");
    const skills = await get("/skills", token);
    const reactSkill = skills.data.find(s => s.slug === 'react');

    console.log("5. Adding skill (React)...");
    const addedSkill = await post("/candidates/me/skills", { skillId: reactSkill._id }, token);
    const candidateSkillId = addedSkill.data._id;

    console.log("6. Adding evidence...");
    const evidence = await post("/candidates/me/evidence", {
      candidateSkillId,
      type: "PROJECT",
      title: "Test Project",
      description: "A test project description",
      sourceUrl: "https://github.com/test/project"
    }, token);

    console.log("7. Analyzing evidence (stubbed AI)...");
    const analysis = await post(`/candidates/me/evidence/${evidence.data._id}/analyze`, {}, token);
    console.log("AI Analysis Score:", analysis.data.confidenceScore);

    console.log("8. Registering a reviewer...");
    await post("/auth/register", {
      email: reviewerEmail,
      password: "Password123!",
      role: "REVIEWER",
      reviewerCode: "Proovix-Reviewer-7421",
      reviewerTracks: ["FRONTEND"]
    });

    console.log("9. Logging in as reviewer...");
    const reviewerLogin = await post("/auth/login", { email: reviewerEmail, password: "Password123!" });
    const reviewerToken = reviewerLogin.data.token;

    console.log("10. Reviewing evidence...");
    const decision = await post(`/reviews/evidence/${evidence.data._id}/decision`, {
      status: "VERIFIED",
      note: "Looks good! Great work."
    }, reviewerToken);
    console.log("Review Decision Status:", decision.data.evidence.verificationStatus);

    console.log("\nFULL FLOW VERIFIED SUCCESSFULLY!");

  } catch (err) {
    console.error("\nFLOW VERIFICATION FAILED:", err.message);
  }
}

verifyFlow();
