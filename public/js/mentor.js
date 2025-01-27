

// Load the Sortable library
const list = document.getElementById('student-list');
new Sortable(list, {
    animation: 150,
    onEnd: function (evt) {
        // Update the index of each list item
        Array.from(list.children).forEach((item, index) => {
            item.querySelector('.index').textContent = index + 1;
        });
    }
});




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
  })
  .catch(err => console.error('Error loading selected subjects:', err));


$('#save-subjects').on('click', () => {
    const selectedSubjects = subjectSelect[0].selectize.items;
    fetch('/mentor/save-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId, selectedSubjects })
    }).then(response => {
        if (response.ok) {
            alert('Subjects saved successfully!');
        } else {
            alert('Error saving subjects.');
        }
    }).catch(err => console.error(err));
});

document.getElementById('save-button').addEventListener('click', () => {
    const students = Array.from(list.children).map((item, index) => {
        return {
            id: item.getAttribute('data-student-id'),
            rank: index
        };
    });

    // Extract mentor id from the data attribute
    const mentorId = document.body.getAttribute('data-mentor-id');
    
    fetch('/mentor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students, id: mentorId })
    }).then(response => {
        if (response.ok) {
            alert('Student list saved successfully!');
            //disable button
            document.getElementById('save-button').disabled = true;
        } else {
            alert('Error saving student list.');
        }
    });
});
