const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Set up view engine (EJS)
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Read mentors from mentors.txt file and parse it
function loadMentors() {
  const filePath = path.join(__dirname, 'mentors.txt');
  const data = fs.readFileSync(filePath, 'utf-8');
  return data.split('\n').map(mentor => mentor.trim()).filter(mentor => mentor);
}

// Render the homepage with mentors list
app.get('/', (req, res) => {
  const mentors = loadMentors();  // Load mentors from the file
  res.render('index', { mentors });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
