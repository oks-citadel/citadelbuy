# ================================
# Backend Dockerfile - Go Application
# Multi-stage build for optimal image size
# ================================

# ================================
# Stage 1: Development
# ================================
FROM golang:1.21-alpine AS development

# Install development dependencies
RUN apk add --no-cache git make bash curl

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Install air for hot reload
RUN go install github.com/cosmtrek/air@latest

# Expose port
EXPOSE 8080

# Run with hot reload
CMD ["air", "-c", ".air.toml"]

# ================================
# Stage 2: Builder
# ================================
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build arguments
ARG VERSION=1.0.0
ARG BUILD_TIME
ARG GIT_COMMIT

# Build the application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}" \
    -a -installsuffix cgo \
    -o /go/bin/api \
    ./cmd/api

# ================================
# Stage 3: Test
# ================================
FROM builder AS test

# Install test dependencies
RUN apk add --no-cache git make

# Copy test files
COPY . .

# Run tests
RUN go test -v -coverprofile=coverage.out -covermode=atomic ./...

# Generate coverage report
RUN go tool cover -html=coverage.out -o coverage.html

# Run linting
RUN go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest && \
    golangci-lint run --timeout=5m

# ================================
# Stage 4: Production
# ================================
FROM alpine:latest AS production

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata wget

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /go/bin/api /app/api

# Copy necessary files
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["/app/api"]

# ================================
# Stage 5: Production Minimal (Optional)
# ================================
FROM scratch AS production-minimal

# Copy binary and certificates
COPY --from=builder /go/bin/api /api
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["/api"]
