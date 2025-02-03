// Load the Sortable library
const list = document.getElementById('student-list');
const saveStudentButton = document.getElementById('save-button');

let groupCounter = 1; // Unique ID for new groups

// Initialize Sortable with drag-and-drop functionality
new Sortable(list, {
    animation: 150,
    group: "students",
    onEnd: function () {
        updateRanks();
        saveStudentButton.disabled = !hasListChanged();
    }
});

// Function to update ranks for all students
function updateRanks() {
    let rank = 1;
    let groupMap = new Map();

    Array.from(list.children).forEach((item) => {
        let groupId = item.dataset.groupId;

        if (groupId) {
            // If already assigned to a group, inherit rank from group leader
            if (groupMap.has(groupId)) {
                item.dataset.rank = groupMap.get(groupId);
            } else {
                groupMap.set(groupId, rank);
                item.dataset.rank = rank;
                rank++; // Move to next rank after group
            }
        } else {
            item.dataset.rank = rank;
            rank++;
        }

        item.querySelector('.index').textContent = item.dataset.rank;
    });

    saveStudentButton.disabled = !hasListChanged();
}

// Handle the click on the group button
document.querySelectorAll('.group-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        const studentItem = event.target.closest('.student-item');
        const previousItem = studentItem.previousElementSibling;

        if (previousItem) {
            let groupId = previousItem.dataset.groupId || `group-${groupCounter++}`;

            // Assign group ID to both items
            previousItem.dataset.groupId = groupId;
            studentItem.dataset.groupId = groupId;

            // Ensure same rank for the group
            studentItem.dataset.rank = previousItem.dataset.rank;
            studentItem.querySelector('.index').textContent = previousItem.dataset.rank;
        }

        updateRanks();
        saveStudentButton.disabled = false;
    });
});

// Handle the click on the ungroup button
document.querySelectorAll('.ungroup-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        const studentItem = event.target.closest('.student-item');

        if (studentItem.dataset.groupId) {
            delete studentItem.dataset.groupId;
            updateRanks();
            saveStudentButton.disabled = false;
        }
    });
});

// Store the initial student order
let initialStudentOrder = Array.from(list.children).map(item =>
    item.getAttribute('data-student-id')
);

// Disable save button initially
saveStudentButton.disabled = true;

// Check if the current order differs from the initial order
function hasListChanged() {
    const currentOrder = Array.from(list.children).map(item =>
        item.getAttribute('data-student-id')
    );
    return (
        currentOrder.length !== initialStudentOrder.length ||
        currentOrder.some((id, index) => id !== initialStudentOrder[index])
    );
}

// Save the student list when the button is clicked
saveStudentButton.addEventListener('click', () => {
    const students = Array.from(list.children).map(item => ({
        id: item.getAttribute('data-student-id'),
        rank: item.dataset.rank,
        groupId: item.dataset.groupId || null
    }));

    // Send the updated student list to the server
    fetch('/mentor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students, id: mentorId })
    })
    .then(response => {
        if (response.ok) {
            alert('Student list saved successfully!');
            saveStudentButton.disabled = true;
            initialStudentOrder = students.map(student => student.id);
        } else {
            alert('Error saving student list.');
        }
    })
    .catch(err => console.error(err));
});

// Initialize subject selectize with API for subjects
let initialSubjects = [];
const saveButton = $('#save-subjects');
saveButton.prop('disabled', true);  // Disable initially

const mentorId = document.body.getAttribute('data-mentor-id');
const subjectSelect = $('#subject-select').selectize({
    valueField: 'id',
    labelField: 'name',
    searchField: 'name',
    create: false,
    plugins: ['remove_button'],
    preload: true,
    persist: false,
    hideSelected: true,
    load: function(query, callback) {
        if (!query.length) return callback();
        fetch(`/api/subjects?search=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => callback(data))
            .catch(() => callback());
    },
    onDropdownOpen: function($dropdown) {
        const selectize = this;
        $dropdown.find('.option').each(function() {
            const optionValue = $(this).attr('data-value');
            if (selectize.items.includes(optionValue)) {
                $(this).addClass('selected');
            }
        });
    },
    onDropdownClose: function($dropdown) {
        $dropdown.find('.option').removeClass('selected');
    },
});

// Preload selected subjects on page load
fetch(`/api/selected-subjects/${mentorId}`)
    .then(response => response.json())
    .then(selectedSubjects => {
        const selectize = subjectSelect[0].selectize;
        selectedSubjects.forEach(subject => {
            selectize.addOption(subject);
            selectize.addItem(subject.id);
        });

        initialSubjects = [...selectize.items];  // Store initial subjects for comparison
        saveButton.prop('disabled', true);
    })
    .catch(err => console.error('Error loading selected subjects:', err));

// Track changes in selected subjects
subjectSelect[0].selectize.on('change', () => {
    const currentSubjects = subjectSelect[0].selectize.items;
    const hasChanges = currentSubjects.length !== initialSubjects.length || currentSubjects.some(subject => !initialSubjects.includes(subject));
    saveButton.prop('disabled', !hasChanges);
});

// Handle Save Subjects click event
saveButton.on('click', () => {
    const selectedSubjects = subjectSelect[0].selectize.items;
    fetch('/mentor/save-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId, selectedSubjects })
    })
    .then(response => {
        if (response.ok) {
            alert('Subjects saved successfully!');
            initialSubjects = [...selectedSubjects];  // Update initial subjects
            saveButton.prop('disabled', true);
        } else {
            alert('Error saving subjects.');
        }
    })
    .catch(err => console.error(err));
});

// Handle "kapacitet" input and save
const kapacitetInput = document.getElementById('kapacitet-input');
const saveKapacitetButton = document.getElementById('save-kapacitet');

// Fetch initial "kapacitet" value on page load
fetch(`/api/get-kapacitet/${mentorId}`)
    .then(response => response.json())
    .then(data => {
        kapacitetInput.value = data.kapacitet || 0;
    })
    .catch(err => console.error('Error fetching kapacitet:', err));

// Track changes in "kapacitet"
let initialKapacitet = kapacitetInput.value;
kapacitetInput.addEventListener('input', () => {
    const currentKapacitet = kapacitetInput.value;
    saveKapacitetButton.disabled = currentKapacitet == initialKapacitet;
});

// Handle Save "kapacitet" click
saveKapacitetButton.addEventListener('click', () => {
    const newKapacitet = kapacitetInput.value;
    fetch('/api/set-kapacitet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId, kapacitet: newKapacitet })
    })
    .then(response => {
        if (response.ok) {
            alert('Kapacitet saved successfully!');
            initialKapacitet = newKapacitet;
            saveKapacitetButton.disabled = true;
        } else {
            alert('Error saving kapacitet.');
        }
    })
    .catch(err => console.error('Error saving kapacitet:', err));
});
