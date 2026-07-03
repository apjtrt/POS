const axios = require('axios');

const uploadToGithub = async (pdfBytes, filename) => {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // format: "username/repo"
  
  if (!token || !repo || token.includes('your_github_token_here')) {
    console.log('GitHub integration not fully configured. Skipping actual upload.');
    return `https://mock-github-url.com/${repo}/${filename}`;
  }

  const content = Buffer.from(pdfBytes).toString('base64');
  const path = `2026/${filename}`;
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    const response = await axios.put(
      url,
      {
        message: `Add receipt ${filename}`,
        content,
      },
      {
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.content.download_url;
  } catch (error) {
    console.error('Error uploading to GitHub:', error.response?.data || error.message);
    throw new Error('Failed to upload PDF to GitHub');
  }
};

module.exports = { uploadToGithub };
