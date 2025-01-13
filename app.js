const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;

const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: '172.17.176.1',
  database: 'projekt',
  password: 'Tomi1234',
  port: 5432,  
});

client.connect(function(err) {
  if (err) {
    return console.error('could not connect to postgres', err);
  }
  console.log('connected to postgres');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

const studentsFile = path.join(__dirname, 'data', 'repo', 'students.txt');
const studentsTable = client.query('SELECT * FROM projekt.student', (err, res) => {
  if (err) {
    console.error(err);
    return;
  }
});
const mentorsFile = path.join(__dirname, 'data', 'repo', 'mentors.txt');
const mentorsTable = client.query('SELECT * FROM projekt.profesor', (err, res) => {
  if (err) {
    console.error(err);
    return;
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/select-user/:role', async (req, res) => {
  const { role } = req.params;
  const file = role === 'student' ? studentsFile : mentorsFile;

  /*fs.readFile(file, 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading file');
    }

    const users = data.split('\n').filter(name => name.trim() !== '');
    res.render('select-user', { users, role });
  });*/

  let queryResults = [];
  if (role === 'student') {
    const result = await client.query('SELECT * FROM projekt.student');
    queryResults = result.rows;
  } else {
    const result = await client.query('SELECT * FROM projekt.profesor');
    queryResults = result.rows;
  }

  //map queryResults to users, id, name and surname
  const users = queryResults.map(user => {
    return {
      id: user.id,
      name: user.ime + ' ' + user.prezime
    }
  });

  res.render('select-user', { users, role });

});

app.post('/set-user', (req, res) => {
  const { role, id } = req.body;

  if (!role || !id) {
    return res.status(400).send('Missing data');
  }

  req.session.user = { role, id };
  const redirectPage = role === 'student' ? '/student' : '/mentor';

  console.log('User set:', req.session.user.id);
  res.redirect(redirectPage);
});

app.get('/student', async (req, res) => {
  const user = req.session.user;
  if (!user.id || user.role !== 'student') {
    return res.status(403).send('Access denied');
  }

  let selectedMentors = [];

  try {
    // Fetch all mentors
    const queryResults = await client.query('SELECT * FROM projekt.profesor');
    const mentors = queryResults.rows.map(mentor => {
      return {
        id: mentor.id,
        name: `${mentor.ime} ${mentor.prezime}`,
      };
    });

    // Fetch mentors selected by the student
    const queryResults2 = await client.query('SELECT * FROM projekt.get_mentors_by_student($1)', [user.id]);
    
    // Unpack rows properly
    selectedMentors = queryResults2.rows.map(mentor => {
      return {
        id: mentor.profesor_id, // Ensure this matches the column names returned by your function
        name: `${mentor.ime} ${mentor.prezime}`,
      };
    });

    // Filter out selected mentors from the list of all mentors
    const remainingMentors = mentors.filter(mentor =>
      !selectedMentors.some(selected => selected.id === mentor.id)
    );

    res.render('student', { id: user.id, selectedMentors, remainingMentors });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/mentor', (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'mentor') {
    return res.status(403).send('Access denied');
  }

  const mentorName = user.name.trim();
  const studentsWhoSelected = [];

  const studentsDir = path.join(__dirname, 'data', 'picks', 'students');
  fs.readdirSync(studentsDir).forEach((file) => {
    const studentPicks = fs.readFileSync(path.join(studentsDir, file), 'utf-8').split('\n').map(m => m.trim());
    if (studentPicks.includes(mentorName)) {
      studentsWhoSelected.push(file.replace('.txt', '').replace('student-', 'Student '));
    }
  });

  const mentorFilePath = path.join(__dirname, 'data', 'picks', 'mentors', `${mentorName}.txt`);
  let savedStudents = [];
  if (fs.existsSync(mentorFilePath)) {
    savedStudents = fs.readFileSync(mentorFilePath, 'utf-8').split('\n').map(s => s.trim()).filter(s => s !== '');
  }

  const unsavedStudents = studentsWhoSelected.filter(s => !savedStudents.includes(s));
  const allStudents = [...savedStudents, ...unsavedStudents];

  res.render('mentor', { mentorName, students: allStudents });
});

app.post('/mentor/save', (req, res) => {
  const { students, mentorName } = req.body;

  if (!students || !mentorName) {
    return res.status(400).send('Missing data');
  }

  const cleanedMentorName = mentorName.trim();
  const mentorNumber = cleanedMentorName.split(' ')[1];
  const mentorFileName = `mentor-${mentorNumber}.txt`;
  const mentorDir = path.join(__dirname, 'data', 'picks', 'mentors');
  const filePath = path.join(mentorDir, mentorFileName);
  const textContent = students.join('\n');

  fs.mkdirSync(mentorDir, { recursive: true });

  try {
    fs.writeFileSync(filePath, textContent, 'utf-8');
    res.send('Data saved successfully!');
  } catch (err) {
    console.error('Error writing file:', err);
    res.status(500).send('Error saving file');
  }
});

app.get('/get-student-name', (req, res) => {
  if (req.session.user && req.session.user.role === 'student') {
    return res.json({ studentName: req.session.user.name });
  }
  res.status(404).send('Student not found');
});

app.get('/get-mentor-name', (req, res) => {
  if (req.session.user && req.session.user.role === 'mentor') {
    return res.json({ mentorName: req.session.user.name });
  }
  res.status(404).send('Mentor not found');
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
