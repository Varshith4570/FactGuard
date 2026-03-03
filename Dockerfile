# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Install FFmpeg (required for audio extraction from video files)
RUN apk update && apk add --no-cache ffmpeg

# Set the working directory to /app
WORKDIR /app

# Copy the backend package.json and package-lock.json
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --production

# Copy the rest of the application code
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Create the uploads directory and ensure it has proper permissions
RUN mkdir -p /app/backend/uploads && chmod -R 777 /app/backend/uploads

# Expose port (default is 5000)
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Command to run the application
WORKDIR /app/backend
CMD [ "npm", "start" ]
