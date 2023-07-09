document.addEventListener("DOMContentLoaded", () => {
    let dropArea = document.getElementById('drop-area');
    let input = dropArea.querySelector("input[type='file']");

    let toast = document.getElementById("snackbar");

    let toast_error = new Audio("static/audio/error.ogg");
    let toast_success = new Audio("static/audio/success.ogg");

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

    function showToastMessage(text) {
        toast.innerText = text;
        toast.classList.add("show");

        setTimeout(function () { toast.classList.remove(...toast.classList) }, 3000);
    }

    function showToastSuccessMessage(text) {
        showToastMessage(text);
        toast.classList.add("success");
        toast_success.play();
    }

    function showToastErrorMessage(text) {
        showToastMessage(text);
        toast.classList.add("error");
        toast_error.play();
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
            showToastErrorMessage(`Failed to upload your game: ${await response.text()}`);
            input.value = null;
        } else {
            showToastSuccessMessage("Game packing was successful.");
            input.value = null;

            let content = await response.blob();
            let url = URL.createObjectURL(content);

            const anchorTag = document.createElement("a");
            anchorTag.setAttribute("href", url);

            const date = Date.now();
            anchorTag.setAttribute("download", `bundle-${date}.zip`);

            document.body.append(anchorTag);
            anchorTag.click();
            document.body.removeChild(anchorTag);

            URL.revokeObjectURL(url);
        }
    });
});
