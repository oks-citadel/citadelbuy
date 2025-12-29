// Action Groups for Broxiva Alert Notifications
// This Bicep template creates tiered action groups for different severity levels

param location string = 'global'
param environment string = 'production'

param tags object = {
  environment: environment
  application: 'broxiva'
  managedBy: 'bicep'
  purpose: 'alerting'
}

// Configuration parameters for notification channels
param criticalEmailReceivers array = [
  {
    name: 'On-Call Engineer'
    emailAddress: 'oncall@broxiva.com'
  }
  {
    name: 'DevOps Lead'
    emailAddress: 'devops-lead@broxiva.com'
  }
  {
    name: 'CTO'
    emailAddress: 'cto@broxiva.com'
  }
]

param warningEmailReceivers array = [
  {
    name: 'DevOps Team'
    emailAddress: 'devops@broxiva.com'
  }
  {
    name: 'Engineering Team'
    emailAddress: 'engineering@broxiva.com'
  }
  {
    name: 'Platform Team'
    emailAddress: 'platform@broxiva.com'
  }
]

param infoEmailReceivers array = [
  {
    name: 'Monitoring Team'
    emailAddress: 'monitoring@broxiva.com'
  }
]

// SMS Configuration
param criticalSmsReceivers array = [
  {
    name: 'On-Call Primary'
    countryCode: '1'
    phoneNumber: '5551234567'
  }
  {
    name: 'On-Call Secondary'
    countryCode: '1'
    phoneNumber: '5559876543'
  }
]

// Webhook Configuration
param slackCriticalWebhook string = 'https://hooks.slack.com/services/YOUR/CRITICAL/WEBHOOK'
param slackWarningWebhook string = 'https://hooks.slack.com/services/YOUR/WARNING/WEBHOOK'
param slackInfoWebhook string = 'https://hooks.slack.com/services/YOUR/INFO/WEBHOOK'
param teamsWebhook string = 'https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK'
param pagerDutyWebhook string = 'https://events.pagerduty.com/integration/YOUR_INTEGRATION_KEY/enqueue'

// ===== CRITICAL ACTION GROUP (Severity 0-1) =====

resource criticalActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'broxiva-critical-alerts'
  location: location
  tags: tags
  properties: {
    groupShortName: 'BroxCrit'
    enabled: true
    emailReceivers: [
      for receiver in criticalEmailReceivers: {
        name: receiver.name
        emailAddress: receiver.emailAddress
        useCommonAlertSchema: true
      }
    ]
    smsReceivers: [
      for receiver in criticalSmsReceivers: {
        name: receiver.name
        countryCode: receiver.countryCode
        phoneNumber: receiver.phoneNumber
      }
    ]
    webhookReceivers: [
      {
        name: 'PagerDuty Critical'
        serviceUri: pagerDutyWebhook
        useCommonAlertSchema: true
      }
      {
        name: 'Slack Critical'
        serviceUri: slackCriticalWebhook
        useCommonAlertSchema: true
      }
    ]
    armRoleReceivers: [
      {
        name: 'Monitoring Contributor'
        roleId: '749f88d5-cbae-40b8-bcfc-e573ddc772fa'
        useCommonAlertSchema: true
      }
    ]
    azureFunctionReceivers: []
    logicAppReceivers: []
  }
}

// ===== WARNING ACTION GROUP (Severity 2) =====

resource warningActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'broxiva-warning-alerts'
  location: location
  tags: tags
  properties: {
    groupShortName: 'BroxWarn'
    enabled: true
    emailReceivers: [
      for receiver in warningEmailReceivers: {
        name: receiver.name
        emailAddress: receiver.emailAddress
        useCommonAlertSchema: true
      }
    ]
    smsReceivers: []
    webhookReceivers: [
      {
        name: 'Slack Warnings'
        serviceUri: slackWarningWebhook
        useCommonAlertSchema: true
      }
      {
        name: 'Microsoft Teams'
        serviceUri: teamsWebhook
        useCommonAlertSchema: true
      }
    ]
    armRoleReceivers: []
  }
}

// ===== INFO ACTION GROUP (Severity 3-4) =====

resource infoActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'broxiva-info-alerts'
  location: location
  tags: tags
  properties: {
    groupShortName: 'BroxInfo'
    enabled: true
    emailReceivers: [
      for receiver in infoEmailReceivers: {
        name: receiver.name
        emailAddress: receiver.emailAddress
        useCommonAlertSchema: true
      }
    ]
    smsReceivers: []
    webhookReceivers: [
      {
        name: 'Slack Info'
        serviceUri: slackInfoWebhook
        useCommonAlertSchema: true
      }
    ]
  }
}

// ===== SECURITY ACTION GROUP =====

resource securityActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'broxiva-security-alerts'
  location: location
  tags: union(tags, { purpose: 'security-alerting' })
  properties: {
    groupShortName: 'BroxSec'
    enabled: true
    emailReceivers: [
      {
        name: 'Security Team'
        emailAddress: 'security@broxiva.com'
        useCommonAlertSchema: true
      }
      {
        name: 'CISO'
        emailAddress: 'ciso@broxiva.com'
        useCommonAlertSchema: true
      }
      {
        name: 'Compliance Team'
        emailAddress: 'compliance@broxiva.com'
        useCommonAlertSchema: true
      }
    ]
    smsReceivers: [
      {
        name: 'Security On-Call'
        countryCode: '1'
        phoneNumber: '5551112222'
      }
    ]
    webhookReceivers: [
      {
        name: 'Slack Security'
        serviceUri: 'https://hooks.slack.com/services/YOUR/SECURITY/WEBHOOK'
        useCommonAlertSchema: true
      }
      {
        name: 'PagerDuty Security'
        serviceUri: 'https://events.pagerduty.com/integration/YOUR_SECURITY_KEY/enqueue'
        useCommonAlertSchema: true
      }
    ]
  }
}

// ===== COST OPTIMIZATION ACTION GROUP =====

resource costActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'broxiva-cost-alerts'
  location: location
  tags: union(tags, { purpose: 'cost-management' })
  properties: {
    groupShortName: 'BroxCost'
    enabled: true
    emailReceivers: [
      {
        name: 'Finance Team'
        emailAddress: 'finance@broxiva.com'
        useCommonAlertSchema: true
      }
      {
        name: 'DevOps Lead'
        emailAddress: 'devops-lead@broxiva.com'
        useCommonAlertSchema: true
      }
      {
        name: 'CFO'
        emailAddress: 'cfo@broxiva.com'
        useCommonAlertSchema: true
      }
    ]
    webhookReceivers: [
      {
        name: 'Slack Cost'
        serviceUri: 'https://hooks.slack.com/services/YOUR/COST/WEBHOOK'
        useCommonAlertSchema: true
      }
    ]
  }
}

// ===== PERFORMANCE ACTION GROUP =====

resource performanceActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'broxiva-performance-alerts'
  location: location
  tags: union(tags, { purpose: 'performance-monitoring' })
  properties: {
    groupShortName: 'BroxPerf'
    enabled: true
    emailReceivers: [
      {
        name: 'Performance Team'
        emailAddress: 'performance@broxiva.com'
        useCommonAlertSchema: true
      }
      {
        name: 'Backend Engineers'
        emailAddress: 'backend@broxiva.com'
        useCommonAlertSchema: true
      }
    ]
    webhookReceivers: [
      {
        name: 'Slack Performance'
        serviceUri: 'https://hooks.slack.com/services/YOUR/PERFORMANCE/WEBHOOK'
        useCommonAlertSchema: true
      }
    ]
  }
}

// ===== BUSINESS METRICS ACTION GROUP =====

resource businessActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'broxiva-business-alerts'
  location: location
  tags: union(tags, { purpose: 'business-monitoring' })
  properties: {
    groupShortName: 'BroxBiz'
    enabled: true
    emailReceivers: [
      {
        name: 'Product Team'
        emailAddress: 'product@broxiva.com'
        useCommonAlertSchema: true
      }
      {
        name: 'Business Analytics'
        emailAddress: 'analytics@broxiva.com'
        useCommonAlertSchema: true
      }
      {
        name: 'Customer Success'
        emailAddress: 'customer-success@broxiva.com'
        useCommonAlertSchema: true
      }
    ]
    webhookReceivers: [
      {
        name: 'Slack Business'
        serviceUri: 'https://hooks.slack.com/services/YOUR/BUSINESS/WEBHOOK'
        useCommonAlertSchema: true
      }
    ]
  }
}

// ===== OUTPUTS =====

output criticalActionGroupId string = criticalActionGroup.id
output criticalActionGroupName string = criticalActionGroup.name

output warningActionGroupId string = warningActionGroup.id
output warningActionGroupName string = warningActionGroup.name

output infoActionGroupId string = infoActionGroup.id
output infoActionGroupName string = infoActionGroup.name

output securityActionGroupId string = securityActionGroup.id
output securityActionGroupName string = securityActionGroup.name

output costActionGroupId string = costActionGroup.id
output costActionGroupName string = costActionGroup.name

output performanceActionGroupId string = performanceActionGroup.id
output performanceActionGroupName string = performanceActionGroup.name

output businessActionGroupId string = businessActionGroup.id
output businessActionGroupName string = businessActionGroup.name

output actionGroupIds object = {
  critical: criticalActionGroup.id
  warning: warningActionGroup.id
  info: infoActionGroup.id
  security: securityActionGroup.id
  cost: costActionGroup.id
  performance: performanceActionGroup.id
  business: businessActionGroup.id
}
