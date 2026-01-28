# Compute Module - AWS EKS, ECR
# Broxiva E-commerce Platform - AWS Infrastructure

# ============================================
# Data Sources
# ============================================
data "aws_availability_zones" "available" {
  state = "available"
}

# ============================================
# Amazon ECR (Elastic Container Registry)
# ============================================
resource "aws_ecr_repository" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name                 = "${var.project_name}-${var.environment}"
  image_tag_mutability = "MUTABLE"

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_id
  }

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-ecr"
      Service = "Container Registry"
    }
  )
}

resource "aws_ecr_lifecycle_policy" "main" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  repository = aws_ecr_repository.main[0].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ============================================
# EKS Cluster IAM Role
# ============================================
resource "aws_iam_role" "eks_cluster" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster[0].name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster[0].name
}

# ============================================
# EKS Cluster Security Group
# ============================================
resource "aws_security_group" "eks_cluster" {
  count       = var.cloud_provider == "aws" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-eks-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = var.vpc_id

  # SECURITY: Egress rule for EKS cluster communication
  # Note: 0.0.0.0/0 egress is typically required for EKS to:
  # - Pull container images from ECR/external registries
  # - Communicate with AWS APIs
  # - Download packages during builds
  # For stricter security, use VPC endpoints and restrict to specific destinations.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = var.eks_egress_cidr_blocks
    description = "Allow outbound traffic - customize via var.eks_egress_cidr_blocks"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-eks-cluster-sg"
    }
  )
}

# ============================================
# EKS Cluster
# ============================================
resource "aws_eks_cluster" "main" {
  count    = var.cloud_provider == "aws" ? 1 : 0
  name     = "${var.project_name}-${var.environment}-eks"
  role_arn = aws_iam_role.eks_cluster[0].arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.eks_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = var.eks_public_access
    public_access_cidrs     = var.eks_public_access ? var.allowed_ip_ranges : []
    security_group_ids      = [aws_security_group.eks_cluster[0].id]
  }

  encryption_config {
    provider {
      key_arn = var.kms_key_arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_resource_controller,
  ]

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-eks"
      Service = "Kubernetes"
    }
  )
}

# ============================================
# EKS Node Group IAM Role
# ============================================
resource "aws_iam_role" "eks_nodes" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes[0].name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes[0].name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes[0].name
}

# ============================================
# EKS System Node Group
# ============================================
resource "aws_eks_node_group" "system" {
  count           = var.cloud_provider == "aws" ? 1 : 0
  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${var.project_name}-${var.environment}-system"
  node_role_arn   = aws_iam_role.eks_nodes[0].arn
  subnet_ids      = var.eks_subnet_ids

  instance_types = [var.system_node_size]
  disk_size      = 100

  scaling_config {
    desired_size = var.system_node_count
    min_size     = var.system_node_min
    max_size     = var.system_node_max
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    "nodepool-type" = "system"
    "environment"   = var.environment
  }

  taints {
    key    = "CriticalAddonsOnly"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-system-nodegroup"
    }
  )

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# ============================================
# EKS User Node Group (Application workloads)
# ============================================
resource "aws_eks_node_group" "user" {
  count           = var.cloud_provider == "aws" ? 1 : 0
  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${var.project_name}-${var.environment}-user"
  node_role_arn   = aws_iam_role.eks_nodes[0].arn
  subnet_ids      = var.eks_subnet_ids

  instance_types = [var.user_node_size]
  disk_size      = 100

  scaling_config {
    desired_size = var.user_node_min
    min_size     = var.user_node_min
    max_size     = var.user_node_max
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    "nodepool-type" = "user"
    "environment"   = var.environment
    "workload"      = "application"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-user-nodegroup"
    }
  )

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# ============================================
# EKS Spot Node Group (Cost optimization)
# ============================================
resource "aws_eks_node_group" "spot" {
  count           = var.cloud_provider == "aws" && var.enable_spot_nodes ? 1 : 0
  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${var.project_name}-${var.environment}-spot"
  node_role_arn   = aws_iam_role.eks_nodes[0].arn
  subnet_ids      = var.eks_subnet_ids

  instance_types = [var.spot_node_size]
  capacity_type  = "SPOT"
  disk_size      = 100

  scaling_config {
    desired_size = 0
    min_size     = 0
    max_size     = var.spot_node_max
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    "nodepool-type"                = "spot"
    "environment"                  = var.environment
    "workload"                     = "batch"
    "node.kubernetes.io/lifecycle" = "spot"
  }

  taints {
    key    = "node.kubernetes.io/lifecycle"
    value  = "spot"
    effect = "NO_SCHEDULE"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-spot-nodegroup"
    }
  )

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# ============================================
# EKS Add-ons
# ============================================
resource "aws_eks_addon" "vpc_cni" {
  count                       = var.cloud_provider == "aws" ? 1 : 0
  cluster_name                = aws_eks_cluster.main[0].name
  addon_name                  = "vpc-cni"
  addon_version               = var.vpc_cni_version
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.tags
}

resource "aws_eks_addon" "kube_proxy" {
  count                       = var.cloud_provider == "aws" ? 1 : 0
  cluster_name                = aws_eks_cluster.main[0].name
  addon_name                  = "kube-proxy"
  addon_version               = var.kube_proxy_version
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.tags
}

resource "aws_eks_addon" "coredns" {
  count                       = var.cloud_provider == "aws" ? 1 : 0
  cluster_name                = aws_eks_cluster.main[0].name
  addon_name                  = "coredns"
  addon_version               = var.coredns_version
  resolve_conflicts_on_update = "PRESERVE"

  depends_on = [
    aws_eks_node_group.system
  ]

  tags = var.tags
}

resource "aws_eks_addon" "ebs_csi_driver" {
  count                       = var.cloud_provider == "aws" ? 1 : 0
  cluster_name                = aws_eks_cluster.main[0].name
  addon_name                  = "aws-ebs-csi-driver"
  addon_version               = var.ebs_csi_version
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.tags
}

# ============================================
# CloudWatch Log Group for EKS
# ============================================
resource "aws_cloudwatch_log_group" "eks" {
  count             = var.cloud_provider == "aws" ? 1 : 0
  name              = "/aws/eks/${var.project_name}-${var.environment}/cluster"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# ============================================
# OIDC Provider for EKS (for IRSA)
# ============================================
data "tls_certificate" "eks" {
  count = var.cloud_provider == "aws" ? 1 : 0
  url   = aws_eks_cluster.main[0].identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  count           = var.cloud_provider == "aws" ? 1 : 0
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks[0].certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main[0].identity[0].oidc[0].issuer

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-eks-oidc"
    }
  )
}
