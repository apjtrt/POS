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

const uploadImageToGithub = async (base64Data, filename, folder = 'images') => {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  
  if (!token || !repo || token.includes('your_github_token_here')) {
    console.log('GitHub integration not configured. Skipping image upload.');
    return null;
  }

  // Remove the data URI prefix (e.g., "data:image/jpeg;base64,")
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const path = `${folder}/${filename}`;
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    const response = await axios.put(
      url,
      {
        message: `Upload image ${filename}`,
        content: base64Content,
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
    console.error('Error uploading image to GitHub:', error.response?.data || error.message);
    return null; // Return null so the app doesn't crash on image upload failure
  }
};

module.exports = { uploadToGithub, uploadImageToGithub };
