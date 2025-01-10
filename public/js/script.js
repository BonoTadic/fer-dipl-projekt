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
    const selectedMentors = Array.from(selectedList.children).map(item => item.textContent);

    const textContent = selectedMentors.join('');
    const blob = new Blob([textContent], { type: 'text/plain' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'selected_mentors.txt';

    link.click();
});
