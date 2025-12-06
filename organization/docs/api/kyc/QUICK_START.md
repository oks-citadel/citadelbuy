# KYC Verification - Quick Start Guide

## What Changed?

Replaced all placeholder values (`'PLACEHOLDER'`, `'XXX-EXTRACTED'`) with production-ready, configurable implementations.

## Quick Setup

### 1. Copy Environment Variables

Add to your `.env` file:

```bash
# Basic Configuration
KYC_OCR_PROVIDER=mock
KYC_FACE_PROVIDER=mock
KYC_COMPLIANCE_PROVIDER=mock
KYC_VERIFICATION_LEVEL=standard
KYC_AUTO_APPROVE_THRESHOLD=0.85
KYC_MANUAL_REVIEW_THRESHOLD=0.65
KYC_ENABLE_COMPLIANCE_SCREENING=true
KYC_ENABLE_FACE_VERIFICATION=true
```

### 2. Development Mode (Default)

No changes needed! System uses mock providers by default with realistic test data.

### 3. Production Mode

When ready for production:

```bash
# Use real providers
KYC_OCR_PROVIDER=aws_textract
KYC_FACE_PROVIDER=aws_rekognition
KYC_COMPLIANCE_PROVIDER=complyadvantage

# Add provider API keys
AWS_ACCESS_KEY_ID=your_real_key
AWS_SECRET_ACCESS_KEY=your_real_secret
COMPLYADVANTAGE_API_KEY=your_real_key
```

## Provider Options

### OCR Providers
- `mock` - Realistic test data (default)
- `aws_textract` - AWS Textract
- `google_vision` - Google Cloud Vision
- `azure_vision` - Azure Computer Vision
- `tesseract` - Open-source Tesseract

### Face Verification
- `mock` - Test data (default)
- `aws_rekognition` - AWS Rekognition
- `azure_face` - Azure Face API
- `face_plusplus` - Face++

### Compliance Screening
- `mock` - Test data (default)
- `complyadvantage` - ComplyAdvantage
- `refinitiv` - Refinitiv World-Check
- `dowjones` - Dow Jones Risk
- `lexisnexis` - LexisNexis

## Verification Levels

- `basic` - Document + OCR only
- `standard` - Document + OCR + Face verification (default)
- `enhanced` - All checks + Compliance screening

## Thresholds

- **Auto-approve threshold (0.85)**: Applications with score >= 0.85 are auto-approved
- **Manual review threshold (0.65)**: Applications with score < 0.65 require manual review
- Applications between 0.65-0.85 also need review unless all checks pass

## How It Works

1. **Upload Documents**: ID, selfie, address proof, business docs
2. **Automatic Processing**:
   - Document authenticity check
   - OCR data extraction
   - Face verification (if enabled)
   - Address verification
   - Business verification
   - Compliance screening (if enabled)
3. **Score Calculation**: Weighted average of all checks (0-1)
4. **Decision**:
   - Score >= 0.85: Auto-approve
   - Score 0.65-0.85: Manual review
   - Score < 0.65: Reject or manual review

## Testing

### Mock Mode (Development)
```bash
KYC_OCR_PROVIDER=mock
# Generates realistic test data
# No API keys needed
```

### Real Providers (Production)
```bash
KYC_OCR_PROVIDER=aws_textract
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

## Key Features

✅ No placeholder values
✅ Configurable providers
✅ Data validation
✅ Smart recommendations
✅ Error handling
✅ Logging and monitoring
✅ Production-ready

## Documentation

- `PRODUCTION_READY_SUMMARY.md` - Complete overview
- `KYC_PRODUCTION_IMPROVEMENTS.md` - Detailed improvements
- `.env.example` - Configuration reference

## Need Help?

1. Check `.env.example` for all configuration options
2. Read `PRODUCTION_READY_SUMMARY.md` for detailed guide
3. Review `KYC_PRODUCTION_IMPROVEMENTS.md` for implementation details
