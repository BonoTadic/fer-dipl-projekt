const maxSelectedMentors = 10;
const selectedList = document.getElementById('selectedList');
const allList = document.getElementById('allList');
const saveBtn = document.getElementById('saveBtn');

new Sortable(allList, {
    group: 'shared',
    animation: 150,
    onEnd(evt) {
        if (selectedList.children.length > maxSelectedMentors) {
            evt.from.insertBefore(evt.item, evt.from.children[evt.oldIndex]);
            alert('You can only select up to ' + maxSelectedMentors + ' mentors.');
        }
        updateSaveBtnState();
    }
});

new Sortable(selectedList, {
    group: 'shared',
    animation: 150,
    onEnd(evt) {
        if (selectedList.children.length > maxSelectedMentors) {
            evt.from.insertBefore(evt.item, evt.from.children[evt.oldIndex]);
            alert('You can only select up to ' + maxSelectedMentors + ' mentors.');
        }
        updateSaveBtnState();
    }
});

function updateSaveBtnState() {
    const selectedItems = selectedList.children;
    saveBtn.disabled = selectedItems.length === 0;
}

saveBtn.addEventListener('click', function() {
    const selectedMentors = Array.from(selectedList.children).map(item => item.textContent.trim());

    fetch('/get-student-name')
        .then(response => response.json())
        .then(data => {
            const studentName = data.studentName;

            if (!studentName) {
                alert('Student name is not available');
                return;
            }

            fetch('/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ selectedMentors, studentName }),
            })
                .then(response => response.text())
                .then(data => {
                    alert(data);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while saving the file.');
                });
        })
        .catch(error => {
            console.error('Error fetching student name:', error);
            alert('An error occurred while retrieving the student name.');
        });
});
