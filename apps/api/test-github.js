
require("dotenv").config();

const {
  getRepositoryEvidence,
  getRepositorySourceFiles,
} = require("./src/integrations/github/github.service");

const testGitHubIntegration = async () => {
  try {
    const repositoryUrl =
      "https://github.com/sohailansari99/Proovix";

    const evidence = await getRepositoryEvidence(repositoryUrl);

    console.log("\n--- Repository Details ---");
    console.log(JSON.stringify(evidence.repository, null, 2));

    console.log("\n--- README Length ---");
    console.log(evidence.readme.length, "characters");

    const files = await getRepositorySourceFiles(
      repositoryUrl,
      8
    );

    console.log("\n--- Source Files Retrieved ---");
    console.log("Total files:", files.length);

    for (const file of files) {
      console.log(`\nFile: ${file.path}`);
      console.log(`Code length: ${file.code.length} characters`);
      console.log(file.code.slice(0, 300));
    }

    console.log("\nGitHub source-code test completed!");
  } catch (error) {
    console.error("\nGitHub integration failed:");
    console.error(error.message);
    process.exitCode = 1;
  }
};

testGitHubIntegration();
