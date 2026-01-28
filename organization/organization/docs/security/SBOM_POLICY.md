# Software Bill of Materials (SBOM) Policy

## Document Information

| Field | Value |
|-------|-------|
| **Document Owner** | Security Engineering Team |
| **Last Updated** | January 2026 |
| **Review Frequency** | Quarterly |
| **Classification** | Internal |

---

## 1. Introduction

### 1.1 What is SBOM?

A Software Bill of Materials (SBOM) is a formal, machine-readable inventory of software components and dependencies used to build a given piece of software. Similar to a bill of materials in manufacturing, an SBOM provides transparency into the software supply chain by listing:

- All open source and third-party components
- Libraries and their versions
- Licensing information
- Dependency relationships (direct and transitive)
- Component origins and suppliers

### 1.2 Why SBOM Matters

SBOMs are critical for modern software security and compliance for several reasons:

1. **Vulnerability Management**: When a new vulnerability is disclosed (e.g., Log4Shell, CVE-2021-44228), organizations can quickly determine if they are affected by searching their SBOMs for the vulnerable component.

2. **Supply Chain Security**: SBOMs provide visibility into the complete software supply chain, helping identify potentially compromised or untrusted components.

3. **License Compliance**: Organizations can verify that all components comply with their licensing policies and identify any license conflicts.

4. **Incident Response**: During security incidents, SBOMs enable rapid identification of affected systems and components.

5. **Risk Assessment**: SBOMs facilitate risk evaluation of software before deployment by understanding its composition.

---

## 2. Generation Frequency

### 2.1 Automated Generation

SBOMs are automatically generated as part of the CI/CD pipeline:

| Trigger | Description |
|---------|-------------|
| **Every Build** | SBOM generated for each successful build on the main branch |
| **Pull Requests** | SBOM generated for PR builds (stored temporarily for review) |
| **Release Tags** | SBOM generated and archived with release artifacts |
| **Scheduled** | Weekly comprehensive SBOM regeneration for all active projects |

### 2.2 Manual Generation

Manual SBOM generation may be requested for:

- Security audits and assessments
- Customer or regulatory requests
- Third-party software evaluations
- Incident response investigations

### 2.3 Tools and Formats

| Tool | Purpose | Output Format |
|------|---------|---------------|
| **Syft** (Primary) | Container and filesystem SBOM generation | CycloneDX JSON |
| **npm audit** | Node.js dependency analysis | JSON |
| **pip-audit** | Python dependency analysis | JSON |

---

## 3. Storage and Retention

### 3.1 Storage Locations

| SBOM Type | Storage Location | Access Control |
|-----------|------------------|----------------|
| Build Artifacts | GitHub Actions Artifacts | Repository access |
| Release SBOMs | AWS S3 (broxiva-sbom-archive) | Security team + DevOps |
| Production SBOMs | AWS S3 + Dependency-Track | Security team |

### 3.2 Retention Policy

| Category | Retention Period | Justification |
|----------|------------------|---------------|
| Development builds | 7 days | CI/CD artifact default |
| Release candidates | 90 days | Testing and validation period |
| Production releases | 7 years | Compliance and audit requirements |
| Security incidents | 10 years | Legal and forensic requirements |

### 3.3 Integrity Protection

- All SBOMs are cryptographically signed using repository signing keys
- SHA-256 checksums are generated and stored alongside SBOMs
- Immutable storage is used for production release SBOMs
- Access logs are maintained for audit purposes

---

## 4. Vulnerability Correlation

### 4.1 Automated Scanning

SBOMs are automatically correlated against vulnerability databases:

| Database | Update Frequency | Coverage |
|----------|------------------|----------|
| National Vulnerability Database (NVD) | Hourly | CVE records |
| GitHub Advisory Database | Real-time | GitHub ecosystem |
| OSV (Open Source Vulnerabilities) | Real-time | Multi-ecosystem |
| Anchore Grype | Daily | Comprehensive |

### 4.2 Vulnerability Response SLAs

| Severity | Response Time | Remediation Time |
|----------|---------------|------------------|
| Critical (CVSS 9.0-10.0) | 4 hours | 24 hours |
| High (CVSS 7.0-8.9) | 24 hours | 7 days |
| Medium (CVSS 4.0-6.9) | 72 hours | 30 days |
| Low (CVSS 0.1-3.9) | 7 days | 90 days |

### 4.3 Correlation Workflow

1. **Detection**: Automated scanners identify vulnerable components in SBOM
2. **Triage**: Security team assesses exploitability and impact
3. **Notification**: Affected teams notified via automated alerts
4. **Remediation**: Component updated or mitigating controls applied
5. **Verification**: Updated SBOM confirms vulnerability resolved
6. **Documentation**: Incident documented for audit trail

---

## 5. Compliance Requirements

### 5.1 Executive Order 14028

This SBOM policy aligns with the requirements of **Executive Order 14028** ("Improving the Nation's Cybersecurity"), signed May 12, 2021, which mandates:

#### Section 4 - Enhancing Software Supply Chain Security

| Requirement | Implementation |
|-------------|----------------|
| **4(e)(vii)** - Provide SBOM for each software product | Generated automatically in CI/CD pipeline |
| **4(e)(x)** - Use automated tools to maintain supply chain security | Syft, Grype, Trivy integrated into pipeline |
| **NTIA Minimum Elements** | All required fields included in CycloneDX output |

#### NTIA Minimum Elements Compliance

Our SBOMs include all minimum elements specified by NTIA:

| Element | Field | Status |
|---------|-------|--------|
| Supplier Name | `supplier.name` | Included |
| Component Name | `name` | Included |
| Version | `version` | Included |
| Unique Identifier | `bom-ref`, `purl` | Included |
| Dependency Relationship | `dependencies` | Included |
| Author of SBOM Data | `metadata.authors` | Included |
| Timestamp | `metadata.timestamp` | Included |

### 5.2 Additional Regulatory Frameworks

| Framework | Requirement | Compliance Status |
|-----------|-------------|-------------------|
| **NIST SP 800-218 (SSDF)** | Software composition analysis | Compliant |
| **NIST CSF 2.0** | Supply chain risk management | Compliant |
| **SOC 2 Type II** | Change management controls | Compliant |
| **ISO 27001** | Asset inventory and management | Compliant |
| **PCI DSS 4.0** | Software development security | Compliant |
| **GDPR** | Third-party processor inventory | Compliant |

### 5.3 Customer and Contractual Requirements

- SBOMs are available to enterprise customers upon request
- Government contracts include SBOM delivery as standard
- SLA for SBOM delivery: 48 hours from request

---

## 6. Roles and Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Security Engineering** | Policy ownership, tool selection, vulnerability triage |
| **DevOps/Platform** | CI/CD integration, storage infrastructure, automation |
| **Development Teams** | Dependency updates, vulnerability remediation |
| **Compliance** | Audit support, regulatory mapping, customer requests |
| **Legal** | License compliance review, contract requirements |

---

## 7. SBOM Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      SBOM LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  BUILD   │───>│ GENERATE │───>│  STORE   │───>│  ANALYZE │  │
│  │          │    │   SBOM   │    │          │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │                                               │         │
│       │                                               v         │
│       │         ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│       └────────>│  DEPLOY  │<───│ REMEDIATE│<───│  ALERT   │  │
│                 │          │    │          │    │          │  │
│                 └──────────┘    └──────────┘    └──────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Exceptions and Exemptions

Exceptions to this policy require:

1. Written justification from the requesting team
2. Risk assessment by Security Engineering
3. Approval from CISO or designated security lead
4. Time-bound exception with review date
5. Documented compensating controls

---

## 9. Policy Review

This policy is reviewed:

- **Quarterly**: Regular review for accuracy and relevance
- **Upon Incident**: After any supply chain security incident
- **Regulatory Changes**: When relevant regulations are updated
- **Tool Changes**: When SBOM generation tools are modified

---

## 10. References

- [Executive Order 14028](https://www.whitehouse.gov/briefing-room/presidential-actions/2021/05/12/executive-order-on-improving-the-nations-cybersecurity/)
- [NTIA SBOM Minimum Elements](https://www.ntia.gov/files/ntia/publications/sbom_minimum_elements_report.pdf)
- [CycloneDX Specification](https://cyclonedx.org/specification/overview/)
- [NIST SP 800-218 (SSDF)](https://csrc.nist.gov/publications/detail/sp/800-218/final)
- [Anchore Syft Documentation](https://github.com/anchore/syft)

---

## Appendix A: SBOM Example Structure (CycloneDX)

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:...",
  "version": 1,
  "metadata": {
    "timestamp": "2026-01-05T00:00:00Z",
    "tools": [
      {
        "vendor": "anchore",
        "name": "syft",
        "version": "1.x.x"
      }
    ],
    "component": {
      "type": "application",
      "name": "broxiva-api",
      "version": "1.0.0"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "express",
      "version": "4.18.2",
      "purl": "pkg:npm/express@4.18.2",
      "licenses": [
        {
          "license": {
            "id": "MIT"
          }
        }
      ]
    }
  ],
  "dependencies": [
    {
      "ref": "broxiva-api",
      "dependsOn": ["express", "..."]
    }
  ]
}
```

---

## Appendix B: CI/CD Integration

The SBOM generation is integrated into the CI/CD pipeline as follows:

```yaml
sbom-generation:
  name: Generate SBOM
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4
    - name: Install Syft
      run: curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
    - name: Generate Node.js SBOM
      run: syft dir:organization/apps/api -o cyclonedx-json > sbom-api.json
    - name: Generate Python SBOM
      run: syft dir:organization/apps/services -o cyclonedx-json > sbom-services.json
    - name: Upload SBOM artifacts
      uses: actions/upload-artifact@v4
      with:
        name: sbom-${{ github.sha }}
        path: sbom-*.json
```
