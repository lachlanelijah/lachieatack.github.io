// Script to generate reading.html book sections from books.json
const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, '..');
const booksPath = path.join(repoPath, 'data', 'books.json');
const htmlPath = path.join(repoPath, 'reading.html');

// Read books.json
const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

// Read reading.html
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove old book sections
html = html.replace(/<section>[\s\S]*?<\/section>/g, '');

// Find where to insert (before <footer>)
const footerIndex = html.indexOf('<footer>');
const beforeFooter = html.slice(0, footerIndex);
const afterFooter = html.slice(footerIndex);

// Generate new book sections
let sections = '';
Object.keys(books).sort((a, b) => b - a).forEach(year => {
  sections += `  <section>\n    <h2>&gt; Read — ${year}</h2>\n`;
  // Group books by last name, then first name
  const grouped = {};
  books[year].forEach(book => {
    const last = book.lastName || '';
    const first = book.firstName || '';
    if (!grouped[last]) grouped[last] = {};
    if (!grouped[last][first]) grouped[last][first] = [];
    grouped[last][first].push(book);
  });
  const sortedLast = Object.keys(grouped).sort();
  sortedLast.forEach(last => {
    const sortedFirst = Object.keys(grouped[last]).sort();
    sortedFirst.forEach(first => {
      sections += `    <h3>${last}, ${first}</h3>\n    <ol>\n`;
      grouped[last][first].sort((a, b) => (a.title || '').localeCompare(b.title || '')).forEach(book => {
        const note = book.note ? ` (${book.note})` : '';
        sections += `      <li><em>${book.title}</em>${note}</li>\n`;
      });
      sections += '    </ol>\n';
    });
  });
  sections += '  </section>\n';
});

// Rebuild HTML
const newHtml = beforeFooter + sections + afterFooter;

// Write updated reading.html
fs.writeFileSync(htmlPath, newHtml);
console.log('reading.html updated from books.json');
