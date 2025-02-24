import os

import zipfile
from io import BytesIO
import json

import psutil
from flask import (
    Flask,
    after_this_request,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
    send_file
)
from werkzeug.utils import secure_filename

# Initialize Flask app
app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = "supersecretkey"  # Replace with a secure key in production

# Storage configuration
STORAGE_FOLDER = "storage"  # For local run (without docker) remove "/"
EXCHANGE_FOLDER = "exchange"  # Same here...
USERNAME = "admin"  # changed of course... and better to use sha256
PASSWORD = (
    "password"  # this project now is not for production, for personal self hosting
)

# Ensure storage folder exists
os.makedirs(STORAGE_FOLDER, exist_ok=True)
os.makedirs(EXCHANGE_FOLDER, exist_ok=True)


# Routes
@app.route("/")
def index():
    if "logged_in" in session:
        return render_template("index.html")
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        if username == USERNAME and password == PASSWORD:
            session["logged_in"] = True
            return redirect(url_for("index"))
        return render_template("login.html", error="Invalid credentials")
    return render_template("login.html", error=None)


@app.route("/logout")
def logout():
    session.pop("logged_in", None)
    return redirect(url_for("login"))


@app.route("/files")
def files():
    """Fetch files and folders from the specified directory."""
    path = request.args.get("path", "")
    if path == "exchange":
        target_folder = EXCHANGE_FOLDER
    else:
        full_path = os.path.join(STORAGE_FOLDER, path)

        if not os.path.exists(full_path):
            return jsonify({"error": "Path does not exist", "files": []})

        target_folder = full_path

    files = []
    for entry in sorted(os.listdir(target_folder)):
        entry_path = os.path.join(target_folder, entry)
        files.append(
            {
                "name": entry,
                "type": "folder" if os.path.isdir(entry_path) else "file",
                "path": os.path.join(path, entry).replace("\\", "/"),
            }
        )
    return jsonify({"files": files})


@app.route("/upload", methods=["POST"])
def upload_file():
    if "logged_in" not in session:
        return redirect(url_for("login"))
    if "file" not in request.files:
        return redirect(url_for("index"))
    file = request.files["file"]
    if file.filename == "":
        return redirect(url_for("index"))
    path = request.form.get("path", "")
    target_folder = STORAGE_FOLDER
    if request.form.get("folder", "") == "exchange":
        target_folder = EXCHANGE_FOLDER
    filename = secure_filename(file.filename)
    file.save(os.path.join(target_folder, path, filename))
    return redirect(url_for("index"))



@app.route("/upload_zip", methods=["POST"])
def upload_zip():
    if "logged_in" not in session:
        return redirect(url_for("login"))

    path = request.form.get("path", "")
    target_folder = os.path.join(STORAGE_FOLDER, path)
    
    if "zip" not in request.files:
        return jsonify({"error": "No ZIP file selected"}), 400

    zip_file = request.files["zip"]
    if zip_file.filename == "":
        return jsonify({"error": "Invalid ZIP file"}), 400

    try:
        with zipfile.ZipFile(zip_file.stream, 'r') as zip_ref:
            for file_info in zip_ref.infolist():
                # Prevent zip slip vulnerability
                final_path = os.path.join(target_folder, file_info.filename)
                if not final_path.startswith(os.path.realpath(target_folder)):
                    return jsonify({"error": "Invalid zip file"}), 400
                
                if file_info.is_dir():
                    os.makedirs(final_path, exist_ok=True)
                else:
                    os.makedirs(os.path.dirname(final_path), exist_ok=True)
                    with open(final_path, 'wb') as f:
                        f.write(zip_ref.read(file_info))
        
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route("/upload_folder", methods=["POST"])
def upload_folder():
    if "logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        current_path = request.form.get("path", "")
        target_folder = os.path.join(STORAGE_FOLDER, current_path)
        
        # Validate path security
        if not os.path.realpath(target_folder).startswith(os.path.realpath(STORAGE_FOLDER)):
            return jsonify({"error": "Invalid path"}), 400

        # Process directories
        directories = json.loads(request.form.get("directories", "[]"))
        for directory in directories:
            # Sanitize each directory component
            dir_parts = directory.split('/')
            safe_dir = os.path.join(*[secure_filename(part) for part in dir_parts])
            dir_path = os.path.join(target_folder, safe_dir)
            os.makedirs(dir_path, exist_ok=True)

        # Process files
        uploaded_files = request.files.getlist("files[]")
        for file in uploaded_files:
            if file.filename == "":
                continue

            # Split and sanitize path components
            path_parts = file.filename.split('/')
            safe_parts = [secure_filename(p) for p in path_parts]
            relative_path = os.path.join(*safe_parts)
            full_path = os.path.join(target_folder, relative_path)

            # Validate final path
            if not os.path.realpath(full_path).startswith(os.path.realpath(target_folder)):
                return jsonify({"error": "Invalid file path"}), 400

            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            file.save(full_path)

        return jsonify({"success": True}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/create_folder", methods=["POST"])
def create_folder():
    if "logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    path = data.get("path", "")
    folder_name = secure_filename(data.get("name", ""))

    if not folder_name:
        return jsonify({"error": "Invalid folder name"}), 400

    full_path = os.path.join(STORAGE_FOLDER, path, folder_name)

    try:
        os.makedirs(full_path, exist_ok=False)
        return jsonify({"success": True})
    except FileExistsError:
        return jsonify({"error": "Folder already exists"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Add new route for direct file access
@app.route("/file/<path:filename>")
def view_file(filename):
    if "logged_in" not in session:
        return redirect(url_for("login"))
    full_path = os.path.join(STORAGE_FOLDER, filename)
    if not os.path.exists(full_path) or os.path.isdir(full_path):
        return "File not found", 404
    return send_from_directory(STORAGE_FOLDER, filename)


@app.route("/file_content")
def get_file_content():
    if "logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    file_path = request.args.get("path", "")

    target_folder = STORAGE_FOLDER
    if file_path[:8] == "exchange":
        target_folder = ""  # Cause exchange/ already included in "path"

    full_path = os.path.join(target_folder, file_path)

    if not os.path.exists(full_path) or os.path.isdir(full_path):
        return jsonify({"error": "File not found"}), 404

    # Check for image files
    image_extensions = {"png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"}
    file_ext = file_path.split(".")[-1].lower() if "." in file_path else ""

    if file_ext in image_extensions:
        return jsonify({"type": "image", "url": f"/file/{file_path}"})

    # Handle text files
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        return jsonify({"type": "text", "content": content})
    except UnicodeDecodeError:
        return jsonify({"error": "Binary file cannot be displayed"}), 400


@app.route("/download/<path:filename>")
def download_file(filename):
    if "logged_in" not in session:
        return redirect(url_for("login"))

    toDelete = False
    target_folder = STORAGE_FOLDER
    if filename[:8] == "exchange":
        filename = filename[9:]
        target_folder = EXCHANGE_FOLDER
        toDelete = True

    full_path = os.path.join(target_folder, filename)

    if not os.path.exists(full_path):
        return "File not found", 404

    if os.path.isdir(full_path):
        return "Cannot download a folder", 400

    response = send_from_directory(target_folder, filename, as_attachment=True)

    if toDelete:

        @after_this_request
        def remove_file(response):
            try:
                os.remove(full_path)
            except Exception as e:
                print(f"Error deleting file: {e}")
            return response

    return response


@app.route("/download_folder/<path:folder_path>")
def download_folder(folder_path):
    if "logged_in" not in session:
        return redirect(url_for("login"))

    # Might be not needed --------------------------------------------------
    if folder_path.startswith("exchange/"):
        target_folder = EXCHANGE_FOLDER
        adjusted_path = folder_path[len("exchange/") :]
    else:
        target_folder = STORAGE_FOLDER
        adjusted_path = folder_path

    full_path = os.path.realpath(os.path.join(target_folder, adjusted_path))
    allowed_path = os.path.realpath(target_folder)

    if not full_path.startswith(allowed_path):
        return "Invalid path", 400

    if not os.path.isdir(full_path):
        return "Folder not found", 404

    # Create in-memory zip
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(full_path):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, full_path)
                zipf.write(file_path, arcname)

    buffer.seek(0)
    return send_file(
        buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"{os.path.basename(full_path)}.zip"
    )


@app.route("/storage_stats")
def storage_stats():
    if "logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    # Disk usage
    total, used, free, _ = psutil.disk_usage(STORAGE_FOLDER)

    # File type analysis
    file_types = {}
    for root, dirs, files in os.walk(STORAGE_FOLDER):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            file_types[ext] = file_types.get(ext, 0) + 1

    return jsonify(
        {"total": total, "used": used, "free": free, "file_types": file_types}
    )


@app.route("/system_stats")
def system_stats():
    if "logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    # RAM
    ram = psutil.virtual_memory()

    # CPU
    cpu = psutil.cpu_percent()

    # Temperature (Linux only)
    try:
        temp = psutil.sensors_temperatures()["coretemp"][0].current
    except:
        temp = "N/A"

    return jsonify(
        {"ram_percent": ram.percent, "cpu_percent": cpu, "temperature": temp}
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6004, debug=True)
