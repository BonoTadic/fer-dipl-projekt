const list = document.getElementById('student-list');
new Sortable(list, { animation: 150 });

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
        } else {
            alert('Error saving student list.');
        }
    });
});
