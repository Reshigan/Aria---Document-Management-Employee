FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application
COPY . .

# Build for production if needed (commented out for dev mode)
# RUN npm run build

EXPOSE 12000

# For development with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "12000"]
