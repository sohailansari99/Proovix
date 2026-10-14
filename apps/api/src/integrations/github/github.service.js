
const AppError = require("../../core/errors/AppError");

const GITHUB_API = "https://api.github.com";

const parseGitHubUrl = (repositoryUrl) => {
  let url;

  try {
    url = new URL(repositoryUrl);
  } catch {
    throw new AppError("Invalid GitHub repository URL", 400);
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new AppError(
      "Only public GitHub repository URLs are supported",
      400
    );
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length !== 2) {
    throw new AppError(
      "Provide a URL like https://github.com/owner/repo",
      400
    );
  }

  const [owner, rawRepo] = parts;
  const repo = rawRepo.replace(/\.git$/i, "");

  if (
    !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(owner) ||
    !/^[a-zA-Z0-9._-]+$/.test(repo) ||
    repo === "." ||
    repo === ".."
  ) {
    throw new AppError("Invalid GitHub repository URL", 400);
  }

  return { owner, repo };
};

const githubRequest = async (endpoint) => {
  let response;

  try {
    response = await fetch(`${GITHUB_API}${endpoint}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Proovix",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new AppError("Unable to connect to GitHub", 502);
  }

  if (response.status === 404) {
    throw new AppError(
      "GitHub repository not found or not publicly accessible",
      404
    );
  }

  if (response.status === 403 || response.status === 429) {
    throw new AppError(
      "GitHub API rate limit reached. Please try again later.",
      429
    );
  }

  if (!response.ok) {
    throw new AppError("GitHub API request failed", 502);
  }

  return response.json();
};

const getRepositoryEvidence = async (repositoryUrl) => {
  if (
    typeof repositoryUrl !== "string" ||
    !repositoryUrl.trim()
  ) {
    throw new AppError("GitHub repository URL is required", 400);
  }

  const { owner, repo } = parseGitHubUrl(repositoryUrl.trim());
  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);

  const repository = await githubRequest(
    `/repos/${encodedOwner}/${encodedRepo}`
  );

  if (repository.private || repository.disabled) {
    throw new AppError(
      "This repository is not available for public analysis",
      400
    );
  }

  let readme = "";

  try {
    const readmeData = await githubRequest(
      `/repos/${encodedOwner}/${encodedRepo}/readme`
    );

    if (
      readmeData.encoding === "base64" &&
      readmeData.content
    ) {
      readme = Buffer.from(
        readmeData.content,
        "base64"
      )
        .toString("utf8")
        .slice(0, 12000);
    }
  } catch (error) {
    if (error.statusCode !== 404 && error.status !== 404) {
      throw error;
    }
  }

  return {
    repository: {
      name: repository.full_name,
      description: repository.description || "",
      url: repository.html_url,
      language: repository.language || "Not specified",
      stars: repository.stargazers_count,
      defaultBranch: repository.default_branch,
      updatedAt: repository.updated_at,
    },
    readme,
  };
};

const getRepositorySourceFiles = async (
  repositoryUrl,
  maxFiles = 8
) => {
  if (
    typeof repositoryUrl !== "string" ||
    !repositoryUrl.trim()
  ) {
    throw new AppError("GitHub repository URL is required", 400);
  }

  if (
    !Number.isInteger(maxFiles) ||
    maxFiles < 1 ||
    maxFiles > 10
  ) {
    throw new AppError(
      "maxFiles must be an integer between 1 and 10",
      400
    );
  }

  const { owner, repo } = parseGitHubUrl(repositoryUrl.trim());
  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);

  const repository = await githubRequest(
    `/repos/${encodedOwner}/${encodedRepo}`
  );

  if (repository.private || repository.disabled) {
    throw new AppError(
      "This repository is not available for public analysis",
      400
    );
  }

  const branch = encodeURIComponent(repository.default_branch);

  const tree = await githubRequest(
    `/repos/${encodedOwner}/${encodedRepo}/git/trees/${branch}?recursive=1`
  );

  if (tree.truncated) {
    throw new AppError(
      "Repository is too large to inspect completely",
      422
    );
  }

  const ignoredDirectories = [
    "node_modules/",
    "dist/",
    "build/",
    "coverage/",
    ".git/",
    "vendor/",
  ];

  const allowedExtensions = /\.(js|cjs|mjs|jsx)$/i;

 
const priorityForPath = (filePath) => {
  // External service integrations are important evidence.
  if (/\/integrations\//i.test(`/${filePath}`)) return 0;

  // Core application features.
  if (/\/modules\/evidence\//i.test(`/${filePath}`)) return 1;
  if (/\/modules\/skills\//i.test(`/${filePath}`)) return 2;
  if (/\/modules\/candidates\//i.test(`/${filePath}`)) return 3;
  if (/\/modules\/(auth|users)\//i.test(`/${filePath}`)) return 4;

  // Common backend architecture.
  if (/\/(controllers?|services?|models?|routes?)\//i.test(`/${filePath}`)) return 5;

  // Shared infrastructure.
  if (/\/(core|config)\//i.test(`/${filePath}`)) return 6;

  return 7;
};

  const files = tree.tree
    .filter(
      (item) =>
        item.type === "blob" &&
        typeof item.size === "number" &&
        item.size <= 100000 &&
        allowedExtensions.test(item.path) &&
        !ignoredDirectories.some((dir) =>
          item.path.startsWith(dir)
        )
    )
    .sort((a, b) => {
      const priorityDifference =
        priorityForPath(a.path) - priorityForPath(b.path);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return a.path.localeCompare(b.path);
    })
    .slice(0, maxFiles);

  const sourceFiles = await Promise.all(
    files.map(async (file) => {
      const encodedPath = file.path
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const content = await githubRequest(
        `/repos/${encodedOwner}/${encodedRepo}/contents/${encodedPath}?ref=${branch}`
      );

      let code = "";

      if (
        content.encoding === "base64" &&
        typeof content.content === "string"
      ) {
        code = Buffer.from(
          content.content,
          "base64"
        )
          .toString("utf8")
          .slice(0, 12000);
      }

      return {
        path: file.path,
        size: file.size,
        code,
      };
    })
  );

  return sourceFiles;
};

module.exports = {
  getRepositoryEvidence,
  getRepositorySourceFiles,
};
