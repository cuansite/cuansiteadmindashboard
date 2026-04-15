import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/deploy", async (req, res) => {
    try {
      const { gitUrl, projectName } = req.body;
      
      if (!gitUrl || !projectName) {
        return res.status(400).json({ error: "Missing gitUrl or projectName" });
      }

      const vercelToken = process.env.VERCEL_API_TOKEN;
      if (!vercelToken) {
        return res.status(500).json({ error: "Vercel API token is not configured on the server." });
      }

      // Extract owner and repo from GitHub URL (e.g., https://github.com/username/repo)
      let repoPath = "";
      try {
        const urlObj = new URL(gitUrl);
        if (urlObj.hostname === "github.com") {
          repoPath = urlObj.pathname.substring(1); // removes leading slash
          if (repoPath.endsWith(".git")) {
            repoPath = repoPath.slice(0, -4);
          }
        } else {
          return res.status(400).json({ error: "Only GitHub URLs are currently supported." });
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid Git URL format." });
      }

      // Fetch repoId and default branch from GitHub API
      let repoId = "";
      let defaultBranch = "main";
      try {
        const githubRes = await fetch(`https://api.github.com/repos/${repoPath}`);
        const githubText = await githubRes.text();
        
        if (!githubRes.ok) {
          if (githubRes.status === 404) {
            return res.status(400).json({ error: "GitHub repository not found or is private. Please ensure it is public." });
          }
          let errorMsg = `GitHub API error: ${githubRes.statusText}`;
          try {
            const errData = JSON.parse(githubText);
            if (errData.message) errorMsg = errData.message;
          } catch (e) {}
          throw new Error(errorMsg);
        }
        
        let githubData;
        try {
          githubData = JSON.parse(githubText);
        } catch (e) {
          throw new Error("GitHub API returned invalid JSON.");
        }
        repoId = String(githubData.id);
        if (githubData.default_branch) {
          defaultBranch = githubData.default_branch;
        }
      } catch (e: any) {
        return res.status(500).json({ error: e.message || "Failed to resolve GitHub repository ID." });
      }

      // Call Vercel API to create a deployment
      const vercelApiUrl = process.env.VERCEL_TEAM_ID 
        ? `https://api.vercel.com/v13/deployments?teamId=${process.env.VERCEL_TEAM_ID}`
        : "https://api.vercel.com/v13/deployments";

      console.log(`Attempting to deploy to Vercel. URL: ${vercelApiUrl}`);
      console.log(`Using Token (first 5 chars): ${vercelToken.substring(0, 5)}...`);
      console.log(`Team ID configured: ${process.env.VERCEL_TEAM_ID ? 'Yes' : 'No'}`);

      const response = await fetch(vercelApiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50),
          gitSource: {
            type: "github",
            repoId: repoId,
            ref: defaultBranch
          }
        }),
      });

      const vercelText = await response.text();
      let data;
      try {
        data = JSON.parse(vercelText);
      } catch (e) {
        console.error("Vercel API returned HTML/Invalid JSON:", vercelText.substring(0, 200));
        return res.status(500).json({ error: "Vercel API returned an invalid response. Please try again." });
      }

      if (!response.ok) {
        console.error("Vercel API Error:", JSON.stringify(data));
        let errorMsg = data.error?.message || "Failed to trigger deployment on Vercel.";
        
        if (data.error?.code === 'forbidden' && data.error?.message === 'Not authorized') {
          errorMsg = "Vercel menolak akses. Ini BUKAN karena token salah, melainkan karena Vercel belum diberi izin untuk membaca repository GitHub Anda. Solusi: Buka https://github.com/apps/vercel/installations/new dan berikan akses ke repository Anda, lalu coba lagi.";
        }

        const errorCode = data.error?.code ? ` [Code: ${data.error.code}]` : "";
        const detailedError = data.error ? JSON.stringify(data.error) : "";
        return res.status(response.status).json({ error: `${errorMsg}${errorCode} - Details: ${detailedError}` });
      }

      res.json({ 
        success: true, 
        deploymentId: data.id,
        url: data.url,
        readyState: data.readyState
      });

    } catch (error: any) {
      console.error("Deploy endpoint error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
