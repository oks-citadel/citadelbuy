# CitadelBuy n8n Workflows - File Index

## 📦 Workflow 01: Order Processing & Fulfillment

### Core Workflow
- **workflow-01-order-processing.json** (28 KB) - Main n8n workflow file [IMPORT THIS]

### Documentation
- **WORKFLOW-01-COMPLETE.md** (15 KB) - ⭐ START HERE - Complete package overview
- **README-workflow-01.md** (14 KB) - Full technical documentation
- **QUICKSTART.md** (6 KB) - 5-minute setup guide
- **WORKFLOW-01-DIAGRAM.md** (28 KB) - Visual flow diagrams

### Testing & Utilities
- **test-payloads.json** (13 KB) - Sample webhooks and test scenarios
- **test-workflow.js** (15 KB) - Automated test suite
- **generate-signature.js** (8 KB) - HMAC signature generator
- **package.json** (1 KB) - Dependencies and scripts

### Configuration
- **.env.example** - Environment variables template
- **.gitignore** (312 B) - Git ignore rules

---

## 🚀 Getting Started Path

### For Quick Deployment (5 minutes)
1. Read: **QUICKSTART.md**
2. Import: **workflow-01-order-processing.json**
3. Test: `npm run signature && npm test`

### For Comprehensive Understanding (30 minutes)
1. Overview: **WORKFLOW-01-COMPLETE.md**
2. Visual: **WORKFLOW-01-DIAGRAM.md**
3. Details: **README-workflow-01.md**
4. Test: **test-workflow.js**

### For Development/Customization
1. Full docs: **README-workflow-01.md**
2. Test data: **test-payloads.json**
3. Utilities: **generate-signature.js**, **test-workflow.js**

---

## 📚 Documentation Hierarchy

```
WORKFLOW-01-COMPLETE.md (Start here!)
├── QUICKSTART.md (Fast setup)
│   ├── workflow-01-order-processing.json (Import)
│   ├── .env.example (Configure)
│   └── package.json (Install deps)
│
├── README-workflow-01.md (Full reference)
│   ├── Setup instructions
│   ├── API documentation
│   ├── Troubleshooting
│   └── Security guide
│
└── WORKFLOW-01-DIAGRAM.md (Visual guide)
    ├── Flow diagrams
    ├── Decision trees
    └── Integration points
```

---

## 🧪 Testing Files

```
test-payloads.json
├── test_payloads (8 scenarios)
│   ├── standard_order
│   ├── high_value_order
│   ├── vip_gold_order
│   ├── vip_platinum_express
│   ├── international_order
│   ├── international_vip_express
│   ├── invalid_order_missing_fields
│   └── edge_case_zero_total
│
└── test_scenarios (Expected outcomes)
    └── Each scenario with expected queue, priority, channels

test-workflow.js
├── HMAC validation tests
├── Data validation tests
├── Scenario tests
├── Concurrency tests
└── Performance benchmarks

generate-signature.js
├── Signature generation for all payloads
├── cURL command generation
└── Node.js code snippets
```

---

## 🎯 File Purposes at a Glance

| File | Purpose | When to Use |
|------|---------|-------------|
| **WORKFLOW-01-COMPLETE.md** | Package overview | First time setup |
| **QUICKSTART.md** | Fast deployment | Quick start |
| **README-workflow-01.md** | Full documentation | Reference & troubleshooting |
| **WORKFLOW-01-DIAGRAM.md** | Visual diagrams | Understanding flow |
| **workflow-01-order-processing.json** | n8n workflow | Import into n8n |
| **test-payloads.json** | Test data | Testing & validation |
| **test-workflow.js** | Test automation | CI/CD & verification |
| **generate-signature.js** | Signature tool | Manual testing |
| **package.json** | Dependencies | Setup & testing |
| **.env.example** | Config template | Initial setup |

---

## 📋 Quick Commands

```bash
# Setup
npm install                          # Install dependencies
cp .env.example .env                 # Create config file

# Testing
npm test                             # Run all tests
npm run signature                    # Generate test signatures
npm run test:verbose                 # Verbose test output
npm run test:scenario -- standard    # Test specific scenario

# Development
node generate-signature.js <file>    # Generate signatures
node test-workflow.js --verbose      # Run tests with details
```

---

## 🔗 Related Workflows

- **Workflow 02**: AI Chatbot → README-AI-CHATBOT.md
- **Workflow 03**: Inventory Management → workflow-03-README.md
- **Workflow 04**: Abandoned Cart → README-abandoned-cart.md
- **Workflow 10**: Fraud Detection → FRAUD-DETECTION-README.md

---

## 📞 Need Help?

1. **Quick issue?** → Check QUICKSTART.md troubleshooting section
2. **Technical details?** → See README-workflow-01.md
3. **Understanding flow?** → Review WORKFLOW-01-DIAGRAM.md
4. **Testing problems?** → Run `npm test` and check output
5. **Still stuck?** → Contact engineering@citadelbuy.com

---

**Last Updated**: 2024-12-03
**Index Version**: 1.0.0
