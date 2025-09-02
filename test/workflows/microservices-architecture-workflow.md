# Microservices Architecture Development Workflow

**Complexity Level**: Advanced (8 Steps)  
**Duration Estimate**: 1.5-2 hours  
**Dependencies**: Mixed (5 dependent, 3 independent steps)

## Overview
This workflow demonstrates building a complete microservices architecture with service discovery, event-driven communication, and comprehensive observability. Perfect for learning modern distributed systems patterns.

## Workflow Steps

### Step 1: Service Discovery & API Gateway
```markdown
## Step 1 ##
- Playbook: service-discovery
- Prompt: Set up service discovery and API gateway for microservices architecture
- Handoff: Provide configured service mesh with load balancing
```

### Step 2: User Management Service
```markdown
## Step 2 ##
- Playbook: user-service
- RelyPreviousStep: yes
- Prompt: Create user management microservice with CRUD operations and authentication
- Handoff: Deliver containerized user service with API documentation
```

### Step 3: Order Processing Service (Independent)
```markdown
## Step 3 ##
- Playbook: order-service
- RelyPreviousStep: no
- Prompt: Build order processing microservice with event-driven architecture
- Handoff: Provide order service with message queue integration
```

### Step 4: Notification Service
```markdown
## Step 4 ##
- Playbook: notification-service
- RelyPreviousStep: yes
- Prompt: Implement notification service for email, SMS, and push notifications
- Handoff: Deliver notification service with template management
```

### Step 5: Data Processing Pipeline (Independent)
```markdown
## Step 5 ##
- Playbook: data-pipeline
- RelyPreviousStep: no
- Prompt: Create data processing pipeline for analytics and reporting
- Handoff: Provide ETL pipeline with data warehouse integration
```

### Step 6: Security Service
```markdown
## Step 6 ##
- Playbook: security-service
- RelyPreviousStep: yes
- Prompt: Implement centralized security service with OAuth2 and rate limiting
- Handoff: Deliver security middleware for all microservices
```

### Step 7: Monitoring & Observability
```markdown
## Step 7 ##
- Playbook: monitoring-observability
- RelyPreviousStep: yes
- Prompt: Set up distributed tracing, metrics collection, and log aggregation
- Handoff: Provide complete observability stack with dashboards
```

### Step 8: Kubernetes Orchestration
```markdown
## Step 8 ##
- Playbook: orchestration
- RelyPreviousStep: yes
- Prompt: Deploy microservices using Kubernetes with auto-scaling and health checks
- Handoff: Deliver production-ready microservices platform
```

## Dependency Chain Analysis

**Independent Steps:**
- Step 1: Service Discovery (foundation)
- Step 3: Order Service (parallel development)
- Step 5: Data Pipeline (parallel development)

**Dependent Steps:**
- Step 2 → Step 1 (user service needs service discovery)
- Step 4 → Step 2 (notifications depend on user events)
- Step 6 → Step 4 (security integrates with existing services)
- Step 7 → Step 6 (monitoring observes secured services)
- Step 8 → Step 7 (orchestration with monitoring)

## Expected Outcomes

- ✅ Service mesh with API gateway
- ✅ Containerized microservices
- ✅ Event-driven communication
- ✅ Centralized security and auth
- ✅ Real-time data processing
- ✅ Distributed tracing and monitoring
- ✅ Auto-scaling Kubernetes deployment

## Architecture Patterns Demonstrated

- **Service Discovery**: Consul/Eureka integration
- **API Gateway**: Request routing and load balancing
- **Event Sourcing**: Order processing with events
- **CQRS**: Separate read/write data models
- **Circuit Breaker**: Fault tolerance patterns
- **Saga Pattern**: Distributed transaction management