const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const mentors = fs.readFileSync(path.join(__dirname, 'data', 'mentors.txt'), 'utf-8').split('\n');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/student', (req, res) => {
  res.render('student', { mentors: mentors });
});

app.get('/mentor', (req, res) => {
  res.render('mentor');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
