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
  host: 'localhost',
  database: 'projekt',
  password: 'admin',
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
  if (!user.name || user.role !== 'student') {
    return res.status(403).send('Access denied');
  }

  let selectedMentors = [];
  let assignedMentor = null;

  try {
    const studentIdMatch = user.name.match(/(\d+)\s*$/);
    if (!studentIdMatch) {
      console.error("Could not extract student ID from name:", user.name);
      return res.status(400).send("Invalid student format");
    }
    const studentId = studentIdMatch[1].trim();

    console.log("Extracted student ID:", studentId);

    // Read result.txt to find assigned mentor
    const filePath = path.join(__dirname, 'data/result/result.txt');

    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const lines = fileData.split('\n');

      for (const line of lines) {
        // Normalize spaces and extract student-mentor pair
        const match = line.trim().match(/^s(\d+)\s*->\s*m(\d+)$/);
        if (match) {
          const fileStudentId = match[1].trim();
          const fileMentorId = match[2].trim();

          if (fileStudentId === studentId) {
            assignedMentor = `m${fileMentorId}`;
            console.log(`Found assigned mentor: ${assignedMentor} for student ${studentId}`);
            break;
          }
        }
      }
    }

    // If a mentor was found, return early
    if (assignedMentor) {
      return res.render('student', { id: studentId, name: user.name, assignedMentor });
    }

    // Fetch all mentors from DB
    const queryResults = await client.query('SELECT * FROM projekt.profesor');
    const mentors = queryResults.rows.map(mentor => ({
      id: mentor.id,
      name: `${mentor.ime} ${mentor.prezime}`,
    }));

    // Fetch mentors selected by the student
    const queryResults2 = await client.query('SELECT * FROM projekt.get_mentors_by_student($1)', [studentId]);

    selectedMentors = queryResults2.rows.map(mentor => ({
      id: mentor.profesor_id,
      name: `${mentor.ime} ${mentor.prezime}`,
      rank: mentor.rank
    }));

    // Remove selected mentors from full list
    const remainingMentors = mentors.filter(mentor =>
        !selectedMentors.some(selected => selected.id === mentor.id)
    );

    res.render('student', { id: studentId, selectedMentors, remainingMentors, name: user.name, assignedMentor: null });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/mentor', async (req, res) => {
  const user = req.session.user;
  if (!user.name || user.role !== 'mentor') {
    return res.status(403).send('Access denied');
  }

  let students = [];
  let assignedStudents = [];
  let mentorFound = false;

  try {
    // Extract numeric mentor ID from `user.name`
    const mentorIdMatch = user.name.match(/(\d+)\s*$/);
    if (!mentorIdMatch) {
      console.error("Could not extract mentor ID from name:", user.name);
      return res.status(400).send("Invalid mentor format");
    }
    const mentorId = mentorIdMatch[1].trim();

    console.log("Extracted mentor ID:", mentorId);

    const filePath = path.join(__dirname, 'data/result/result.txt');

    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const lines = fileData.split('\n');

      for (const line of lines) {
        // Normalize spaces and extract student-mentor pair
        const match = line.trim().match(/^s(\d+)\s*->\s*m(\d+)$/);
        if (match) {
          const studentId = match[1].trim();
          const fileMentorId = match[2].trim();

          if (fileMentorId === mentorId) {
            assignedStudents.push({
              id: studentId,
              name: `StudentIme${studentId} StudentPrezime${studentId}` // For demonstration, adjust as needed
            });
            mentorFound = true; // Mentor found in result.txt
          }
        }
      }
    }

    console.log(`Assigned students for mentor ${mentorId}:`, assignedStudents);

    // If mentor is not found in result.txt, show students who selected the mentor
    if (!mentorFound) {
      const queryResults = await client.query('SELECT * FROM projekt.get_students_by_mentor($1)', [mentorId]);

      students = queryResults.rows.map(student => ({
        id: student.student_id,
        name: `${student.ime} ${student.prezime}`,
        rank: student.rank
      }));
    }

    res.render('mentor', { id: mentorId, students, name: user.name, assignedStudents, mentorFound });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).send('Internal Server Error');
  }
});



// app.get('/mentor', async (req, res) => {
//   const user = req.session.user;
//   if (!user.id || user.role !== 'mentor') {
//     return res.status(403).send('Access denied');
//   }
//
//
//   let students = [];
//   try {
//     const queryResults = await client.query('SELECT * FROM projekt.get_students_by_mentor($1)', [user.id]);
//
//     students = queryResults.rows.map(student => {
//       return {
//         id: student.student_id,
//         name: `${student.ime} ${student.prezime}`,
//         rank: student.rank
//       };
//     });
//     console.log(students);
//     res.render('mentor', { id: user.id, students, name: user.name });
//   } catch (error) {
//     console.error('Error fetching students:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

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

app.get('/api/subjects', async (req, res) => {
  const searchQuery = req.query.search || '';
  try{
    const result = await client.query(
      'SELECT id, naziv AS name FROM projekt.predmet WHERE LOWER(naziv) LIKE LOWER($1) LIMIT 10',
      [`%${searchQuery}%`]
    );
    res.json(result.rows);
  } catch {
    console.error('Error fetching subjects:', error);
    res.status(500).send('Internal Server Error');
  }
}
);

app.post('/mentor/save-subjects', async (req, res) => {
  const { mentorId, selectedSubjects } = req.body;

  if (!mentorId || !selectedSubjects) {
    return res.status(400).send('Missing data');
  }

  try {
    // Remove existing preferred subjects for this mentor
    await client.query('DELETE FROM projekt.profesor_predmet WHERE profesor_id = $1', [mentorId]);

    // Insert new preferred subjects
    for (const subjectId of selectedSubjects) {
      await client.query('INSERT INTO projekt.profesor_predmet (profesor_id, predmet_id) VALUES ($1, $2)', [
        mentorId,
        subjectId,
      ]);
    }

    res.status(200).send('Subjects saved successfully!');
  } catch (error) {
    console.error('Error saving subjects:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/selected-subjects/:mentorId', async (req, res) => {
  const { mentorId } = req.params;

  try {
    const result = await client.query('SELECT predmet_id, naziv FROM projekt.get_subjects_by_mentor($1)', [mentorId]);
    const selectedSubjects = result.rows.map(subject => ({
      id: subject.predmet_id, // Ensure this matches your DB schema
      name: subject.naziv, // Ensure this matches your DB schema
    }));
    res.json(selectedSubjects);
  } catch (err) {
    console.error('Error fetching selected subjects:', err);
    res.status(500).json({ error: 'Failed to fetch selected subjects' });
  }
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

app.get('/api/get-kapacitet/:mentorId', async (req, res) => {
  const { mentorId } = req.params;

  try {
    const result = await client.query('SELECT * FROM projekt.get_kapacitet($1)', [mentorId]);
    const kapacitet = result.rows[0].get_kapacitet;
    console.log (kapacitet);
    res.json({ kapacitet });
  } catch (error) {
    console.error('Error fetching kapacitet:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/set-kapacitet', async (req, res) => {
  const { mentorId, kapacitet } = req.body;

  if (!mentorId || !kapacitet) {
    return res.status(400).send('Missing data');
  }

  try {
    await client.query('SELECT * FROM projekt.set_kapacitet($1, $2)', [mentorId, kapacitet]);
    res.status(200).send('Kapacitet saved successfully!');
  } catch (error) {
    console.error('Error saving kapacitet:', error);
    res.status(500).send('Internal Server Error');
  }
});