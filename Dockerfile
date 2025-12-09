# Stage 1: Build Stage
# Use an official Node.js runtime as a parent image
FROM node:18-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install app dependencies using npm ci for deterministic installs
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Stage 2: Production Stage
# Use a smaller, more secure base image for the final container
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy dependencies and source code from the builder stage
COPY --from=builder /app ./

# Set the environment to production
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 8001

# Define the command to run the application
CMD [ "node", "index.js" ]
