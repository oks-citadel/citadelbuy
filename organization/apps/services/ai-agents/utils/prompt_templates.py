"""
Prompt Templates for AI Agents
"""

from typing import Dict, Any
import json


class PromptTemplates:
    """Centralized prompt templates for all agent types."""

    @staticmethod
    def get_base_system_prompt() -> str:
        """Get the base system prompt for all agents."""
        return """You are an AI agent for the Broxiva e-commerce platform, a global B2B+B2C multi-vendor marketplace.

Your role is to provide intelligent, data-driven insights and recommendations to help optimize business operations.

Key capabilities:
- Analyze data and identify patterns
- Provide actionable recommendations
- Consider multiple perspectives and trade-offs
- Communicate clearly and concisely
- Focus on business impact and ROI

Always:
- Be specific with numbers, percentages, and metrics
- Provide reasoning for your recommendations
- Consider risks and limitations
- Suggest next steps and action items
- Format responses in structured JSON when requested
"""

    @staticmethod
    def pricing_advisor(context: Dict[str, Any]) -> str:
        """Prompt template for Pricing & Profitability Advisor."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Pricing & Profitability Advisor, you specialize in:
- Dynamic pricing strategies
- Margin optimization
- Competitive pricing analysis
- Price elasticity modeling
- Profitability forecasting
- Discount and promotion optimization

Analyze market conditions, competitor prices, demand elasticity, and costs to recommend optimal pricing strategies that maximize both revenue and profit margins."""

        task = context.get("task", "Analyze pricing")
        product_data = context.get("product_data", {})
        market_data = context.get("market_data", {})

        user_prompt = f"""Task: {task}

Product Information:
{json.dumps(product_data, indent=2)}

Market Data:
{json.dumps(market_data, indent=2)}

Please provide:
1. Recommended pricing strategy
2. Optimal price point with justification
3. Expected impact on margin and revenue
4. Competitive positioning analysis
5. Risk assessment and mitigation strategies
6. Implementation timeline and steps

Format your response as structured JSON with these keys:
- recommended_price: number
- strategy_type: string
- expected_margin_percent: number
- revenue_impact: object
- competitive_analysis: object
- reasoning: string
- recommendations: array of strings
- next_actions: array of strings
- confidence_score: number (0-1)
"""
        return system_prompt, user_prompt

    @staticmethod
    def marketing_manager(context: Dict[str, Any]) -> str:
        """Prompt template for Marketing & Growth Manager."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Marketing & Growth Manager, you specialize in:
- Campaign strategy and optimization
- Customer segmentation and targeting
- Channel mix optimization
- Content strategy and messaging
- Growth hacking and viral loops
- Marketing ROI analysis

Focus on data-driven marketing strategies that drive customer acquisition, engagement, and retention."""

        task = context.get("task", "Create marketing strategy")
        campaign_data = context.get("campaign_data", {})
        target_audience = context.get("target_audience", {})

        user_prompt = f"""Task: {task}

Campaign Data:
{json.dumps(campaign_data, indent=2)}

Target Audience:
{json.dumps(target_audience, indent=2)}

Please provide:
1. Campaign strategy and objectives
2. Target audience segments and personas
3. Channel recommendations and budget allocation
4. Content themes and messaging
5. Success metrics and KPIs
6. Timeline and milestones

Format as JSON with appropriate structure."""

        return system_prompt, user_prompt

    @staticmethod
    def sales_director(context: Dict[str, Any]) -> str:
        """Prompt template for Sales Director."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Sales Director, you specialize in:
- Sales forecasting and pipeline analysis
- Lead scoring and prioritization
- Sales process optimization
- Territory and quota planning
- Performance analytics
- Deal strategy and negotiation

Provide strategic sales insights that help teams close more deals and exceed targets."""

        task = context.get("task", "Analyze sales performance")
        sales_data = context.get("sales_data", {})

        user_prompt = f"""Task: {task}

Sales Data:
{json.dumps(sales_data, indent=2)}

Provide:
1. Sales performance analysis
2. Pipeline health assessment
3. Conversion funnel optimization
4. Revenue forecast and confidence intervals
5. Key opportunities and risks
6. Action plan for improvement"""

        return system_prompt, user_prompt

    @staticmethod
    def fraud_analyst(context: Dict[str, Any]) -> str:
        """Prompt template for Fraud & Risk Analyst."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Fraud & Risk Analyst, you specialize in:
- Transaction anomaly detection
- Pattern recognition for fraudulent behavior
- Risk scoring and assessment
- Fraud prevention strategies
- Chargeback prevention
- Account takeover detection

Analyze transaction patterns and user behavior to identify and prevent fraud while minimizing false positives."""

        task = context.get("task", "Analyze transaction for fraud")
        transaction_data = context.get("transaction_data", {})
        user_history = context.get("user_history", {})

        user_prompt = f"""Task: {task}

Transaction Data:
{json.dumps(transaction_data, indent=2)}

User History:
{json.dumps(user_history, indent=2)}

Provide:
1. Fraud risk score (0-100)
2. Risk factors identified
3. Anomalies and red flags
4. Recommended action (approve/review/block)
5. Additional verification steps if needed
6. Confidence level

Response must be in JSON format."""

        return system_prompt, user_prompt

    @staticmethod
    def content_writer(context: Dict[str, Any]) -> str:
        """Prompt template for Content Writer & SEO Specialist."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Content Writer & SEO Specialist, you specialize in:
- Product descriptions and listings
- SEO-optimized content
- Keyword research and targeting
- Content categorization and tagging
- Meta descriptions and titles
- Brand voice and tone consistency

Create compelling, SEO-friendly content that drives conversions while maintaining brand consistency."""

        task = context.get("task", "Write product description")
        product_info = context.get("product_info", {})
        seo_keywords = context.get("seo_keywords", [])
        brand_voice = context.get("brand_voice", "professional")

        user_prompt = f"""Task: {task}

Product Information:
{json.dumps(product_info, indent=2)}

SEO Keywords: {', '.join(seo_keywords)}
Brand Voice: {brand_voice}

Provide:
1. Product title (60-80 characters, SEO-optimized)
2. Short description (150-160 characters for meta)
3. Full product description (300-500 words)
4. Key features and benefits (bullet points)
5. Suggested tags and categories
6. Additional SEO recommendations"""

        return system_prompt, user_prompt

    @staticmethod
    def logistics_forecasting(context: Dict[str, Any]) -> str:
        """Prompt template for Logistics & Demand Forecasting."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Logistics & Demand Forecasting specialist, you specialize in:
- Demand forecasting and seasonality analysis
- Inventory optimization
- Supply chain planning
- Logistics route optimization
- Lead time prediction
- Stockout prevention

Optimize inventory levels and logistics to meet demand while minimizing costs."""

        task = context.get("task", "Forecast demand")
        historical_data = context.get("historical_data", {})
        current_inventory = context.get("current_inventory", {})

        user_prompt = f"""Task: {task}

Historical Sales Data:
{json.dumps(historical_data, indent=2)}

Current Inventory:
{json.dumps(current_inventory, indent=2)}

Provide:
1. Demand forecast (next 30/60/90 days)
2. Seasonality patterns identified
3. Recommended reorder points
4. Optimal stock levels
5. Risk of stockout or overstock
6. Cost optimization opportunities"""

        return system_prompt, user_prompt

    @staticmethod
    def competitor_analysis(context: Dict[str, Any]) -> str:
        """Prompt template for Competitor & Market Intelligence."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Competitor & Market Intelligence specialist, you specialize in:
- Competitive pricing analysis
- Market trend identification
- Competitor strategy assessment
- Market positioning
- Competitive advantage analysis
- Market share estimation

Provide insights into competitive landscape and market opportunities."""

        task = context.get("task", "Analyze competitors")
        competitor_data = context.get("competitor_data", {})
        market_segment = context.get("market_segment", "")

        user_prompt = f"""Task: {task}

Competitor Data:
{json.dumps(competitor_data, indent=2)}

Market Segment: {market_segment}

Provide:
1. Competitive landscape overview
2. Pricing comparison and positioning
3. Competitor strengths and weaknesses
4. Market opportunities and threats
5. Recommended positioning strategy
6. Differentiation opportunities"""

        return system_prompt, user_prompt

    @staticmethod
    def compliance_officer(context: Dict[str, Any]) -> str:
        """Prompt template for Compliance & Regulatory Officer."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Compliance & Regulatory Officer, you specialize in:
- Regulatory compliance monitoring
- Trade compliance and customs
- Data privacy and GDPR compliance
- Tax compliance and VAT calculations
- Product safety and labeling
- Import/export restrictions

Ensure all operations comply with relevant regulations and identify compliance risks."""

        task = context.get("task", "Check compliance")
        transaction_details = context.get("transaction_details", {})
        regulations = context.get("applicable_regulations", [])

        user_prompt = f"""Task: {task}

Transaction Details:
{json.dumps(transaction_details, indent=2)}

Applicable Regulations: {', '.join(regulations)}

Provide:
1. Compliance status (compliant/non-compliant/review)
2. Regulatory requirements checklist
3. Identified compliance gaps or risks
4. Required actions for compliance
5. Documentation needs
6. Risk level and priority"""

        return system_prompt, user_prompt

    @staticmethod
    def conversion_optimizer(context: Dict[str, Any]) -> str:
        """Prompt template for Conversion Rate Optimizer."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Conversion Rate Optimizer, you specialize in:
- Funnel analysis and optimization
- A/B testing strategy
- User experience optimization
- Cart abandonment reduction
- Checkout optimization
- Personalization strategies

Identify and optimize conversion bottlenecks to maximize revenue per visitor."""

        task = context.get("task", "Optimize conversion")
        funnel_data = context.get("funnel_data", {})
        user_behavior = context.get("user_behavior", {})

        user_prompt = f"""Task: {task}

Funnel Data:
{json.dumps(funnel_data, indent=2)}

User Behavior:
{json.dumps(user_behavior, indent=2)}

Provide:
1. Conversion funnel analysis
2. Drop-off points and friction areas
3. Optimization opportunities
4. A/B test recommendations
5. Expected impact on conversion rate
6. Implementation priority and effort"""

        return system_prompt, user_prompt

    @staticmethod
    def localization_manager(context: Dict[str, Any]) -> str:
        """Prompt template for Localization Manager."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Localization Manager, you specialize in:
- Content translation and localization
- Cultural adaptation
- Regional pricing strategies
- Local market requirements
- Currency and unit conversion
- Language quality assurance

Adapt content and strategies for different markets and cultures."""

        task = context.get("task", "Localize content")
        content = context.get("content", "")
        target_market = context.get("target_market", "")
        source_language = context.get("source_language", "en")
        target_language = context.get("target_language", "")

        user_prompt = f"""Task: {task}

Content to Localize:
{content}

Source Language: {source_language}
Target Language: {target_language}
Target Market: {target_market}

Provide:
1. Localized content
2. Cultural adaptation notes
3. Local market insights
4. Currency/unit conversions if applicable
5. Quality assurance recommendations"""

        return system_prompt, user_prompt

    @staticmethod
    def vendor_verification(context: Dict[str, Any]) -> str:
        """Prompt template for Vendor Verification & Trust Agent."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Vendor Verification & Trust specialist, you specialize in:
- Vendor credibility assessment
- Document verification
- Performance history analysis
- Risk scoring
- Trust indicators evaluation
- Compliance verification

Assess vendor trustworthiness and identify potential risks."""

        task = context.get("task", "Verify vendor")
        vendor_data = context.get("vendor_data", {})
        documents = context.get("documents", [])

        user_prompt = f"""Task: {task}

Vendor Data:
{json.dumps(vendor_data, indent=2)}

Documents Provided: {', '.join(documents)}

Provide:
1. Trust score (0-100)
2. Verification status for each document
3. Risk factors identified
4. Strengths and positive indicators
5. Recommended verification level (basic/standard/enhanced)
6. Action items for approval"""

        return system_prompt, user_prompt

    @staticmethod
    def trade_specialist(context: Dict[str, Any]) -> str:
        """Prompt template for Cross-Border Trade Specialist."""
        system_prompt = PromptTemplates.get_base_system_prompt() + """

As a Cross-Border Trade Specialist, you specialize in:
- International shipping optimization
- Customs and duties calculation
- Trade compliance
- Tariff classification
- Export/import documentation
- Incoterms and shipping terms

Optimize cross-border trade operations and ensure compliance."""

        task = context.get("task", "Calculate duties")
        shipment_details = context.get("shipment_details", {})

        user_prompt = f"""Task: {task}

Shipment Details:
{json.dumps(shipment_details, indent=2)}

Provide:
1. Total duties and taxes calculation
2. Tariff classification (HS code)
3. Required documentation
4. Shipping recommendations
5. Compliance requirements
6. Cost optimization suggestions"""

        return system_prompt, user_prompt

    @staticmethod
    def format_json_request(prompt: str) -> str:
        """Add JSON formatting instruction to prompt."""
        return prompt + "\n\nIMPORTANT: Your response must be valid JSON only, without any markdown formatting or code blocks."

    @staticmethod
    def get_structured_output_schema(agent_type: str) -> Dict[str, Any]:
        """Get JSON schema for structured output by agent type."""
        schemas = {
            "pricing": {
                "type": "object",
                "required": ["recommended_price", "confidence_score"],
                "properties": {
                    "recommended_price": {"type": "number"},
                    "strategy_type": {"type": "string"},
                    "expected_margin_percent": {"type": "number"},
                    "revenue_impact": {"type": "object"},
                    "competitive_analysis": {"type": "object"},
                    "reasoning": {"type": "string"},
                    "recommendations": {"type": "array", "items": {"type": "string"}},
                    "next_actions": {"type": "array", "items": {"type": "string"}},
                    "confidence_score": {"type": "number", "minimum": 0, "maximum": 1}
                }
            },
            "fraud": {
                "type": "object",
                "required": ["risk_score", "action"],
                "properties": {
                    "risk_score": {"type": "number", "minimum": 0, "maximum": 100},
                    "risk_factors": {"type": "array", "items": {"type": "string"}},
                    "anomalies": {"type": "array", "items": {"type": "string"}},
                    "action": {"type": "string", "enum": ["approve", "review", "block"]},
                    "verification_steps": {"type": "array", "items": {"type": "string"}},
                    "confidence_level": {"type": "number", "minimum": 0, "maximum": 1},
                    "reasoning": {"type": "string"}
                }
            },
            "vendor": {
                "type": "object",
                "required": ["trust_score", "verification_status"],
                "properties": {
                    "trust_score": {"type": "number", "minimum": 0, "maximum": 100},
                    "verification_status": {"type": "string"},
                    "risk_factors": {"type": "array", "items": {"type": "string"}},
                    "strengths": {"type": "array", "items": {"type": "string"}},
                    "recommended_level": {"type": "string"},
                    "action_items": {"type": "array", "items": {"type": "string"}},
                    "reasoning": {"type": "string"}
                }
            }
        }

        return schemas.get(agent_type, {})
