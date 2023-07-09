document.addEventListener("DOMContentLoaded", () =>
{
    let dropArea = document.getElementById('drop-area');
    let input = dropArea.querySelector("input[type='file']");

    let dialog = document.getElementById("dialog");

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false)
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false)
    });

    function highlight(_) {
        dropArea.classList.add('highlight')
    }

    function unhighlight(_) {
        dropArea.classList.remove('highlight')
    }

    input.addEventListener("change", async () => {
        const files = [...input.files];

        if (files.length != 1) {
            return;
        }

        const confirmed = confirm("Upload your game?");

        if (!confirmed) {
            input.value = null;
            return;
        }
        
        const body = new FormData();
        body.append("content", files[0]);

        const response = await fetch("/data", { "method": "POST", body });

        if (response.status != 200) {
            alert(`Failed to upload your game: ${await response.text()}`);
            input.value = null;
        }
    });
});
