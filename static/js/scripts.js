document.addEventListener("DOMContentLoaded", () => {
    const fileContainer = document.getElementById("file-container");
    const exchangeFileContainer = document.getElementById("exchange-file-container");
    const breadcrumbContainer = document.querySelector(".breadcrumb");

    const uploadButton = document.getElementById("upload-button");
    const fileInput = document.getElementById("file-input");

    const fileLabel = document.querySelector(".file-label");
    const fileNameDisplay = document.getElementById("file-name");

    const storageCtx = document.getElementById('storageChart').getContext('2d');
    const fileTypesCtx = document.getElementById('fileTypesChart').getContext('2d');

    const quickExchangeBtn = document.getElementById('quick-upload-btn')

    const toggleWrapBtn = document.getElementById('toggle-wrap');
    
    let storageChart, fileTypesChart;
    let isWrapped = false;

    toggleWrapBtn.addEventListener('click', () => {
        const contentElement = document.getElementById('file-content');
        const container = document.querySelector('.file-content-container');
        
        isWrapped = !isWrapped;
        
        if (isWrapped) {
            contentElement.classList.remove('truncated');
            contentElement.classList.add('wrapped');
            container.classList.add('wrapped');
            toggleWrapBtn.querySelector('use').setAttribute('xlink:href', '#cross');
        } else {
            contentElement.classList.remove('wrapped');
            contentElement.classList.add('truncated');
            container.classList.remove('wrapped');
            toggleWrapBtn.querySelector('use').setAttribute('xlink:href', '#wrap-icon');
        }
    });


    // Fetch and update system info
    function updateSystemInfo() {
        fetch('/system_stats')
            .then(res => res.json())
            .then(data => {
                document.getElementById('ram-usage').textContent = `${data.ram_percent}%`;
                document.getElementById('cpu-usage').textContent = `${data.cpu_percent}%`;
                document.getElementById('temperature').textContent = `${data.temperature}°C`;
            });
    }


    const predefinedColors = [
        '#A9DC76', '#AB9DF2', '#FFD866', '#FC9867', '#FF6188', 
        '#78DCE8', '#D7CCAE', '#D7AEAE', '#C99ACD', '##9AC9CD'
    ];

    function generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            if (i < predefinedColors.length) {
                colors.push(predefinedColors[i]); // Use predefined colors first
            } else {
                // Generate additional colors based on predefined hues
                const hue = (i * 137) % 360; // Use golden angle for better distribution
                colors.push(`hsl(${hue}, 70%, 50%)`);
            }
        }
        return colors;
    }


    // Fetch storage data
    function updateStorageInfo() {
        fetch('/storage_stats')
            .then(res => res.json())
            .then(data => {
                // Update storage chart
                storageChart.data.datasets[0].data = [data.used, data.free];
                storageChart.update();
                
                // Update file types chart
                fileTypesChart.data.labels = Object.keys(data.file_types);
                fileTypesChart.data.datasets[0].data = Object.values(data.file_types);
                fileTypesChart.data.datasets[0].backgroundColor = generateColors(fileTypesChart.data.labels.length);

                fileTypesChart.update();
            });
    }

    // Initialize charts
    function initCharts() {
        storageChart = new Chart(storageCtx, {
            type: 'doughnut',
            data: {
                labels: ['Used', 'Free'],
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#FFD866', '#444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        fileTypesChart = new Chart(fileTypesCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 0,
                }]
            },
            options: {
                devicePixelRatio: 2,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }


    // Listen for file selection
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            fileNameDisplay.textContent = fileName;

            // Add active class to slide the button
            fileNameDisplay.classList.add("active");
        } else {
            fileNameDisplay.textContent = "No file chosen";

            // Remove active class to reset
            fileNameDisplay.classList.remove("active");
        }
    });


    quickExchangeBtn.addEventListener("click", () => {
        document.getElementById("exchange-file-input").click();
    });

    document.getElementById("exchange-file-input").addEventListener("change", () => {
        const formData = new FormData();
        const fileInput = document.getElementById("exchange-file-input");

        if (fileInput.files.length === 0) {
            console.error("No file selected");
            return;
        }

        formData.append("file", fileInput.files[0]);
        formData.append("folder", "exchange");

        fetch("/upload", {
            method: "POST",
            body: formData
        })
        .then(response => {
            if (response.ok) {
                console.log("File uploaded successfully");
                fetchFiles("exchange", false);
            } else {
                console.error("Error uploading file");
            }
        })
        .catch(error => {
            console.error("Error:", error);
        });
    });



    // Add event listener for the upload button
    uploadButton.addEventListener("click", () => {
        const currentPath = document.getElementById("current-path").value; // Get the current path
        
        const formData = new FormData();
        const fileInput = document.getElementById("file-input");

        if (fileInput.files.length === 0) {
            console.error("No file selected");
            return;
        }

        formData.append("file", fileInput.files[0]);
        formData.append("path", currentPath);  // Set the path as needed

        // Send the form data via a POST request using fetch
        fetch("/upload", {
            method: "POST",
            body: formData
        })
        .then(response => {
            if (response.ok) {
                console.log("File uploaded successfully");
                fileNameDisplay.classList.remove("active");
                fetchFiles(currentPath, true);
            } else {
                console.error("Error uploading file");
            }
        })
        .catch(error => {
            console.error("Error:", error);
        });
    });

    
    // Function to fetch files and folders
    function fetchFiles(path = "", dive = false) {
        fetch(`/files?path=${encodeURIComponent(path)}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    fileContainer.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
                    return;
                }
                renderFiles(data.files, path, dive);
            });
    }

    // Function to render files and folders
    function renderFiles(files, currentPath, dive) {
        
        let quickExchangeSymbol = "";

        if (currentPath === "exchange") {
            exchangeFileContainer.innerHTML = "";
            quickExchangeSymbol = ">> ";
        } else {
            fileContainer.innerHTML = "";
        }
        
        // If inside folder -> render btn back as folder
        if (dive === true && currentPath !== "") {
            renderBtnBack(currentPath);
        };

        files.forEach((file) => {
            const fileDiv = document.createElement("div");
            fileDiv.className = "file-item";

            // Create folder or file item
            if (file.type === "folder") {
                fileDiv.innerHTML = `
                    <span class="folder" data-path="${file.path}">📁 ${file.name}</span>
                    <a href="/download/${file.path}" class="btn-download">
                        <svg class="svg-arr-down" width="15" height="15">
                            <use xlink:href="#arrow-down"></use>
                        </svg>
                    </a>
                `;
                // Initially hide the folder contents
                const folderContentDiv = document.createElement("div");
                folderContentDiv.className = "folder-content";
                folderContentDiv.style.display = "none";
                fileDiv.appendChild(folderContentDiv);

                // Add event listener for folder click
                const folderButton = fileDiv.querySelector(".folder");
                folderButton.addEventListener("click", () => toggleFolder(folderContentDiv, file.path));
            } else {
                fileDiv.innerHTML = `
                    <span class="file">${quickExchangeSymbol}📄 ${file.name}</span>
                    <a href="/download/${file.path}" class="btn-download">
                        <svg class="svg-arr-down" width="15" height="15">
                            <use xlink:href="#arrow-down"></use>
                        </svg>
                    </a>
                `;
            }
            if (currentPath === "exchange") {
                exchangeFileContainer.appendChild(fileDiv);
            } else {
                fileContainer.appendChild(fileDiv);
            }
        });
    }
    
    // Function to render btn back as folder
    function renderBtnBack(currentPath) {
        const fileDiv = document.createElement("div");
        fileDiv.className = "file-item";

        const parentPath = currentPath.split('/').slice(0, -1).join('/');

        fileDiv.innerHTML = `
            <span class="folder" data-path="${parentPath}">📁 ..</span>
        `;
        // Initially hide the folder contents
        const folderContentDiv = document.createElement("div");
        folderContentDiv.className = "folder-content";
        folderContentDiv.style.display = "none";
        fileDiv.appendChild(folderContentDiv);

        // Add event listener for folder click
        const folderButton = fileDiv.querySelector(".folder");
        folderButton.addEventListener("click", () => toggleFolder(folderContentDiv, parentPath));

        fileContainer.appendChild(fileDiv);
    }

    // Function to toggle folder content visibility
    function toggleFolder(folderContentDiv, path) {
        if (folderContentDiv.style.display === "none") {
            fetchFiles(path, true);
            folderContentDiv.style.display = "block";
            updateBreadcrumb(path);
            updatePath(path);
        } else {
            folderContentDiv.style.display = "none";
        }
    }


    // Function to build the breadcrumb based on current path
    function updateBreadcrumb(currentPath) {
        breadcrumbContainer.innerHTML = ''; // Clear existing breadcrumb items

        const pathParts = currentPath.split('/').filter(part => part); // Split path by '/' and remove empty parts

        // Add the "Home" breadcrumb
        breadcrumbContainer.innerHTML = `<li class="breadcrumb-item">&gt; Home</li>`;

        // Iterate through the parts and create breadcrumb items
        pathParts.forEach((part) => {
            const breadcrumbItem = document.createElement("li");
            breadcrumbItem.classList.add("breadcrumb-item");

            // Add each part as static text
            breadcrumbItem.innerHTML = `<span>${part}</span>`;

            // Append the breadcrumb item to the breadcrumb list
            breadcrumbContainer.appendChild(breadcrumbItem);
        });
    }


    // Update current path for upload
    function updatePath(currentPath) {
        const currentPathInput = document.getElementById("current-path");
        currentPathInput.value = currentPath;
    }

    // Add to existing event listeners
    document.addEventListener("click", (e) => {
        if (e.target.closest(".file-item span:not(.folder)")) {
            const fileName = e.target.textContent.replace("📄 ", "").replace(">>", "").trim();
            const filePath = e.target.closest(".file-item").querySelector("a").href
                .split("/download/")[1];
            showFileContent(filePath, fileName);
        }
    });

    document.getElementById("close-viewer").addEventListener("click", () => {
        document.getElementById("file-viewer-container").style.display = "none";
    });

    function showFileContent(path, filename) {
        fetch(`/file_content?path=${encodeURIComponent(path)}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                const viewer = document.getElementById("file-viewer-container");
                const contentElement = document.getElementById("file-content");
                const lineNumbers = document.querySelector(".line-numbers");
                
                viewer.style.display = "block";
                document.getElementById("viewer-filename").textContent = filename;
                
                // Clear previous content
                lineNumbers.innerHTML = '';
                contentElement.innerHTML = '';

                // Reset previous state
                contentElement.removeAttribute('data-type');
                contentElement.className = 'file-content text-white truncated';
                viewer.style.display = "block";
                
                if (data.type === "image") {
                    contentElement.setAttribute('data-type', 'image');
                    // Create and append image element
                    const img = document.createElement("img");
                    img.src = data.url;
                    img.alt = filename;
                    img.classList.add("preview-image");
                    contentElement.appendChild(img);
                    lineNumbers.style.display = "none";
                } else if (data.type === "text") {
                    // Handle text content
                    lineNumbers.style.display = "block";
                    const lines = data.content.split('\n');
                    lineNumbers.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
                    contentElement.innerHTML = lines.map(line => 
                        `<div>${escapeHtml(line) || '&nbsp;'}</div>`).join('');

                    // Reset wrap state
                    isWrapped = false;
                    toggleWrapBtn.querySelector('use').setAttribute('xlink:href', '#wrap-icon');
                    contentElement.classList.add('truncated');
                    document.querySelector('.file-content-container').classList.remove('wrapped');
                }
            });
    }


    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }




    document.getElementById("create-folder-button").addEventListener("click", toggleFolderOverlay);
    document.getElementById("cancel-folder").addEventListener("click", closeFolderOverlay);
    document.getElementById("confirm-folder").addEventListener("click", createFolder);
    document.addEventListener("click", handleOutsideClick);

    let folderOverlayVisible = false;

    function toggleFolderOverlay(e) {
        e.stopPropagation();
        const overlay = document.getElementById("folder-overlay");
        folderOverlayVisible = !folderOverlayVisible;
        overlay.style.display = folderOverlayVisible ? 'block' : 'none';
        
        if (folderOverlayVisible) {
            document.getElementById("folder-name-input").focus();
        }
    }

    function closeFolderOverlay() {
        folderOverlayVisible = false;
        document.getElementById("folder-overlay").style.display = 'none';
    }

    function handleOutsideClick(e) {
        const overlay = document.getElementById("folder-overlay");
        const button = document.getElementById("create-folder-button");
        
        if (folderOverlayVisible && 
            !overlay.contains(e.target) && 
            !button.contains(e.target)) {
            closeFolderOverlay();
        }
    }

    // Modify the existing createFolder function
    function createFolder() {
        const folderName = document.getElementById("folder-name-input").value.trim();
        const currentPath = document.getElementById("current-path").value;
        
        if (!folderName) {
            alert("Please enter a folder name");
            return;
        }

        fetch("/create_folder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                path: currentPath,
                name: folderName
            })
        })
        .then(response => {
            if (response.ok) {
                closeFolderOverlay();
                fetchFiles(currentPath, true);
            } else {
                response.json().then(data => alert(data.error || "Error creating folder"));
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error creating folder");
        });
    }

    // Initial load
    fetchFiles();
    fetchFiles("exchange");
    updateBreadcrumb("");

    initCharts();
    setInterval(() => {
        updateStorageInfo();
        updateSystemInfo();
    }, 5000);
    updateStorageInfo();
    updateSystemInfo();
});




