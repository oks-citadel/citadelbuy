# Networking Module - AWS VPC, Subnets, Security Groups
# CitadelBuy E-commerce Platform - AWS Infrastructure

# ============================================
# VPC
# ============================================
resource "aws_vpc" "main" {
  count                = var.cloud_provider == "aws" ? 1 : 0
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-vpc"
    }
  )
}

# ============================================
# Internet Gateway
# ============================================
resource "aws_internet_gateway" "main" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  vpc_id = aws_vpc.main[0].id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-igw"
    }
  )
}

# ============================================
# Data Source for Availability Zones
# ============================================
data "aws_availability_zones" "available" {
  count = var.cloud_provider == "aws" ? 1 : 0
  state = "available"
}

locals {
  aws_azs = var.cloud_provider == "aws" ? slice(data.aws_availability_zones.available[0].names, 0, min(length(var.availability_zones), 3)) : []
}

# ============================================
# Public Subnets
# ============================================
resource "aws_subnet" "public" {
  count                   = var.cloud_provider == "aws" ? length(local.aws_azs) : 0
  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = local.aws_azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name                                                = "${var.project_name}-${var.environment}-public-${count.index + 1}"
      "kubernetes.io/role/elb"                            = "1"
      "kubernetes.io/cluster/${var.project_name}-${var.environment}-eks" = "shared"
    }
  )
}

# ============================================
# Private Subnets (Application)
# ============================================
resource "aws_subnet" "private" {
  count             = var.cloud_provider == "aws" ? length(local.aws_azs) : 0
  vpc_id            = aws_vpc.main[0].id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = local.aws_azs[count.index]

  tags = merge(
    var.tags,
    {
      Name                                                = "${var.project_name}-${var.environment}-private-${count.index + 1}"
      "kubernetes.io/role/internal-elb"                   = "1"
      "kubernetes.io/cluster/${var.project_name}-${var.environment}-eks" = "shared"
    }
  )
}

# ============================================
# Database Subnets
# ============================================
resource "aws_subnet" "database" {
  count             = var.cloud_provider == "aws" ? length(local.aws_azs) : 0
  vpc_id            = aws_vpc.main[0].id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = local.aws_azs[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-database-${count.index + 1}"
      Type = "Database"
    }
  )
}

# ============================================
# Elastic IPs for NAT Gateways
# ============================================
resource "aws_eip" "nat" {
  count  = var.cloud_provider == "aws" && var.enable_nat_gateway ? length(local.aws_azs) : 0
  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# ============================================
# NAT Gateways
# ============================================
resource "aws_nat_gateway" "main" {
  count         = var.cloud_provider == "aws" && var.enable_nat_gateway ? length(local.aws_azs) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-nat-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# ============================================
# Route Table - Public
# ============================================
resource "aws_route_table" "public" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-public-rt"
    }
  )
}

resource "aws_route_table_association" "public" {
  count          = var.cloud_provider == "aws" ? length(local.aws_azs) : 0
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

# ============================================
# Route Tables - Private (one per AZ for high availability)
# ============================================
resource "aws_route_table" "private" {
  count  = var.cloud_provider == "aws" ? length(local.aws_azs) : 0
  vpc_id = aws_vpc.main[0].id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[count.index].id
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
    }
  )
}

resource "aws_route_table_association" "private" {
  count          = var.cloud_provider == "aws" ? length(local.aws_azs) : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ============================================
# Route Table - Database
# ============================================
resource "aws_route_table" "database" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  vpc_id = aws_vpc.main[0].id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-database-rt"
    }
  )
}

resource "aws_route_table_association" "database" {
  count          = var.cloud_provider == "aws" ? length(local.aws_azs) : 0
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database[0].id
}

# ============================================
# VPC Endpoints for AWS Services
# ============================================
resource "aws_vpc_endpoint" "s3" {
  count        = var.cloud_provider == "aws" ? 1 : 0
  vpc_id       = aws_vpc.main[0].id
  service_name = "com.amazonaws.${var.region}.s3"

  route_table_ids = concat(
    [aws_route_table.public[0].id],
    aws_route_table.private[*].id,
    [aws_route_table.database[0].id]
  )

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-s3-endpoint"
    }
  )
}

resource "aws_vpc_endpoint" "ecr_api" {
  count               = var.cloud_provider == "aws" ? 1 : 0
  vpc_id              = aws_vpc.main[0].id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-ecr-api-endpoint"
    }
  )
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  count               = var.cloud_provider == "aws" ? 1 : 0
  vpc_id              = aws_vpc.main[0].id
  service_name        = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-ecr-dkr-endpoint"
    }
  )
}

# ============================================
# Security Group for VPC Endpoints
# ============================================
resource "aws_security_group" "vpc_endpoints" {
  count       = var.cloud_provider == "aws" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-vpc-endpoints-sg"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main[0].id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "HTTPS from VPC"
  }

  # SECURITY: VPC endpoints typically don't need egress, but allowing for
  # flexibility. Consider restricting to VPC CIDR only.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
    description = "Allow outbound to VPC only"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-vpc-endpoints-sg"
    }
  )
}

# ============================================
# Security Group - Application Load Balancer
# ============================================
resource "aws_security_group" "alb" {
  count       = var.cloud_provider == "aws" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main[0].id

  # SECURITY: ALB ingress rules for public-facing load balancer
  # These rules allow HTTP/HTTPS from the internet by design.
  # For internal-only ALBs, restrict to specific CIDR blocks.
  # Use var.alb_ingress_cidr_blocks to customize allowed sources.
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.alb_ingress_cidr_blocks
    description = "HTTP from allowed sources"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.alb_ingress_cidr_blocks
    description = "HTTPS from allowed sources"
  }

  # SECURITY: ALB needs egress to forward traffic to targets
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
    description = "Allow outbound to VPC targets"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-alb-sg"
    }
  )
}

# ============================================
# Security Group - Application
# ============================================
resource "aws_security_group" "app" {
  count       = var.cloud_provider == "aws" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-app-sg"
  description = "Security group for application workloads"
  vpc_id      = aws_vpc.main[0].id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb[0].id]
    description     = "All TCP from ALB"
  }

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
    description = "All TCP from self"
  }

  # SECURITY: Application egress - required for external API calls,
  # package downloads, etc. Consider using VPC endpoints to reduce exposure.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = var.app_egress_cidr_blocks
    description = "Outbound traffic - customize via var.app_egress_cidr_blocks"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-app-sg"
    }
  )
}

# ============================================
# VPC Flow Logs
# ============================================
resource "aws_flow_log" "main" {
  count                = var.cloud_provider == "aws" && var.enable_flow_logs ? 1 : 0
  iam_role_arn         = aws_iam_role.flow_logs[0].arn
  log_destination      = aws_cloudwatch_log_group.flow_logs[0].arn
  traffic_type         = "ALL"
  vpc_id               = aws_vpc.main[0].id
  max_aggregation_interval = 60

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-vpc-flow-logs"
    }
  )
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  count             = var.cloud_provider == "aws" && var.enable_flow_logs ? 1 : 0
  name              = "/aws/vpc/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_iam_role" "flow_logs" {
  count = var.cloud_provider == "aws" && var.enable_flow_logs ? 1 : 0
  name  = "${var.project_name}-${var.environment}-vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = ""
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.cloud_provider == "aws" && var.enable_flow_logs ? 1 : 0
  name  = "${var.project_name}-${var.environment}-vpc-flow-logs-policy"
  role  = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}
