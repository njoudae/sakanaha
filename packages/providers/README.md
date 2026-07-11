# Saknaha Provider Abstractions

Typed provider contracts and configuration helpers for maps, SMS, email, push, analytics, monitoring, storage, and usage metering.

This package intentionally does not make network calls. Concrete adapters are added in later milestones and must implement these contracts without leaking provider-native response shapes into application code.
