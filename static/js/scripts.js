document.addEventListener("DOMContentLoaded", () => {
    const fileContainer = document.getElementById("file-container");
    const exchangeFileContainer = document.getElementById("exchange-file-container");
    const breadcrumbContainer = document.querySelector(".breadcrumb");

    const uploadButton = document.getElementById("upload-button");
    const fileInput = document.getElementById("file-input");

    const fileLabel = document.querySelector(".file-label");

    const storageCtx = document.getElementById('storageChart').getContext('2d');
    const fileTypesCtx = document.getElementById('fileTypesChart').getContext('2d');

    const quickExchangeBtn = document.getElementById('quick-upload-btn')

    const toggleWrapBtn = document.getElementById('toggle-wrap');
    
    let storageChart, fileTypesChart;
    let isWrapped = false;


    const supportsDirectoryUpload = ('webkitdirectory' in HTMLInputElement.prototype) || 
                               ('directory' in HTMLInputElement.prototype);

    // Show appropriate upload method
    if (supportsDirectoryUpload) {
        document.getElementById('folder-upload-button').style.display = 'flex';
    } else {
        document.getElementById('zip-upload-button').style.display = 'flex';
    }

    // Zip upload handler
    document.getElementById("zip-upload-button").addEventListener("click", () => {
        document.getElementById("zip-input").click();
    });

    document.getElementById("zip-input").addEventListener("change", function(e) {
        if (this.files[0]) {
            uploadZip(this.files[0]);
        }
    });

    async function uploadZip(zipFile) {
        const currentPath = document.getElementById("current-path").value;
        const formData = new FormData();
        formData.append("zip", zipFile);
        formData.append("path", currentPath);

        showDownloadIndicator();

        try {
            const response = await fetch("/upload_zip", {
                method: "POST",
                body: formData
            });
            
            if (response.ok) {
                fetchFiles(currentPath, true);
            } else {
                alert("Zip upload failed");
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            hideDownloadIndicator();
        }
    }


    document.getElementById("folder-upload-button").addEventListener("click", () => {
        document.getElementById("folder-input").click();
    });
    
    document.getElementById("folder-input").addEventListener("change", function(e) {
        if (this.files.length > 0) {
            uploadFolder(this.files);
        }
    });
    
    // The existing uploadFolder function remains the same
    function uploadFolder(files) {
        const currentPath = document.getElementById("current-path").value;
        const formData = new FormData();
        formData.append("path", currentPath);
        
        showDownloadIndicator();
    
        // Create a map of directory paths to ensure proper structure
        const directoryStructure = new Set();
    
        // First pass: Create directory structure
        for (let file of files) {
            const relativePath = file.webkitRelativePath || file.name;
            const pathParts = relativePath.split('/').slice(0, -1);
            let currentDir = '';
            
            for (const part of pathParts) {
                currentDir = currentDir ? `${currentDir}/${part}` : part;
                directoryStructure.add(currentDir);
            }

            formData.append("files[]", file, relativePath);
        }
    
        // Second pass: Add files with their paths
        for (let file of files) {
            const relativePath = file.webkitRelativePath || file.name;
            formData.append("files[]", file, relativePath);
        }
    
        // Add directory structure to form data
        formData.append("directories", JSON.stringify(Array.from(directoryStructure)));
    
        fetch("/upload_folder", {
            method: "POST",
            body: formData
        })
        .then(response => {
            hideDownloadIndicator();
            if (response.ok) {
                fetchFiles(currentPath, true);
            } else {
                console.error("Folder upload failed");
            }
        })
        .catch(error => {
            hideDownloadIndicator();
            console.error("Error:", error);
        });
    }


    toggleWrapBtn.addEventListener('click', () => {
      const allLineContent = document.querySelectorAll('.line-content');
      // Determine new state
      const newState = isWrapped ? 'truncated' : 'wrapped';
      
      allLineContent.forEach(lineContent => {
        lineContent.classList.remove('truncated', 'wrapped');
        lineContent.classList.add(newState);
      });
      
      isWrapped = !isWrapped;

        if (isWrapped) {
            toggleWrapBtn.querySelector('use').setAttribute('xlink:href', '#cross');
        } else {
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


    function showDownloadIndicator() {
        const indicator = document.getElementById('loading-indicator');
        indicator.classList.add('active');
    }
    
    function hideDownloadIndicator() {
        const indicator = document.getElementById('loading-indicator');
        indicator.classList.remove('active');
    }


    function UploadFiles(toExange=false) {
        const currentPath = document.getElementById("current-path").value;
        const formData = new FormData();
        const fileInput = document.getElementById( toExange ? "exchange-file-input" : "file-input");

        if (fileInput.files.length === 0) {
            console.error("No file selected");
            return;
        }

        formData.append("file", fileInput.files[0]);
        formData.append( toExange ? "folder" : "path", toExange ? "exchange" : currentPath);

        fetch("/upload", {
            method: "POST",
            body: formData
        })
        .then(response => {
            if (response.ok) {
                console.log("File uploaded successfully");
                fetchFiles(toExange ? "exchange" : currentPath, toExange ? false : true);
            } else {
                console.error("Error uploading file");
            }
        })
        .catch(error => {
            console.error("Error:", error);
        });
    }


    quickExchangeBtn.addEventListener("click", () => {
        document.getElementById("exchange-file-input").click();
    });

    document.getElementById("exchange-file-input").addEventListener("change", () => {
        UploadFiles(true);
    });


    // Add event listener for the upload button
    document.getElementById("file-input").addEventListener("change", () => {
        UploadFiles();
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
                    <a href="#" class="btn-download folder-download" data-path="${file.path}">
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


    document.addEventListener('click', function(e) {
        const downloadBtn = e.target.closest('.folder-download');
        if (downloadBtn) {
            e.preventDefault();
            const folderPath = encodeURIComponent(downloadBtn.dataset.path);
            showDownloadIndicator();
    
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `/download_folder/${folderPath}`, true);
            xhr.responseType = 'blob';
    
            xhr.onload = function() {
                hideDownloadIndicator();
                if (this.status === 200) {
                    const blob = this.response;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${folderPath.split('/').pop()}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            };
    
            xhr.onerror = function() {
                hideDownloadIndicator();
                alert('Error downloading folder');
            };
    
            xhr.send();
        }
    });


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
                const fileContentContainer = document.getElementById("file-content-container");
        
                viewer.style.display = "block";
                document.getElementById("viewer-filename").textContent = filename;
                
                // Clear previous content
                fileContentContainer.innerHTML = '';

                viewer.style.display = "block";
                
                if (data.type === "image") {
                    // Create and append image element
                    const img = document.createElement("img");
                    img.src = data.url;
                    img.alt = filename;
                    img.classList.add("preview-image");
                    fileContentContainer.appendChild(img);
                } else if (data.type === "text") {
                    // Handle text content
                    const lines = data.content.split('\n').slice(0, -1);
                    lines.forEach((lineText, index) => {
                        const lineDiv = document.createElement('div');
                        lineDiv.className = 'line';
                        
                        const numberDiv = document.createElement('div');
                        numberDiv.className = 'line-number';
                        numberDiv.textContent = index + 1;
                        
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'line-content';
                        // escapeHtml() to avoid injection issues:
                        contentDiv.innerHTML = escapeHtml(lineText) || '&nbsp;';
                        
                        lineDiv.appendChild(numberDiv);
                        lineDiv.appendChild(contentDiv);
                        fileContentContainer.appendChild(lineDiv);
                     });                   

                    // Reset wrap state
                    isWrapped = false;
                    toggleWrapBtn.querySelector('use').setAttribute('xlink:href', '#wrap-icon');
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




