<img src="https://github.com/user-attachments/assets/3abd1d37-1535-4417-9988-fbe971b96d1a" alt="Cluf-storage: Self-hosting server for ur files">

<p align="center">
  <a href="https://pypi.org/project/Flask/"><img src="https://img.shields.io/badge/Python-3.9%2B-blue?style=flat-square&logo=python" alt="Supported Python versions for Flask"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Container-blue?style=flat-square&logo=docker" alt="Docker"></a>
  <a href="https://podman.io/"><img src="https://img.shields.io/badge/Podman-Container-blueviolet?style=flat-square&logo=podman" alt="podman"></a>
  <a href="https://flask.palletsprojects.com/en/stable/"><img src="https://img.shields.io/badge/Flask-3.1.0-blue?style=flat-square&logo=flask" alt="Flask"></a>
  <a href="https://github.com/ISduoppoti/cluf-storage-server"><img src="https://img.shields.io/badge/Contributions-Welcome-brightgreen?style=flat-square" alt="Contributions Welcome"></a>
</p>

## About

**Cluf** is a **self-hosting web server** with a purpose of file storage and quick file exchange manipulations.  

### **Features**
- **Quick Exchange Window:**  
  - Made for uploading a file from a PC/phone and download it from your phone/PC without need for third party or wire.
  - To upload file to quick exchange window, press a button right next to **File Manager** header.
  - ⚠️ **Note:** After downloading, the file is automatically deleted.  

- **Main Storage Window:**
  - Main storage to keep your files. Upload file to it with upload button and create a folders in it with create folder button.
  - ⚠️ **Note: Deletion Restriction:** Files cannot be deleted from the main storage via the Cluf web interface. To delete a file, manually remove it from the server's storage directory. Made to avoid "oops" situations.

- **File content preview:**
  - Just click on a file to see its content. Also supports images.
  - If lines in file is too big, press a button to wrap its content.  

- **System Stats:**
  - Island at the bottom with system stats.  


## Instalation

### **1) Clone the repository**  
> Note: use dot (.) in the end if you are running a command inside desired folder (folder should be empty)
```bash
git clone https://github.com/ISduoppoti/cluf-storage-server.git .
```

### **2) Build a container**  
After cloning, build a container with **docke**r or **podman** (open source, root-less alternative)
> Note: I use podman, but you can simply replace `podman` with `docker` in ur command.
```bash
podman build -t cluf-storage-server .
```

### **3) Run a container**  
After container is build, run it ->
> Note: Since podman is root-less, can happen that it will not have access to set up its own network inside container, for that I just put `--network=host` which says to podman to not set up its own network inside, but to use host's. If you use docker, I recommend to remove line `--network=host` from command.
```bash
podman run -d --restart always --network=host -p 6004:6004 -v ~/cluf-webserver/storage:/storage -v ~/cluf-webserver/exchange:/exchange cluf-storage-server
```
### **4) Access it**  
After that ur server is set up on port 6004. To access it in browser, just type `your_ip:port` => `192.168.rest-for-you:6004`  


### **Enjoy :)**

---

### **Server preview**
<img src="https://github.com/user-attachments/assets/21927db2-b558-46a5-adc4-396d01122685" alt="Cluf-storage: Self-hosting server for ur files">
