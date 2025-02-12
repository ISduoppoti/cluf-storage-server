<img src="https://github.com/user-attachments/assets/3abd1d37-1535-4417-9988-fbe971b96d1a" alt="Cluf-storage: Self-hosting server for ur files">

<p align="center">
  <a href="https://pypi.org/project/Flask/"><img src="https://img.shields.io/badge/Python-3.9%2B-blue?style=flat-square&logo=python" alt="Supported Python versions for Flask"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Container-blue?style=flat-square&logo=docker" alt="Docker"></a>
  <a href="https://podman.io/"><img src="https://img.shields.io/badge/Podman-Container-blueviolet?style=flat-square&logo=podman" alt="podman"></a>
  <a href="https://flask.palletsprojects.com/en/stable/"><img src="https://img.shields.io/badge/Flask-3.1.0-blue?style=flat-square&logo=flask" alt="Flask"></a>
  <a href="https://github.com/ISduoppoti/cluf-storage-server"><img src="https://img.shields.io/badge/Contributions-Welcome-brightgreen?style=flat-square" alt="Contributions Welcome"></a>
</p>

## About

Cluf is a self-hosting webserver with a purpose of file storage and quick file exchange manipulations. /n
Cluf storage has two main file windows. Upper one for quick exchange operations, when you upload file from pc and download it from phone, with no need of third-party or wire. /n
To upload file for quick exchange purpose, press a button right next to `File Manager` header. Important note: After downloading from quick exchange area, file will be deleted.
For a main storage, you can upload files to it with an upload button or create a folder with create folder button. Important note: You cannot delete files from main storage area in cluf server, only by manually deleting it on a device that runs ur server. This made for avoiding "oops" situations.

## Instalation and usage

To install cluf on ur server, first, git clone it to a desired folder:
Note: use dot (.) in the end if you are running a command inside desired folder (folder should be empty)
```bash
git clone https://github.com/ISduoppoti/cluf-storage-server.git .
```

After that, build a container with docker or podman (open source, root-less alternative)
Note: I use podman, but you can simply replace `podman` with `docker` in ur command.
```bash
podman build -t cluf-storage-server .
```

After container is build, run it ->
Note: Since podman is root-less, can happen that it will not have access to set up its own network inside container, for that I just put `--network=host` which says to podman to not set up its own network inside, but to use host's. If you use docker, I recommend to remove line `--network=host` from command.
```bash
podman run -d --restart always --network=host -p 6004:6004 -v ~/cluf-webserver/storage:/storage -v ~/cluf-webserver/exchange:/exchange cluf-storage-server
```

After that ur server is set up on port 6004. To access it in browser, just type `ip:port` = `192.168.rest-for-you:6004`

Enjoy :)
