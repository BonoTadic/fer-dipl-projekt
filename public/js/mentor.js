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
