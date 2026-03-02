# Website Content API

Local Node.js/Express API for managing your website content (books, concerts, TV shows).

## Setup

### 1. Install Dependencies

```bash
cd scripts/
npm install
```

### 2. Configure

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Then edit `.env`:
- `API_KEY` - Set a secure API key (used for requests)
- `GIT_USER_NAME` - Your name for commit messages
- `GIT_USER_EMAIL` - Your email for commit messages
- `GITHUB_TOKEN` - (Optional) GitHub token for remote commits

### 3. Start the Server

```bash
npm start
```

Server will start on `http://localhost:3000`

## Usage

### Option A: Using the CLI Client

```bash
# Add a book (2026 is default year)
node api-client.js books add --author "James Clavell" --title "Shogun" --year 2026

# Add a concert
node api-client.js concerts add --artist "Dream Theater" --date "2026-03-15" --venue "Sydney Opera House" --songs "Song 1, Song 2, Song 3"

# Add a TV show you watched
node api-client.js tv add --show "Severance" --year 2026 --type watched

# Add a show to your watchlist
node api-client.js tv add --show "True Detective" --type towatch

# List all data
node api-client.js books list
node api-client.js concerts list
node api-client.js tv list

# Check status
node api-client.js status
```

### Option B: Using curl

```bash
# Add a book
curl -X POST http://localhost:3000/api/books/add \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "author": "Osamu Dazai",
    "title": "No Longer Human",
    "year": 2026
  }'

# Add a concert
curl -X POST http://localhost:3000/api/concerts/add \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "artist": "Dream Theater",
    "date": "2026-03-15",
    "venue": "Sydney Opera House",
    "songs": ["The Dark Eternal Night", "Under a Glass Moon"]
  }'

# Add a TV show
curl -X POST http://localhost:3000/api/tv/add \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "show": "Severance",
    "year": 2026,
    "type": "watched"
  }'

# List books
curl http://localhost:3000/api/books/list \
  -H "X-API-Key: test-key"
```

## API Endpoints

All endpoints require `X-API-Key` header with your API key (default: `test-key`).

### Books

- **POST** `/api/books/add`
  - Required: `author`, `title`
  - Optional: `year` (default: current year), `note`

- **POST** `/api/books/list`
  - Returns all books

node api-client.js tv add --show "True Detective" --type watchlist

- **POST** `/api/concerts/add`
  - Required: `artist`, `date`, `venue`
  - Optional: `songs` (array of song names)
- **POST** `/api/concerts/list`
  - Returns all concerts


- **POST** `/api/tv/add`
  - Required: `show`
  - Optional: `year` (default: current year), `type` ('watched' or 'towatch')

- **POST** `/api/tv/list`
  - Returns watched shows and watchlist

### Utility

- **GET** `/api/status`
  - Returns API status and configuration

- **POST** `/api/commit`
  - Manually commit changes
  - Body: `{ "message": "Commit message" }`

## How It Works

1. **Receive request** → API validates data
2. **Update files** → Reads HTML/JSON, modifies content
3. **Auto-commit** → Git commits changes to your repo
4. **Ready** → Push to GitHub when you want (changes tracked locally)

## Workflow

```bash
# Terminal 1: Keep API running
cd scripts/
npm start

# Terminal 2: Send commands
node api-client.js books add --author "Author" --title "Title"
node api-client.js concerts add --artist "Artist" --date "2026-03-15" --venue "Venue"
node api-client.js tv add --show "Show Name"

# When ready to push
cd ..
git push origin main
```

## Notes

- API makes local Git commits automatically
- You control when to push to GitHub (everything stays local until you `git push`)
- All changes are logged to HTML/JSON files in your repo
- The API key (`test-key`) is insecure for production - change it in `.env`
