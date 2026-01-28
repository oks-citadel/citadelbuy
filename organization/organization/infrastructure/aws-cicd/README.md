# AWS CodePipeline CI/CD Configuration

This directory contains the AWS CI/CD infrastructure configuration for the Broxiva E-Commerce Platform.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────┐
│   GitHub    │────▶│ CodePipeline │────▶│  CodeBuild   │────▶│   ECR   │
│  (Source)   │     │ (Orchestrate)│     │   (Build)    │     │ (Store) │
└─────────────┘     └──────────────┘     └──────────────┘     └─────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │  ECS/EKS    │
                                         │  (Deploy)   │
                                         └──────────────┘
```

## Files in This Directory

| File | Description |
|------|-------------|
| `buildspec.yml` | CodeBuild specification for Node.js services (API and Web) |
| `buildspec-microservices.yml` | CodeBuild specification for Python microservices |
| `pipeline.tf` | Terraform configuration for all CI/CD infrastructure |
| `pipeline-cloudformation.yaml` | CloudFormation template (alternative to Terraform) |

## Services Built

### Node.js Services (buildspec.yml)
- `api` - NestJS Backend API
- `web` - Next.js Frontend Application

### Python Microservices (buildspec-microservices.yml)
- `ai-agents` - AI Agents Service
- `ai-engine` - AI Engine Service
- `analytics` - Analytics Service
- `chatbot` - Chatbot Service
- `fraud-detection` - Fraud Detection Service
- `inventory` - Inventory Service
- `media` - Media Processing Service
- `notification` - Notification Service
- `personalization` - Personalization Service
- `pricing` - Pricing Service
- `recommendation` - Recommendation Service
- `search` - Search Service
- `supplier-integration` - Supplier Integration Service

## Deployment Options

### Option 1: Terraform (Recommended)

```bash
# Navigate to this directory
cd organization/infrastructure/aws-cicd

# Initialize Terraform
terraform init

# Review the plan
terraform plan -var="github_owner=your-org" -var="github_repo=your-repo"

# Apply the configuration
terraform apply -var="github_owner=your-org" -var="github_repo=your-repo"
```

#### Terraform Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `aws_region` | `us-east-1` | AWS region for resources |
| `project_name` | `broxiva` | Project name for resource naming |
| `environment` | `prod` | Environment (dev, staging, prod) |
| `github_owner` | `broxiva` | GitHub repository owner |
| `github_repo` | `broxiva` | GitHub repository name |
| `github_branch` | `main` | Branch to monitor |
| `notification_email` | `""` | Email for notifications |
| `enable_microservices_pipeline` | `true` | Enable microservices build |

### Option 2: CloudFormation

```bash
# Deploy the stack
aws cloudformation create-stack \
  --stack-name broxiva-cicd \
  --template-body file://pipeline-cloudformation.yaml \
  --parameters \
    ParameterKey=GitHubOwner,ParameterValue=your-org \
    ParameterKey=GitHubRepo,ParameterValue=your-repo \
    ParameterKey=Environment,ParameterValue=prod \
  --capabilities CAPABILITY_NAMED_IAM

# Update existing stack
aws cloudformation update-stack \
  --stack-name broxiva-cicd \
  --template-body file://pipeline-cloudformation.yaml \
  --parameters \
    ParameterKey=GitHubOwner,ParameterValue=your-org \
    ParameterKey=GitHubRepo,ParameterValue=your-repo \
  --capabilities CAPABILITY_NAMED_IAM
```

## Post-Deployment Steps

### 1. Confirm GitHub Connection

After deployment, the GitHub connection will be in "PENDING" status. To activate:

1. Go to AWS Console > Developer Tools > Connections
2. Find the connection named `broxiva-github-connection`
3. Click "Update pending connection"
4. Authorize AWS to access your GitHub repository

### 2. Configure Parameter Store Secrets

Create the following parameters in AWS Systems Manager Parameter Store:

```bash
# Docker Hub credentials (if pushing to Docker Hub)
aws ssm put-parameter \
  --name "/broxiva/docker/username" \
  --value "your-docker-username" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/broxiva/docker/password" \
  --value "your-docker-password" \
  --type "SecureString"
```

### 3. Confirm SNS Subscription

If you provided a notification email, check your inbox and confirm the SNS subscription.

### 4. Trigger First Build

Push a commit to the configured branch (default: `main`) to trigger the pipeline.

## Pipeline Stages

### Stage 1: Source
- Fetches code from GitHub using CodeStar Connections
- Triggered automatically on push to the configured branch

### Stage 2: Build Node.js
- Installs pnpm dependencies
- Runs ESLint
- Runs TypeScript type checking
- Runs tests
- Builds Docker images for API and Web
- Pushes images to ECR

### Stage 3: Build Microservices
- Runs security scans on Python dependencies
- Runs flake8 linting
- Runs mypy type checking
- Runs bandit security analysis
- Runs pytest tests
- Builds Docker images for all 13 microservices
- Pushes images to ECR

### Stage 4: Manual Approval (Production only)
- Requires manual approval before deployment
- Only applies when `environment = prod`

## ECR Repositories

After deployment, the following ECR repositories are created:

```
broxiva/api
broxiva/web
broxiva/ai-agents
broxiva/ai-engine
broxiva/analytics
broxiva/chatbot
broxiva/fraud-detection
broxiva/inventory
broxiva/media
broxiva/notification
broxiva/personalization
broxiva/pricing
broxiva/recommendation
broxiva/search
broxiva/supplier-integration
```

## Image Tagging Strategy

Images are tagged using the format: `YYYYMMDD-<commit-hash>`

Example: `20241231-abc123def`

Additionally, each successful build updates the `latest` tag.

## Monitoring

### CloudWatch Logs
- Node.js builds: `/aws/codebuild/broxiva-nodejs`
- Microservices builds: `/aws/codebuild/broxiva-microservices`

### SNS Notifications
Pipeline state changes (FAILED, SUCCEEDED, CANCELED) are sent to the configured SNS topic.

### Build Reports
- Jest test reports (JUnit XML format)
- pytest test reports (JUnit XML format)
- Code coverage reports (Clover XML format)

## Cost Considerations

### Estimated Monthly Costs (varies by usage)
- CodePipeline: $1/active pipeline/month
- CodeBuild: $0.005/build minute (on-demand)
- ECR: $0.10/GB/month storage + data transfer
- S3 (artifacts): Standard S3 pricing
- CloudWatch Logs: $0.50/GB ingested

### Cost Optimization Tips
1. Use smaller compute types for simple builds
2. Enable caching to reduce build times
3. Set lifecycle policies on ECR to clean old images
4. Set S3 lifecycle rules to expire old artifacts

## Troubleshooting

### Common Issues

**1. GitHub Connection Pending**
- The connection must be confirmed in AWS Console after deployment
- Navigate to Developer Tools > Connections and click "Update pending connection"

**2. Build Fails with ECR Permission Error**
- Ensure the CodeBuild role has `ecr:GetAuthorizationToken` permission
- Check that privileged mode is enabled for Docker builds

**3. Tests Fail**
- Check CloudWatch logs for detailed test output
- Ensure all required environment variables are set

**4. Image Push Fails**
- Verify ECR repository exists
- Check IAM permissions for ECR push operations
- Ensure AWS region is correctly configured

### Getting Build Logs

```bash
# Get recent build logs
aws logs get-log-events \
  --log-group-name /aws/codebuild/broxiva-nodejs \
  --log-stream-name build-log \
  --limit 100
```

## Security Considerations

1. **IAM Least Privilege**: Roles are configured with minimum required permissions
2. **Encrypted Artifacts**: S3 bucket uses server-side encryption
3. **ECR Scanning**: Images are scanned on push for vulnerabilities
4. **Parameter Store**: Sensitive values stored as SecureString
5. **No Public Access**: S3 bucket blocks all public access
6. **Privileged Mode**: Only enabled for Docker build containers

## Extending the Pipeline

### Adding a Deploy Stage

To deploy to ECS, add a deploy stage after the build stages:

```hcl
stage {
  name = "Deploy"

  action {
    name            = "Deploy_to_ECS"
    category        = "Deploy"
    owner           = "AWS"
    provider        = "ECS"
    input_artifacts = ["nodejs_build_output"]
    version         = "1"

    configuration = {
      ClusterName = "your-ecs-cluster"
      ServiceName = "your-ecs-service"
      FileName    = "imagedefinitions.json"
    }
  }
}
```

### Adding Code Quality Gates

Add a SonarQube or similar code quality stage before the build:

```yaml
# In buildspec.yml
phases:
  build:
    commands:
      - sonar-scanner -Dsonar.projectKey=broxiva
```

## Support

For issues with this CI/CD configuration:
1. Check CloudWatch logs for build errors
2. Review IAM permissions
3. Ensure GitHub connection is active
4. Verify ECR repositories exist
