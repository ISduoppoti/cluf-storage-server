FROM python:3.13-slim

# Set working directory inside the container
WORKDIR /server

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the server code
COPY server.py .

# Copy server files
COPY ./templates ./templates
COPY ./static ./static

# Create uploads folder
RUN mkdir /storage
RUN mkdir /exchange

# Expose the port for flusk
EXPOSE 6004

# Command to run the server
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:6004", "server:app"]

