# =============================================================================
# Marketing IAM (IRSA Roles) Module - Outputs
# Broxiva E-Commerce Platform
# =============================================================================

# -----------------------------------------------------------------------------
# SEO Service Role Outputs
# -----------------------------------------------------------------------------
output "seo_role_arn" {
  description = "SEO service IRSA role ARN"
  value       = aws_iam_role.seo.arn
}

output "seo_role_name" {
  description = "SEO service IRSA role name"
  value       = aws_iam_role.seo.name
}

# -----------------------------------------------------------------------------
# Content Service Role Outputs
# -----------------------------------------------------------------------------
output "content_role_arn" {
  description = "Content service IRSA role ARN"
  value       = aws_iam_role.content.arn
}

output "content_role_name" {
  description = "Content service IRSA role name"
  value       = aws_iam_role.content.name
}

# -----------------------------------------------------------------------------
# Analytics Service Role Outputs
# -----------------------------------------------------------------------------
output "analytics_role_arn" {
  description = "Analytics service IRSA role ARN"
  value       = aws_iam_role.analytics.arn
}

output "analytics_role_name" {
  description = "Analytics service IRSA role name"
  value       = aws_iam_role.analytics.name
}

# -----------------------------------------------------------------------------
# Personalization Service Role Outputs
# -----------------------------------------------------------------------------
output "personalization_role_arn" {
  description = "Personalization service IRSA role ARN"
  value       = aws_iam_role.personalization.arn
}

output "personalization_role_name" {
  description = "Personalization service IRSA role name"
  value       = aws_iam_role.personalization.name
}

# -----------------------------------------------------------------------------
# Lifecycle Service Role Outputs
# -----------------------------------------------------------------------------
output "lifecycle_role_arn" {
  description = "Lifecycle service IRSA role ARN"
  value       = aws_iam_role.lifecycle.arn
}

output "lifecycle_role_name" {
  description = "Lifecycle service IRSA role name"
  value       = aws_iam_role.lifecycle.name
}

# -----------------------------------------------------------------------------
# Growth Service Role Outputs
# -----------------------------------------------------------------------------
output "growth_role_arn" {
  description = "Growth service IRSA role ARN"
  value       = aws_iam_role.growth.arn
}

output "growth_role_name" {
  description = "Growth service IRSA role name"
  value       = aws_iam_role.growth.name
}

# -----------------------------------------------------------------------------
# Commerce Service Role Outputs
# -----------------------------------------------------------------------------
output "commerce_role_arn" {
  description = "Commerce service IRSA role ARN"
  value       = aws_iam_role.commerce.arn
}

output "commerce_role_name" {
  description = "Commerce service IRSA role name"
  value       = aws_iam_role.commerce.name
}

# -----------------------------------------------------------------------------
# AI Marketing Service Role Outputs
# -----------------------------------------------------------------------------
output "ai_marketing_role_arn" {
  description = "AI Marketing service IRSA role ARN"
  value       = aws_iam_role.ai_marketing.arn
}

output "ai_marketing_role_name" {
  description = "AI Marketing service IRSA role name"
  value       = aws_iam_role.ai_marketing.name
}

# -----------------------------------------------------------------------------
# Aggregated Outputs
# -----------------------------------------------------------------------------
output "all_role_arns" {
  description = "Map of all IRSA role ARNs by service"
  value = {
    seo             = aws_iam_role.seo.arn
    content         = aws_iam_role.content.arn
    analytics       = aws_iam_role.analytics.arn
    personalization = aws_iam_role.personalization.arn
    lifecycle       = aws_iam_role.lifecycle.arn
    growth          = aws_iam_role.growth.arn
    commerce        = aws_iam_role.commerce.arn
    ai_marketing    = aws_iam_role.ai_marketing.arn
  }
}

output "all_role_names" {
  description = "Map of all IRSA role names by service"
  value = {
    seo             = aws_iam_role.seo.name
    content         = aws_iam_role.content.name
    analytics       = aws_iam_role.analytics.name
    personalization = aws_iam_role.personalization.name
    lifecycle       = aws_iam_role.lifecycle.name
    growth          = aws_iam_role.growth.name
    commerce        = aws_iam_role.commerce.name
    ai_marketing    = aws_iam_role.ai_marketing.name
  }
}

# -----------------------------------------------------------------------------
# Service Account Annotations
# -----------------------------------------------------------------------------
output "service_account_annotations" {
  description = "Service account annotations for each service"
  value = {
    seo = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.seo.arn
    }
    content = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.content.arn
    }
    analytics = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.analytics.arn
    }
    personalization = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.personalization.arn
    }
    lifecycle = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.lifecycle.arn
    }
    growth = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.growth.arn
    }
    commerce = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.commerce.arn
    }
    ai_marketing = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.ai_marketing.arn
    }
  }
}
