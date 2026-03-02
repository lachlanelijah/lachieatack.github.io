const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Octokit } = require('octokit');
const simpleGit = require('simple-git');

const app = express();
app.use(express.json());

// Configuration
const API_KEY = process.env.API_KEY || 'test-key';
const API_PORT = process.env.API_PORT || 3000;
const REPO_PATH = path.join(__dirname, '..');
const git = simpleGit(REPO_PATH);

// GitHub setup (optional - for remote commits)
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Middleware for API key authentication
const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use(authenticateAPI);

// ============ BOOKS ENDPOINTS ============

app.post('/api/books/add', async (req, res) => {
  try {
    const { author, title, year = new Date().getFullYear(), note = '' } = req.body;

    if (!author || !title) {
      return res.status(400).json({ error: 'Author and title are required' });
    }

    const readingPath = path.join(REPO_PATH, 'reading.html');
    let content = fs.readFileSync(readingPath, 'utf8');

    // Create the book entry HTML
    const bookEntry = note
      ? `<li><strong>${author}</strong> — <em>${title}</em> (${note})</li>`
      : `<li><strong>${author}</strong> — <em>${title}</em></li>`;

    // Find the section for the given year
    const yearHeading = `<h2>&gt; Read — ${year}</h2>`;

    if (!content.includes(yearHeading)) {
      // Create new year section if it doesn't exist
      const newSection = `
    <section>
      <h2>&gt; Read — ${year}</h2>
      <ol>
        ${bookEntry}
      </ol>
    </section>`;

      content = content.replace(
        '    <footer>',
        newSection + '\n    <footer>'
      );
    } else {
      // Add to existing year section
      const regex = new RegExp(
        `(${yearHeading}\\s*<ol>)([\\s\\S]*?)(<\\/ol>)`,
        'g'
      );
      content = content.replace(regex, (match, opening, list, closing) => {
        return opening + '\n        ' + bookEntry + list + closing;
      });
    }

    fs.writeFileSync(readingPath, content);
    await commitChanges(`Add book: ${title} by ${author}`);

    res.json({ success: true, message: `Added "${title}" to ${year}` });
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/books/list', async (req, res) => {
  try {
    const readingPath = path.join(REPO_PATH, 'reading.html');
    const content = fs.readFileSync(readingPath, 'utf8');

    // Extract all book entries
    const bookRegex = /<li><strong>(.+?)<\/strong> — <em>(.+?)<\/em>(.+?)?<\/li>/g;
    const books = [];
    let match;

    while ((match = bookRegex.exec(content)) !== null) {
      books.push({
        author: match[1],
        title: match[2],
        note: match[3] ? match[3].trim() : ''
      });
    }

    res.json({ books });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONCERTS ENDPOINTS ============

app.post('/api/concerts/add', async (req, res) => {
  try {
    const { artist, date, venue, songs = [] } = req.body;

    if (!artist || !date || !venue) {
      return res.status(400).json({ error: 'Artist, date, and venue are required' });
    }

    const setlistPath = path.join(REPO_PATH, 'data', 'setlists.json');
    let data = JSON.parse(fs.readFileSync(setlistPath, 'utf8'));

    const key = `${artist}|${date}`;
    data[key] = {
      source: '',
      url: '',
      songs: Array.isArray(songs) ? songs : songs.split(',').map(s => s.trim())
    };

    fs.writeFileSync(setlistPath, JSON.stringify(data, null, 2));
    await commitChanges(`Add concert: ${artist} on ${date} at ${venue}`);

    res.json({ success: true, message: `Added ${artist} concert` });
  } catch (error) {
    console.error('Error adding concert:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/concerts/list', async (req, res) => {
  try {
    const setlistPath = path.join(REPO_PATH, 'data', 'setlists.json');
    const data = JSON.parse(fs.readFileSync(setlistPath, 'utf8'));

    const concerts = Object.entries(data).map(([key, value]) => {
      const [artist, date] = key.split('|');
      return {
        artist,
        date,
        songs: value.songs,
        url: value.url
      };
    });

    res.json({ concerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ TV SHOWS ENDPOINTS ============

app.post('/api/tv/add', async (req, res) => {
  try {
    const { show, year = new Date().getFullYear(), type = 'watched' } = req.body;

    if (!show) {
      return res.status(400).json({ error: 'Show name is required' });
    }

    const tvPath = path.join(REPO_PATH, 'tv.html');
    let content = fs.readFileSync(tvPath, 'utf8');

    const sectionKey = type === 'watched' ? `Watched — ${year}` : 'To Watch';
    const heading = `<h2>&gt; ${sectionKey}</h2>`;

    if (type === 'watched') {
      // Add to watched section
      if (!content.includes(heading)) {
        const newSection = `
    <section>
      <h2>&gt; ${sectionKey}</h2>
      <ul>
        <li>${show}</li>
      </ul>
    </section>`;
        content = content.replace(
          '    <footer>',
          newSection + '\n    <footer>'
        );
      } else {
        const regex = new RegExp(
          `(${heading}\\s*<ul>)([\\s\\S]*?)(<\\/ul>)`,
          'g'
        );
        content = content.replace(regex, (match, opening, list, closing) => {
          return opening + '\n        <li>' + show + '</li>' + list + closing;
        });
      }
    } else {
      // Add to "To Watch" section
      const regex = new RegExp(
        `(<div class="card">.*?<\\/div>)([\\s\\S]*?)(<\\/div>\\s*<\\/section>)`,
        'g'
      );
      content = content.replace(regex, (match, firstCard, rest, closing) => {
        return firstCard + '\n        <div class="card">' + show + '</div>' + rest + closing;
      });
    }

    fs.writeFileSync(tvPath, content);
    await commitChanges(`Add TV show: ${show}`);

    res.json({ success: true, message: `Added "${show}"` });
  } catch (error) {
    console.error('Error adding TV show:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tv/list', async (req, res) => {
  try {
    const tvPath = path.join(REPO_PATH, 'tv.html');
    const content = fs.readFileSync(tvPath, 'utf8');

    // Extract shows from list items
    const showRegex = /<li>(.+?)<\/li>/g;
    const shows = [];
    let match;

    while ((match = showRegex.exec(content)) !== null) {
      shows.push(match[1]);
    }

    // Extract "To Watch" shows from cards
    const cardRegex = /<div class="card">(.+?)<\/div>/g;
    const toWatch = [];

    while ((match = cardRegex.exec(content)) !== null) {
      toWatch.push(match[1]);
    }

    res.json({ watched: shows, toWatch });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ UTILITY ENDPOINTS ============

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'API running',
    port: API_PORT,
    baseDir: REPO_PATH
  });
});

app.post('/api/commit', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Commit message required' });
    }

    await commitChanges(message);
    res.json({ success: true, message: 'Changes committed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ HELPER FUNCTIONS ============

async function commitChanges(message) {
  try {
    // Check if there are changes
    const status = await git.status();
    
    if (status.files.length === 0) {
      return { message: 'No changes to commit' };
    }

    // Configure git user if not already configured
    try {
      await git.addConfig('user.name', process.env.GIT_USER_NAME || 'API Bot');
      await git.addConfig('user.email', process.env.GIT_USER_EMAIL || 'api@example.com');
    } catch (e) {
      // User might already be configured
    }

    // Add and commit changes
    await git.add('.');
    await git.commit(message);

    console.log(`Committed: ${message}`);
    return { success: true, message };
  } catch (error) {
    console.error('Git commit error:', error.message);
    // Don't throw - allow the request to succeed even if git commit fails
    return { warning: 'Changes made but git commit failed', error: error.message };
  }
}

// ============ START SERVER ============

app.listen(API_PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║      Website API Server Running        ║
╚════════════════════════════════════════╝

📡 Server: http://localhost:${API_PORT}
🔑 API Key: ${API_KEY}
📁 Repo: ${REPO_PATH}

Example requests:
  POST http://localhost:${API_PORT}/api/books/add
  POST http://localhost:${API_PORT}/api/concerts/add
  POST http://localhost:${API_PORT}/api/tv/add

Set X-API-Key header with: ${API_KEY}
  `);
});

module.exports = app;
