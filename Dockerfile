# Frontend Dockerfile for Next.js Application
# Image name: cellular_mobile_frontend
# 
# Build locally first: npm run build
# Then build Docker image: docker build -t cellular_mobile_frontend .

FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --only=production --legacy-peer-deps

# Copy the pre-built standalone application
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

EXPOSE 3000

# Start the application using standalone server
CMD ["node", "server.js"]
