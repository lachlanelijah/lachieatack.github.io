#!/usr/bin/env node

/**
 * Website API Client
 * Simple CLI to interact with the local API
 * 
 * Usage:
 *   node api-client.js books add --author "Name" --title "Book" --year 2026
 *   node api-client.js concerts add --artist "Artist" --date "2026-03-03" --venue "Venue" --songs "Song1, Song2"
 *   node api-client.js tv add --show "Show Name" --year 2026
 */

const http = require('http');
const API_URL = 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-key';

// Parse command line arguments
const args = process.argv.slice(2);
const [resource, action, ...params] = args;

// Parse params into object
const options = {};
for (let i = 0; i < params.length; i += 2) {
  const key = params[i].replace('--', '');
  const value = params[i + 1];
  
  if (key === 'songs') {
    options[key] = value.split(',').map(s => s.trim());
  } else {
    options[key] = value;
  }
}

function makeRequest(endpoint, method = 'POST', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}${endpoint}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  try {
    if (!resource || !action) {
      console.log(`
Website API Client

Usage:
  # Add a book
  node api-client.js books add --author "Author Name" --title "Book Title" --year 2026

  # Add a concert
  node api-client.js concerts add --artist "Artist Name" --date "2026-03-03" --venue "Venue Name" --songs "Song 1, Song 2, Song 3"

  # List concerts
  node api-client.js concerts list

  # Add a watched TV show
  node api-client.js tv add --show "Show Name" --year 2026 --type watched

  # Add a show to watch list
  node api-client.js tv add --show "Show Name" --type towatch

  # List TV shows
  node api-client.js tv list

  # Check server status
  node api-client.js status

Environment Variables:
  API_KEY - Your API key (default: test-key)
  `);
      return;
    }

    let endpoint, data;

    if (resource === 'books') {
      if (action === 'add') {
        endpoint = '/api/books/add';
        data = {
          author: options.author,
          title: options.title,
          year: options.year ? parseInt(options.year) : new Date().getFullYear(),
          note: options.note || ''
        };
      } else if (action === 'list') {
        endpoint = '/api/books/list';
      }
    } else if (resource === 'concerts') {
      if (action === 'add') {
        endpoint = '/api/concerts/add';
        data = {
          artist: options.artist,
          date: options.date,
          venue: options.venue,
          songs: options.songs || []
        };
      } else if (action === 'list') {
        endpoint = '/api/concerts/list';
      }
    } else if (resource === 'tv') {
      if (action === 'add') {
        endpoint = '/api/tv/add';
        data = {
          show: options.show,
          year: options.year ? parseInt(options.year) : new Date().getFullYear(),
          type: options.type === 'towatch' ? 'towatch' : 'watched'
        };
      } else if (action === 'list') {
        endpoint = '/api/tv/list';
      }
    } else if (resource === 'status') {
      endpoint = '/api/status';
    }

    if (!endpoint) {
      console.error('Unknown command');
      return;
    }

    const method = action === 'list' || action === 'status' ? 'GET' : 'POST';
    const result = await makeRequest(endpoint, method, data);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
