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
        updateIndexes();
    }
});

new Sortable(selectedList, {
    group: 'shared',
    animation: 150,
    onAdd(evt) {
        updateIndexes();
    },
    onEnd(evt) {
        if (selectedList.children.length > maxSelectedMentors) {
            evt.from.insertBefore(evt.item, evt.from.children[evt.oldIndex]);
            alert('You can only select up to ' + maxSelectedMentors + ' mentors.');
        }
        updateSaveBtnState();
        updateIndexes();
    }
});

function updateSaveBtnState() {
    const selectedItems = selectedList.children;
    saveBtn.disabled = selectedItems.length === 0;
}

function updateIndexes() {
    Array.from(selectedList.children).forEach((item, index) => {
        item.querySelector('.index').textContent = index + 1;
    });
    Array.from(allList.children).forEach((item, index) => {
        item.querySelector('.index').textContent = '';
    });
}

saveBtn.addEventListener('click', function() {
    const selectedMentors = Array.from(selectedList.children).map((item, index) => {
        return {
            id: item.getAttribute('data-mentor-id'),
            rank: index
        };
    });

    const studentId = document.body.getAttribute('data-student-id');

    fetch('/student/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ selectedMentors, id: studentId })
    }).then(response => {
        if (response.ok) {
            alert('Selected mentors saved successfully!');
            // Disable button
            saveBtn.disabled = true;
        } else {
            alert('Error saving selected mentors.');
        }
    });
});