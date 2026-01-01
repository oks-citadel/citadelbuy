# ADR 002: Microservices Architecture with AI Agents

**Status**: Accepted

**Date**: 2025-12-06

**Deciders**: Platform Architecture Team, CTO, AI/ML Lead

**Technical Story**: Platform Modernization - Breaking Down Monolith into AI-Powered Microservices

---

## Context

The Broxiva platform initially started as a modular monolith (NestJS application with modules). As we scale to support:

1. **Global Operations**: 6 regions, 1M+ concurrent users
2. **300+ AI Capabilities**: Across 38 categories
3. **12 Specialized AI Agents**: Each requiring different ML stacks
4. **Multiple Development Teams**: 5+ teams working on different features
5. **Heterogeneous Tech Stacks**: Node.js for business logic, Python for AI/ML
6. **Independent Scaling**: Different components have vastly different resource requirements

The monolithic architecture is becoming a bottleneck due to:
- Deployment friction (entire app must be deployed for any change)
- Resource inefficiency (AI services need GPU, web services need CPU)
- Team bottlenecks (all teams modifying same codebase)
- Technology constraints (can't use Python for AI easily)
- Scaling limitations (can't scale AI services independently)

## Decision

We will adopt a **Microservices Architecture** with the following design:

1. **Core Business Services** (NestJS/TypeScript):
   - Products Service
   - Orders Service
   - Users Service
   - Vendors Service
   - Payments Service
   - Shipping Service
   - Inventory Service
   - Reviews Service
   - Checkout Service
   - Cart Service
   - Tax Service
   - Returns Service
   - Organization Service
   - Webhooks Service
   - Privacy Service
   - Support Service

2. **AI Agent Microservices** (Python/FastAPI):
   - Agent #1: Recommendation Engine (TensorFlow, collaborative filtering)
   - Agent #2: Smart Search (Elasticsearch, BERT transformers)
   - Agent #3: Fraud Detection (Scikit-learn, XGBoost)
   - Agent #4: Price Optimization (TensorFlow, regression models)
   - Agent #5: Personalization Engine (PyTorch, deep learning)
   - Agent #6: Demand Forecasting (Prophet, ARIMA, time series)
   - Agent #7: Chatbot AI (GPT-4 API, Rasa, LangChain)
   - Agent #8: Analytics Engine (Pandas, Apache Spark)
   - Agent #9: Media Processing (OpenCV, PIL, FFmpeg)
   - Agent #10: Notification Intelligence (Celery, optimization algorithms)
   - Agent #11: Supplier Scoring (Scikit-learn, classification)
   - Agent #12: Conversion Prediction (XGBoost, LightGBM)

3. **Service Communication**:
   - **Synchronous**: REST APIs for request-response (NestJS ↔ AI services)
   - **Asynchronous**: Event-driven with Redis Pub/Sub + RabbitMQ
   - **Internal**: gRPC for high-performance service-to-service calls

4. **API Gateway**:
   - **External Gateway**: Kong (rate limiting, auth, routing)
   - **Internal Gateway**: NestJS API Gateway (business logic routing)

5. **Data Management**:
   - **Database per Service**: PostgreSQL databases (logical separation)
   - **Shared Data**: Event-driven sync via message queue
   - **Eventual Consistency**: Accept for non-critical data

6. **Service Discovery & Orchestration**:
   - **Kubernetes**: Container orchestration (AKS)
   - **Service Mesh**: Istio/Linkerd for mTLS and observability
   - **DNS**: Kubernetes internal DNS for service discovery

## Consequences

### Positive

- **Independent Deployment**: Each service can be deployed independently, reducing deployment risk
- **Technology Freedom**: Use Python for AI, Node.js for business logic, Go for performance-critical services
- **Team Autonomy**: Teams can work on different services without conflicts
- **Scalability**: Scale AI services with GPUs, web services with CPUs independently
- **Resilience**: Failure in one service doesn't bring down the entire platform
- **Resource Efficiency**: Right-size each service (AI services get GPUs, web services get CPUs)
- **Faster Development**: Parallel development across multiple teams
- **Easier Testing**: Test services in isolation
- **Better Monitoring**: Granular metrics per service

### Negative

- **Complexity**: Distributed systems are complex (network issues, latency, debugging)
- **Operational Overhead**: Need to manage 28+ services instead of 1 monolith
- **Data Consistency**: Eventual consistency can be confusing
- **Deployment Complexity**: Need sophisticated CI/CD pipelines
- **Inter-Service Communication**: Network latency between services
- **Debugging Difficulty**: Tracing requests across multiple services is hard
- **Cost**: More infrastructure resources required
- **Testing Complexity**: Need integration tests across services
- **Transaction Management**: Distributed transactions are complex (Saga pattern)

### Neutral

- **Learning Curve**: Team needs to learn distributed systems patterns
- **Monitoring Required**: Must invest in comprehensive monitoring (Prometheus, Grafana, Jaeger)
- **Documentation**: Need detailed API documentation for each service

## Alternatives Considered

### Alternative 1: Keep Modular Monolith

**Description**: Continue with the NestJS modular monolith, but with better module boundaries.

**Pros**:
- Simpler to deploy (single application)
- Easier to debug (all code in one place)
- No network latency between modules
- Simpler data consistency (single database, ACID transactions)
- Lower operational complexity

**Cons**:
- Can't use Python for AI (stuck with TypeScript/Node.js)
- Can't scale modules independently
- All teams work in same codebase (merge conflicts)
- Single point of failure
- Deployment of any change requires redeploying entire app
- AI services can't get GPUs easily

**Reason for rejection**: Doesn't support our AI-first strategy and multi-language requirements.

### Alternative 2: Serverless Functions (FaaS)

**Description**: Use Azure Functions or AWS Lambda for all services instead of containers.

**Pros**:
- No server management
- Pay per execution (cost efficient for low traffic)
- Auto-scaling built-in
- Fast deployment

**Cons**:
- Cold start latency (300ms-2s)
- Execution time limits (15 minutes max)
- Not suitable for long-running AI training jobs
- Vendor lock-in (hard to move from Azure Functions)
- Debugging is difficult
- Costly at high scale (cheaper to run containers)
- ML models need warm containers

**Reason for rejection**: Cold starts are unacceptable for real-time AI inference. Containers are better for our use case.

### Alternative 3: Service-Oriented Architecture (SOA)

**Description**: Build larger, coarse-grained services (e.g., one "Commerce Service" instead of Products, Orders, Cart, etc.)

**Pros**:
- Fewer services to manage (8-10 instead of 28+)
- Less inter-service communication
- Simpler architecture
- Easier to ensure data consistency

**Cons**:
- Services become mini-monoliths
- Still can't scale components independently
- Blurry service boundaries
- Team conflicts within same service

**Reason for rejection**: Doesn't provide enough granularity for our scaling and team autonomy needs.

## Implementation Notes

### Migration Strategy (6-month plan)

**Phase 1: Extract AI Services (Month 1-2)**
- Extract AI inference to standalone FastAPI services
- Keep training pipelines separate
- Implement API gateway routing
- Test performance and reliability

**Phase 2: Extract High-Traffic Services (Month 3-4)**
- Extract Products, Orders, Users services
- Implement event-driven sync
- Deploy with feature flags
- Gradual traffic shifting (10% → 50% → 100%)

**Phase 3: Extract Remaining Services (Month 5-6)**
- Extract remaining business services
- Implement full event-driven architecture
- Decommission monolith
- Post-migration optimization

### Service Design Principles

1. **Single Responsibility**: Each service does one thing well
2. **Loose Coupling**: Services communicate via APIs/events, not shared databases
3. **High Cohesion**: Related functionality grouped together
4. **API-First**: Design APIs before implementation
5. **Fault Tolerance**: Circuit breakers, retries, timeouts
6. **Observability**: Logging, metrics, distributed tracing
7. **Stateless**: Services don't store session state (use Redis)

### Technology Stack per Service Type

**Business Services (Node.js/TypeScript)**:
- Framework: NestJS
- ORM: Prisma
- API: REST + GraphQL
- Testing: Jest

**AI Services (Python)**:
- Framework: FastAPI
- ML Libraries: TensorFlow, PyTorch, Scikit-learn
- API: REST
- Testing: Pytest

**Infrastructure**:
- Container Runtime: Docker
- Orchestration: Kubernetes (AKS)
- Service Mesh: Istio (optional)
- API Gateway: Kong + NestJS

### Communication Patterns

**Synchronous (REST)**:
- Client → API Gateway → Service
- Use for: User-facing requests, real-time data

**Asynchronous (Events)**:
- Service → Event Bus → Multiple Subscribers
- Use for: Background jobs, data sync, notifications

**Example Event Flow**:
```
Order Created Event
├─ Inventory Service (reserve stock)
├─ Payment Service (process payment)
├─ Email Service (send confirmation)
├─ Analytics Service (track metrics)
└─ Vendor Service (notify vendor)
```

### Monitoring & Observability

**Metrics** (Prometheus):
- Request rate, latency, error rate per service
- Resource usage (CPU, memory, disk)
- Custom business metrics

**Logging** (ELK Stack):
- Structured JSON logs
- Correlation IDs for request tracing
- Centralized log aggregation

**Tracing** (Jaeger/Zipkin):
- Distributed tracing across services
- Identify performance bottlenecks
- Visualize service dependencies

**Alerting** (PagerDuty + Slack):
- Service down alerts
- High error rate alerts
- Performance degradation alerts

## References

- [Microservices Pattern - Martin Fowler](https://martinfowler.com/microservices/)
- [Building Microservices - Sam Newman](https://samnewman.io/books/building_microservices/)
- [Uber Microservices Architecture](https://eng.uber.com/microservice-architecture/)
- [Netflix Microservices Best Practices](https://netflixtechblog.com/)
- [AWS Microservices Guide](https://aws.amazon.com/microservices/)

---

**Last Updated**: 2025-12-06
**Author**: Platform Architecture Team
**Reviewers**: CTO, AI/ML Lead, Principal Engineers
