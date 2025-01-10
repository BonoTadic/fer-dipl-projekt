const list = document.getElementById('student-list');
new Sortable(list, { animation: 150 });

document.getElementById('save-button').addEventListener('click', () => {
    const students = Array.from(list.children).map(item => item.textContent.trim());

    fetch('/get-mentor-name')
        .then(response => response.json())
        .then(data => {
            const mentorName = data.mentorName;

            fetch('/mentor/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ students, mentorName })
            }).then(response => {
                if (response.ok) {
                    alert('Student list saved successfully!');
                } else {
                    alert('Error saving student list.');
                }
            });
        })
        .catch(err => {
            console.error('Error fetching mentor name:', err);
            alert('Error fetching mentor name.');
        });
});
