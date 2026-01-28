# Terraform CI/CD Validation Matrix

## Overview

This document describes the complete validation matrix for the Terraform CI/CD pipeline with strict Dev-Prod gating. The pipeline ensures that **no production deployment can occur unless all Dev validations pass with zero errors**.

## Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   DEV STAGE       |     |   GATE            |     |   PROD STAGE      |
|   (Validation)    | --> |   (Approval)      | --> |   (Deployment)    |
|   No real deploy  |     |   Manual/Auto     |     |   Real resources  |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        v                         v                         v
    SIMULATION              CHECKPOINT                 EXECUTION
    -refresh=false          Requires ALL               terraform apply
    -lock=false             Dev checks PASS            State locked
    Mock providers                                     Real backend
```

## Validation Matrix

### Stage 1: DEV Validation (No Real Resources)

| Check ID | Check Name | Tool | Pass Criteria | Blocks Prod | Auto-Fix |
|----------|------------|------|---------------|-------------|----------|
| DEV-001 | Terraform Init | `terraform init` | Exit code 0 | YES | Provider cache |
| DEV-002 | Provider Lock | `terraform providers lock` | Lock file valid | YES | Regenerate |
| DEV-003 | Syntax Validation | `terraform validate` | valid=true | YES | NO |
| DEV-004 | Format Check | `terraform fmt -check` | No diff | YES | YES (auto-fmt) |
| DEV-005 | Plan Generation | `terraform plan` | Exit code 0 or 2 | YES | NO |
| DEV-006 | Plan JSON Export | `terraform show -json` | Valid JSON | YES | NO |
| DEV-007 | Security Scan (tfsec) | tfsec | No CRITICAL | YES | NO |
| DEV-008 | Security Scan (checkov) | checkov | <10 failures | YES | NO |
| DEV-009 | Policy Check (OPA) | opa eval | No deny | WARN | NO |
| DEV-010 | Cost Estimation | infracost | <20% increase | WARN | NO |
| DEV-011 | Drift Detection | Plan analysis | Logged | NO | NO |
| DEV-012 | Resource Count Safety | Plan analysis | <5 destroys | YES | NO |

### Detailed Validation Checks

#### DEV-001: Terraform Init

**Purpose:** Initialize Terraform working directory and download providers.

```bash
terraform init -backend=false -input=false
```

**Flags Used:**
- `-backend=false`: Skip backend initialization for syntax-only validation
- `-input=false`: Disable interactive prompts

**Pass Criteria:**
- Exit code 0
- All providers downloaded successfully
- Module sources resolved

**Auto-Fix Actions:**
- Clear plugin cache and retry
- Update provider constraints if version conflicts

---

#### DEV-002: Provider Lock

**Purpose:** Ensure provider versions are locked and consistent.

```bash
terraform providers lock -platform=linux_amd64 -platform=darwin_amd64 -platform=darwin_arm64
```

**Pass Criteria:**
- `.terraform.lock.hcl` file generated/updated
- All platforms supported

**Validation Points:**
- Provider version constraints satisfied
- Hash verification passes
- Cross-platform compatibility confirmed

---

#### DEV-003: Syntax Validation

**Purpose:** Validate Terraform configuration syntax and semantics.

```bash
terraform validate -json
```

**Pass Criteria:**
```json
{
  "valid": true,
  "error_count": 0,
  "warning_count": 0
}
```

**Validation Points:**
- HCL syntax correct
- Variable types match
- Resource arguments valid
- Module calls correct
- Data source configurations valid

---

#### DEV-004: Format Check

**Purpose:** Ensure consistent code formatting.

```bash
terraform fmt -check -recursive -diff
```

**Pass Criteria:**
- No files require formatting
- Exit code 0

**Auto-Fix:**
```bash
terraform fmt -recursive
git add -A && git commit -m "fix(terraform): Auto-fix formatting"
git push  # Only on PR branches
```

---

#### DEV-005: Plan Generation

**Purpose:** Generate execution plan without applying.

```bash
terraform plan -input=false -lock=false -out=tfplan.binary -detailed-exitcode
```

**Flags Used:**
- `-lock=false`: Don't lock state (Dev only)
- `-detailed-exitcode`: Return 0=no changes, 2=changes pending, 1=error

**Pass Criteria:**
- Exit code 0 or 2
- Plan generates successfully

---

#### DEV-006: Plan JSON Export

**Purpose:** Export plan to JSON for analysis.

```bash
terraform show -json tfplan.binary > validated-plan.json
```

**Output Structure:**
```json
{
  "format_version": "1.2",
  "terraform_version": "1.5.7",
  "planned_values": {},
  "resource_changes": [],
  "configuration": {}
}
```

---

#### DEV-007: Security Scan (tfsec)

**Purpose:** Static analysis for security misconfigurations.

**Tool:** aquasecurity/tfsec

**Pass Criteria:**
- Zero CRITICAL findings
- Less than 5 HIGH findings

**Common Checks:**
- Unencrypted storage
- Public access enabled
- Missing logging
- Weak encryption
- Open security groups

---

#### DEV-008: Security Scan (checkov)

**Purpose:** Policy-as-code security scanning.

**Tool:** bridgecrewio/checkov

**Pass Criteria:**
- Less than 10 failed checks
- No CKV_AWS_* critical failures

**Skipped Checks:**
- CKV_AWS_144: Cross-region replication (if not applicable)
- CKV_AWS_145: Cross-region replication (if not applicable)

---

#### DEV-009: Policy Check (OPA)

**Purpose:** Custom policy enforcement using Open Policy Agent.

**Policy Categories:**

1. **Tagging Enforcement:**
```rego
deny[msg] {
  resource := input.resource_changes[_]
  resource.change.actions[_] == "create"
  not resource.change.after.tags.Project
  msg := sprintf("Resource %s missing required tag: Project", [resource.address])
}
```

2. **Encryption Requirements:**
```rego
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket"
  not resource.change.after.server_side_encryption_configuration
  msg := "S3 bucket must have encryption enabled"
}
```

3. **Security Group Rules:**
```rego
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group_rule"
  resource.change.after.cidr_blocks[_] == "0.0.0.0/0"
  resource.change.after.type == "ingress"
  msg := "Unrestricted inbound access denied"
}
```

4. **Naming Conventions:**
```rego
deny[msg] {
  resource := input.resource_changes[_]
  not startswith(resource.name, "broxiva")
  msg := "Resource must follow naming convention"
}
```

---

#### DEV-010: Cost Estimation

**Purpose:** Estimate infrastructure cost changes.

**Tool:** infracost

**Pass Criteria:**
- Monthly cost increase < 20%
- Or absolute increase < $1000

**Output:**
```
cost-estimate.json
cost-summary.txt
```

---

#### DEV-011: Drift Detection

**Purpose:** Identify potential state drift.

**Analysis Points:**
- Resources with `update` actions
- Differences between `before` and `after` states
- External modifications detected

---

#### DEV-012: Resource Count Safety

**Purpose:** Prevent accidental mass destruction.

**Pass Criteria:**
- Resources to destroy < 5 (configurable)

**Safety Block:**
```bash
if [ $DESTROY -gt $MAX_RESOURCES_TO_DESTROY ]; then
  echo "SAFETY BLOCK: Plan would destroy $DESTROY resources"
  exit 1
fi
```

---

### Stage 2: Production Gate

| Check ID | Check Name | Requirement |
|----------|------------|-------------|
| GATE-001 | DEV Verdict | Must be PASS |
| GATE-002 | Environment Approval | production environment |
| GATE-003 | Branch Protection | main branch only |
| GATE-004 | Manual Approval | Required (GitHub Environment) |

---

### Stage 3: Production Deployment

| Check ID | Check Name | Tool | Purpose |
|----------|------------|------|---------|
| PROD-001 | Init with Backend | `terraform init` | Full initialization |
| PROD-002 | Provider Lock Verify | File check | Ensure lock exists |
| PROD-003 | Plan Consistency | Compare plans | Detect drift |
| PROD-004 | Apply | `terraform apply` | Deploy changes |
| PROD-005 | Post-Deploy Verify | `terraform plan` | Confirm state |
| PROD-006 | Output Capture | `terraform output` | Document results |

---

## Auto-Fix Logic Flow

```
+------------------+
|  Validation      |
|  Failed?         |
+--------+---------+
         |
    YES  |  NO
         v
+--------+---------+
|  Is Auto-Fixable?|
+--------+---------+
         |
    YES  |  NO
         v        v
+--------+----+  +----+--------+
|  Apply Fix  |  |  Block and  |
|  - fmt      |  |  Report     |
|  - cache    |  |             |
+--------+----+  +-------------+
         |
         v
+--------+---------+
|  Re-run          |
|  Validation      |
+--------+---------+
         |
         v
+--------+---------+
|  Fixed?          |
+--------+---------+
         |
    YES  |  NO
         v        v
+--------+----+  +----+--------+
|  Continue   |  |  Manual     |
|  Pipeline   |  |  Intervention|
+-------------+  +-------------+
```

### Auto-Fixable Issues

| Issue Type | Auto-Fix Action | Conditions |
|------------|-----------------|------------|
| Format violations | `terraform fmt -recursive` | PR branches only |
| Provider cache miss | Clear cache and re-init | Always |
| Lock file outdated | Regenerate lock file | With approval |

### Non-Auto-Fixable Issues

| Issue Type | Required Action |
|------------|-----------------|
| Syntax errors | Manual code fix |
| Missing variables | Add variable definitions |
| Security violations | Architecture review |
| Policy failures | Policy exception or code change |

---

## Artifact Matrix

| Artifact Name | Stage | Contents | Retention |
|---------------|-------|----------|-----------|
| dev-init-artifacts | DEV | init_output.txt, providers_output.txt, .terraform.lock.hcl | 7 days |
| dev-validate-artifacts | DEV | fmt_output.txt, validate_output.json | 7 days |
| dev-plan-artifacts | DEV | validated-plan.json, validated-plan.txt | 7 days |
| dev-security-artifacts | DEV | tfsec results, checkov results | 7 days |
| dev-policy-artifacts | DEV | policy_results.txt, *.rego | 7 days |
| dev-cost-artifacts | DEV | cost-estimate.json, cost-summary.txt | 7 days |
| dev-verdict | DEV | verdict.md | 30 days |
| prod-plan-artifacts | PROD | prod-plan.json | 7 days |
| prod-apply-artifacts | PROD | apply_output.txt, terraform_outputs.json | 30 days |
| prod-verification-artifacts | PROD | verify_output.txt | 30 days |
| deployment-report | ALL | report.md | 90 days |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| TF_VERSION | Terraform version | 1.5.7 |
| TF_WORKING_DIR | Working directory | organization/infrastructure/terraform/environments/aws-prod |
| AWS_REGION | AWS region | us-east-1 |
| MAX_COST_INCREASE_PERCENT | Cost threshold | 20 |
| MAX_RESOURCES_TO_DESTROY | Destruction safety limit | 5 |

---

## Required Secrets

| Secret Name | Description | Used In |
|-------------|-------------|---------|
| AWS_ROLE_ARN | IAM role for OIDC | All AWS operations |
| INFRACOST_API_KEY | Infracost API key | Cost estimation |
| GITHUB_TOKEN | GitHub token | Auto-fix commits |

---

## Failure Scenarios and Responses

### Scenario 1: Format Check Failure

**Trigger:** Terraform files not formatted correctly.

**Response:**
1. Auto-fix triggered
2. `terraform fmt -recursive` applied
3. Changes committed (PR branches only)
4. Pipeline re-triggers

### Scenario 2: Security Scan Failure

**Trigger:** Critical security finding detected.

**Response:**
1. Pipeline blocked
2. Detailed report generated
3. PR comment posted
4. Manual remediation required

### Scenario 3: Cost Threshold Exceeded

**Trigger:** Estimated cost increase > 20%.

**Response:**
1. Warning issued
2. Pipeline continues (warning only)
3. Cost report attached
4. Manual approval still required

### Scenario 4: Plan Drift Detected

**Trigger:** Prod plan differs from Dev plan.

**Response:**
1. Warning logged
2. Pipeline continues
3. Drift details captured
4. Post-deployment verification runs

### Scenario 5: Apply Failure

**Trigger:** Terraform apply fails.

**Response:**
1. Pipeline fails
2. State may be partially applied
3. Manual intervention required
4. Rollback procedure documented

---

## Compliance Mapping

| Requirement | Validation Check | Evidence |
|-------------|------------------|----------|
| Encryption at rest | DEV-007, DEV-008 | Security scan reports |
| Access control | DEV-009 (OPA) | Policy evaluation |
| Change management | GATE-002 | GitHub environment approval |
| Audit trail | PROD-006 | terraform_outputs.json |
| Cost control | DEV-010 | Cost estimation report |
| Disaster recovery | DEV-002 | Provider lock verification |

---

## Pipeline Timing

| Stage | Typical Duration | Timeout |
|-------|------------------|---------|
| Preflight | 30s | 5m |
| DEV Init | 2m | 10m |
| DEV Validate | 1m | 5m |
| DEV Plan | 3-5m | 15m |
| DEV Security | 2-3m | 10m |
| DEV Policy | 1m | 5m |
| DEV Cost | 1-2m | 10m |
| PROD Gate | Variable | Manual |
| PROD Init | 2m | 10m |
| PROD Plan | 3-5m | 15m |
| PROD Apply | 5-30m | 60m |
| PROD Verify | 2m | 10m |

**Total Pipeline Time (excluding approval):** 20-50 minutes

---

## Rollback Procedure

If production deployment fails or causes issues:

1. **Immediate Actions:**
   - Check Terraform state for partial applies
   - Review apply_output.txt artifact
   - Assess impact on running services

2. **Rollback Options:**
   - Revert to previous commit and re-run pipeline
   - Manual `terraform apply` with previous state
   - Targeted resource destruction if needed

3. **Post-Incident:**
   - Document incident in deployment report
   - Update policies if needed
   - Adjust safety thresholds

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-05 | Initial validation matrix |
