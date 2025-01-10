const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

const studentsFile = path.join(__dirname, 'data', 'repo', 'students.txt');
const mentorsFile = path.join(__dirname, 'data', 'repo', 'mentors.txt');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/select-user/:role', (req, res) => {
  const { role } = req.params;
  const file = role === 'student' ? studentsFile : mentorsFile;

  fs.readFile(file, 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading file');
    }

    const users = data.split('\n').filter(name => name.trim() !== '');
    res.render('select-user', { users, role });
  });
});

app.post('/set-user', (req, res) => {
  const { role, name } = req.body;

  if (!role || !name) {
    return res.status(400).send('Missing data');
  }

  req.session.user = { role, name };
  const redirectPage = role === 'student' ? '/student' : '/mentor';
  res.redirect(redirectPage);
});

app.get('/student', (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'student') {
    return res.status(403).send('Access denied');
  }

  const studentName = user.name.trim();
  const studentNumber = studentName.split(' ')[1].trim(); // Assuming student name format like 'Student 8'
  const studentFilePath = path.join(__dirname, 'data', 'picks', 'students', `student-${studentNumber}.txt`);

  const mentorsFile = path.join(__dirname, 'data', 'repo', 'mentors.txt');
  const mentors = fs.readFileSync(mentorsFile, 'utf-8').split('\n').map(mentor => mentor.trim()).filter(mentor => mentor !== '');

  let selectedMentors = [];

  if (fs.existsSync(studentFilePath)) {
    selectedMentors = fs.readFileSync(studentFilePath, 'utf-8').split('\n').map(mentor => mentor.trim()).filter(mentor => mentor !== '');
  }

  const remainingMentors = mentors.filter(mentor => !selectedMentors.includes(mentor));

  res.render('student', { studentName, selectedMentors, remainingMentors });
});

app.get('/mentor', (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'mentor') {
    return res.status(403).send('Access denied');
  }

  res.render('mentor', { mentorName: user.name });
});

app.get('/get-student-name', (req, res) => {
  if (req.session.user && req.session.user.role === 'student') {
    return res.json({ studentName: req.session.user.name });
  }
  res.status(404).send('Student not found');
});

app.post('/save', (req, res) => {
  const { selectedMentors, studentName } = req.body;

  if (!selectedMentors || !studentName) {
    return res.status(400).send('Missing data');
  }

  const cleanedStudentName = studentName.trim();
  const studentNumber = cleanedStudentName.split(' ')[1];
  const studentFileName = `student-${studentNumber}.txt`;
  const studentDir = path.join(__dirname, 'data', 'picks', 'students');
  const filePath = path.join(studentDir, studentFileName);
  const textContent = selectedMentors.join('\n');

  fs.mkdirSync(studentDir, { recursive: true });

  try {
    fs.writeFileSync(filePath, textContent, 'utf-8');
    res.send('Data saved successfully!');
  } catch (err) {
    console.error('Error writing file:', err);
    res.status(500).send('Error saving file');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
