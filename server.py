import os

import psutil
from flask import (
    Flask,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)
from werkzeug.utils import secure_filename

# Initialize Flask app
app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = "supersecretkey"  # Replace with a secure key in production

# Storage configuration
STORAGE_FOLDER = "/storage"
USERNAME = "admin"  # changed of course... and better to use sha256
PASSWORD = (
    "password"  # this project now is not for production, for personal self hosting
)

# Ensure storage folder exists
os.makedirs(STORAGE_FOLDER, exist_ok=True)


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
    full_path = os.path.join(STORAGE_FOLDER, path)

    if not os.path.exists(full_path):
        return jsonify({"error": "Path does not exist", "files": []})

    files = []
    for entry in sorted(os.listdir(full_path)):
        entry_path = os.path.join(full_path, entry)
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
    filename = secure_filename(file.filename)
    file.save(os.path.join(STORAGE_FOLDER, path, filename))
    return redirect(url_for("index"))


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
    full_path = os.path.join(STORAGE_FOLDER, file_path)

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

    full_path = os.path.join(STORAGE_FOLDER, filename)

    if not os.path.exists(full_path):
        return "File not found", 404

    if os.path.isdir(full_path):
        return "Cannot download a folder", 400

    return send_from_directory(STORAGE_FOLDER, filename, as_attachment=True)


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
