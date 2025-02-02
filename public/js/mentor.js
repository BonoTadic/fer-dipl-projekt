// Load the Sortable library
const list = document.getElementById('student-list');
const saveStudentButton = document.getElementById('save-button');

new Sortable(list, {
    animation: 150,
    onEnd: function (evt) {
        // Update the index of each list item
        Array.from(list.children).forEach((item, index) => {
            item.querySelector('.index').textContent = index + 1;
        });
        saveStudentButton.disabled = !hasListChanged();
    }
});


let initialSubjects = []; // Store initial subjects
const saveButton = $('#save-subjects'); // Cache save button
saveButton.prop('disabled', true); // Disable save button initially

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

        // Add and pre-select already chosen subjects
        selectedSubjects.forEach(subject => {
            selectize.addOption(subject); // Add to dropdown
            selectize.addItem(subject.id); // Pre-select
        });

        // Store initial subjects for comparison
        initialSubjects = [...selectize.items];

        // disable save button initially
        saveButton.prop('disabled', true);
    })
    .catch(err => console.error('Error loading selected subjects:', err));

// Track changes in the selected subjects
subjectSelect[0].selectize.on('change', () => {
    const currentSubjects = subjectSelect[0].selectize.items;

    // Compare current subjects with initial ones
    const hasChanges =
        currentSubjects.length !== initialSubjects.length ||
        currentSubjects.some(subject => !initialSubjects.includes(subject));

    // Enable or disable the save button based on changes
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
                // Update initial subjects after saving
                initialSubjects = [...selectedSubjects];
                saveButton.prop('disabled', true); // Disable save button again
            } else {
                alert('Error saving subjects.');
            }
        })
        .catch(err => console.error(err));
});

// Store the initial order of student IDs
let initialStudentOrder = Array.from(list.children).map(item =>
    item.getAttribute('data-student-id')
);

// Disable the save button initially
saveStudentButton.disabled = true;

// Function to check if the current order differs from the initial order
function hasListChanged() {
    const currentOrder = Array.from(list.children).map(item =>
        item.getAttribute('data-student-id')
    );
    return (
        currentOrder.length !== initialStudentOrder.length ||
        currentOrder.some((id, index) => id !== initialStudentOrder[index])
    );
}

saveStudentButton.addEventListener('click', () => {
    const students = Array.from(list.children).map((item, index) => {
        return {
            id: item.getAttribute('data-student-id'),
            rank: index
        };
    });

    // Send updated data to the server
    fetch('/mentor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students, id: mentorId })
    })
    .then(response => {
        if (response.ok) {
            alert('Student list saved successfully!');

            // Update the initial order after saving
            initialStudentOrder = Array.from(list.children).map(item =>
                item.getAttribute('data-student-id')
            );

            // Disable the save button again
            saveStudentButton.disabled = true;
        } else {
            alert('Error saving student list.');
        }
    })
    .catch(err => console.error(err));
});


const kapacitetInput = document.getElementById('kapacitet-input');
const saveKapacitetButton = document.getElementById('save-kapacitet');

// Fetch initial "kapacitet" value on page load
fetch(`/api/get-kapacitet/${mentorId}`)
    .then(response => response.json())
    .then(data => {
        kapacitetInput.value = data.kapacitet || 0; // Set initial value
    })
    .catch(err => console.error('Error fetching kapacitet:', err));

// Track changes in the "kapacitet" input
let initialKapacitet = kapacitetInput.value;
kapacitetInput.addEventListener('input', () => {
    const currentKapacitet = kapacitetInput.value;
    saveKapacitetButton.disabled = currentKapacitet == initialKapacitet;
});

// Handle "Save Capacity" button click
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
                initialKapacitet = newKapacitet; // Update initial value
                saveKapacitetButton.disabled = true; // Disable button
            } else {
                alert('Error saving kapacitet.');
            }
        })
        .catch(err => console.error('Error saving kapacitet:', err));
});
