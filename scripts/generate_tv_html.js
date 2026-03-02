// Script to generate tv.html from tv.json
const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, '..');
const tvPath = path.join(repoPath, 'data', 'tv.json');
const htmlPath = path.join(repoPath, 'tv.html');

const tv = JSON.parse(fs.readFileSync(tvPath, 'utf8'));
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove old TV sections
html = html.replace(/<section>[\s\S]*?<\/section>/g, '');

const footerIndex = html.indexOf('<footer>');
const beforeFooter = html.slice(0, footerIndex);
const afterFooter = html.slice(footerIndex);

// Generate new TV sections
let sections = '';
// ...existing code...
Object.keys(tv).filter(y => y !== 'toWatch').sort((a, b) => b - a).forEach(year => {
  sections += `  <section>\n    <h2>&gt; Watched — ${year}</h2>\n    <ul>\n`;
  const sorted = [...tv[year]].sort((a, b) => {
    const aName = typeof a === 'string' ? a : (a.show || '');
    const bName = typeof b === 'string' ? b : (b.show || '');
    return aName.localeCompare(bName);
  });
  sorted.forEach(entry => {
    if (typeof entry === 'string') {
      sections += `      <li>${entry}</li>\n`;
    } else if (entry && typeof entry === 'object') {
      sections += `      <li>${entry.show}\n`;
      if (Array.isArray(entry.seasons) && entry.seasons.length) {
        sections += '        <ul class=\"seasons-list\">\n';
        entry.seasons.forEach(season => {
          sections += `          <li>Season ${season}</li>\n`;
        });
        sections += '        </ul>\n';
      }
      sections += '      </li>\n';
    }
  });
  sections += '    </ul>\n  </section>\n';
});

const newHtml = beforeFooter + sections + afterFooter;
fs.writeFileSync(htmlPath, newHtml);
console.log('tv.html updated from tv.json');
