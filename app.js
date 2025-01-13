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

app.post('/set-user', async (req, res) => {
  const { role, id } = req.body;

  if (!role || !id) {
    return res.status(400).send('Missing data');
  }

  let name = '';
  if (role === 'student') {
    const result = await client.query('SELECT * FROM projekt.student WHERE id = $1', [id]);
    name = result.rows[0].ime + ' ' + result.rows[0].prezime;
  } else {
    const result = await client.query('SELECT * FROM projekt.profesor WHERE id = $1', [id]);
    name = result.rows[0].ime + ' ' + result.rows[0].prezime;
  }

  req.session.user = { role, id, name };
  const redirectPage = role === 'student' ? '/student' : '/mentor';

  console.log('User set:', req.session.user.id);
  res.redirect(redirectPage);
});

app.get('/student', async (req, res) => {
  const user = req.session.user;
  console.log(user);
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
        rank: mentor.rank
      };
    });

    // Filter out selected mentors from the list of all mentors
    const remainingMentors = mentors.filter(mentor =>
      !selectedMentors.some(selected => selected.id === mentor.id)
    );

    

    res.render('student', { id: user.id, selectedMentors, remainingMentors, name: user.name });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/mentor', async (req, res) => {
  const user = req.session.user;
  if (!user.id || user.role !== 'mentor') {
    return res.status(403).send('Access denied');
  }

  
  let students = [];
  try {
    const queryResults = await client.query('SELECT * FROM projekt.get_students_by_mentor($1)', [user.id]);

    students = queryResults.rows.map(student => {
      return {
        id: student.student_id,
        name: `${student.ime} ${student.prezime}`,
        rank: student.rank
      };
    });
    console.log(students);
    res.render('mentor', { id: user.id, students, name: user.name });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/mentor/save', (req, res) => {
  const { students, id } = req.body;

  if (!students || !id) {
    return res.status(400).send('Missing data');
  }

  const mentorId = id;
  students.forEach(student => {
    const studentId = student.id;
    const rank = student.rank;
    try {
      client.query('SELECT * FROM projekt.update_mentor_odabir($1, $2, $3)', [mentorId, studentId, rank]);
    }
    catch (error) {
      console.error('Error saving ranks:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  res.status(200).send('Data saved successfully!');
});

app.post('/student/save', async (req, res) => {
  const { selectedMentors, id } = req.body;

  if (!selectedMentors || !id) {
    return res.status(400).send('Missing data');
  }

  const studentId = id;

  

  try {
    // Fetch current mentors from the student_odabir table
    const currentMentorsResult = await client.query('SELECT profesor_id FROM projekt.student_odabir WHERE student_id = $1', [studentId]);
    const currentMentors = currentMentorsResult.rows.map(row => row.profesor_id);

    // Find mentors to remove
    const selectedMentorIds = selectedMentors.map(mentor => parseInt(mentor.id));
    console.log(selectedMentorIds);
    const mentorsToRemove = currentMentors.filter(mentorId => !selectedMentorIds.includes(mentorId));
    console.log(mentorsToRemove);
    // Remove mentors that are no longer selected
    for (const mentorId of mentorsToRemove) {
      await client.query('DELETE FROM projekt.student_odabir WHERE student_id = $1 AND profesor_id = $2', [studentId, mentorId]);
    }

    // Update or insert selected mentors
    for (const mentor of selectedMentors) {
      const mentorId = mentor.id;
      const rank = mentor.rank;
      await client.query('SELECT * FROM projekt.update_student_odabir($1, $2, $3)', [studentId, mentorId, rank]);
    }

    res.status(200).send('Data saved successfully!');
  } catch (error) {
    console.error('Error saving ranks:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
