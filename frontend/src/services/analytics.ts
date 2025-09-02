// Basic Analytics Service for Shelf Scanner
// This is a privacy-focused, GDPR-compliant analytics implementation
import React from 'react';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  page?: string;
}

interface UserProperties {
  sessionId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  isReturningUser: boolean;
}

interface PageView {
  page: string;
  title: string;
  timestamp: number;
  sessionId: string;
  referrer?: string;
}

class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private pageViews: PageView[] = [];
  private userProperties: UserProperties;
  private isEnabled: boolean = true;
  private flushInterval: number = 30000; // 30 seconds
  private maxEventsBeforeFlush: number = 10;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.userProperties = this.collectUserProperties();
    this.startPeriodicFlush();

    // Check if user has consented to analytics
    this.checkAnalyticsConsent();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private collectUserProperties(): UserProperties {
    const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
      const width = window.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    };

    return {
      sessionId: this.sessionId,
      deviceType: getDeviceType(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      isReturningUser: localStorage.getItem('shelf_scanner_returning_user') === 'true'
    };
  }

  private checkAnalyticsConsent(): void {
    const consent = localStorage.getItem('analytics_consent');
    this.isEnabled = consent !== 'false'; // Default to enabled unless explicitly disabled
    
    // Mark as returning user
    if (!localStorage.getItem('shelf_scanner_returning_user')) {
      localStorage.setItem('shelf_scanner_returning_user', 'true');
    }
  }

  public setAnalyticsConsent(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('analytics_consent', enabled.toString());
    
    if (!enabled) {
      // Clear stored events if user opts out
      this.events = [];
      this.pageViews = [];
    }
  }

  public getAnalyticsConsent(): boolean {
    return this.isEnabled;
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  // Core event tracking
  public track(eventName: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties: this.sanitizeProperties(properties || {}),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      page: window.location.pathname
    };

    this.events.push(event);
    console.log(`📊 Analytics: ${eventName}`, properties);

    // Flush if we've accumulated enough events
    if (this.events.length >= this.maxEventsBeforeFlush) {
      this.flush();
    }
  }

  // Page view tracking
  public trackPageView(page: string, title?: string): void {
    if (!this.isEnabled) return;

    const pageView: PageView = {
      page,
      title: title || document.title,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      referrer: document.referrer || undefined
    };

    this.pageViews.push(pageView);
    this.track('page_view', {
      page,
      title: pageView.title,
      referrer: pageView.referrer
    });
  }

  // App-specific tracking methods
  public trackUserAction(action: string, details?: Record<string, any>): void {
    this.track('user_action', {
      action,
      ...details
    });
  }

  public trackError(error: string, context?: Record<string, any>): void {
    this.track('error_occurred', {
      error,
      context,
      stack: context?.stack?.substring(0, 500) // Limit stack trace length
    });
  }

  public trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.track('performance_metric', {
      metric,
      value,
      unit
    });
  }

  // Shelf Scanner specific events
  public trackBookshelfScan(details: {
    imageSize?: number;
    processingTime?: number;
    booksDetected?: number;
    confidence?: number;
  }): void {
    this.track('bookshelf_scanned', {
      imageSize: details.imageSize,
      processingTimeMs: details.processingTime,
      booksDetected: details.booksDetected,
      averageConfidence: details.confidence
    });
  }

  public trackRecommendationGeneration(details: {
    inputBooks?: number;
    outputRecommendations?: number;
    processingTime?: number;
    aiProvider?: string;
    goodreadsIntegrated?: boolean;
  }): void {
    this.track('recommendations_generated', {
      inputBooks: details.inputBooks,
      outputRecommendations: details.outputRecommendations,
      processingTimeMs: details.processingTime,
      aiProvider: details.aiProvider,
      goodreadsIntegrated: details.goodreadsIntegrated
    });
  }

  public trackBookInteraction(action: 'save' | 'amazon_click' | 'rate', bookTitle: string): void {
    this.track('book_interaction', {
      action,
      bookTitle: bookTitle.substring(0, 100) // Limit book title length
    });
  }

  public trackPreferencesUpdate(preferencesCount: number, categories: string[]): void {
    this.track('preferences_updated', {
      preferencesCount,
      categories: categories.slice(0, 10) // Limit array size
    });
  }

  public trackCameraUsage(success: boolean, errorType?: string): void {
    this.track('camera_usage', {
      success,
      errorType
    });
  }

  public trackUploadUsage(fileSize: number, fileType: string, success: boolean): void {
    this.track('file_upload', {
      fileSizeKB: Math.round(fileSize / 1024),
      fileType,
      success
    });
  }

  // Funnel tracking
  public trackFunnelStep(step: string, stepNumber: number, totalSteps: number): void {
    this.track('funnel_step', {
      step,
      stepNumber,
      totalSteps,
      completionRate: (stepNumber / totalSteps) * 100
    });
  }

  // Session tracking
  public trackSessionStart(): void {
    this.track('session_start', {
      deviceType: this.userProperties.deviceType,
      isReturningUser: this.userProperties.isReturningUser,
      language: this.userProperties.language,
      timezone: this.userProperties.timezone
    });
  }

  public trackSessionEnd(): void {
    const sessionDuration = Date.now() - parseInt(this.sessionId.split('-')[0]);
    this.track('session_end', {
      sessionDurationMs: sessionDuration,
      eventsTracked: this.events.length,
      pagesViewed: this.pageViews.length
    });
    
    // Force flush on session end
    this.flush();
  }

  // Data sanitization
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      // Skip sensitive data
      if (this.isSensitiveKey(key)) continue;
      
      // Limit string lengths
      if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '...';
      } else if (Array.isArray(value) && value.length > 100) {
        sanitized[key] = value.slice(0, 100);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'token', 'key', 'secret', 'auth', 'email', 
      'phone', 'address', 'credit', 'payment', 'ssn'
    ];
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }

  // Data persistence and transmission
  private async flush(): Promise<void> {
    if (!this.isEnabled || this.events.length === 0) return;

    try {
      const payload = {
        events: this.events,
        pageViews: this.pageViews,
        userProperties: this.userProperties,
        timestamp: Date.now()
      };

      // In a real implementation, you would send this to your analytics endpoint
      // For now, we'll just log it and store in localStorage for debugging
      console.log('📊 Analytics flush:', payload);
      
      // Store analytics data locally for now
      const stored = JSON.parse(localStorage.getItem('analytics_data') || '[]');
      stored.push(...this.events);
      localStorage.setItem('analytics_data', JSON.stringify(stored.slice(-1000))); // Keep last 1000 events

      // Clear events after successful transmission
      this.events = [];
      this.pageViews = [];

    } catch (error) {
      console.error('Analytics flush failed:', error);
    }
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // Utility methods
  public getStoredAnalytics(): AnalyticsEvent[] {
    try {
      return JSON.parse(localStorage.getItem('analytics_data') || '[]');
    } catch {
      return [];
    }
  }

  public clearStoredAnalytics(): void {
    localStorage.removeItem('analytics_data');
    this.events = [];
    this.pageViews = [];
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getUserProperties(): UserProperties {
    return { ...this.userProperties };
  }

  // Debug methods
  public getQueuedEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  public enableDebugMode(): void {
    (window as any).analytics = this;
    console.log('📊 Analytics debug mode enabled. Access via window.analytics');
  }
}

// Create singleton instance
export const analytics = new AnalyticsService();

// React hook for analytics
export const useAnalytics = () => {
  React.useEffect(() => {
    analytics.trackSessionStart();
    
    return () => {
      analytics.trackSessionEnd();
    };
  }, []);

  return {
    track: analytics.track.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackUserAction: analytics.trackUserAction.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackBookshelfScan: analytics.trackBookshelfScan.bind(analytics),
    trackRecommendationGeneration: analytics.trackRecommendationGeneration.bind(analytics),
    trackBookInteraction: analytics.trackBookInteraction.bind(analytics),
    trackPreferencesUpdate: analytics.trackPreferencesUpdate.bind(analytics),
    trackCameraUsage: analytics.trackCameraUsage.bind(analytics),
    trackUploadUsage: analytics.trackUploadUsage.bind(analytics),
    setAnalyticsConsent: analytics.setAnalyticsConsent.bind(analytics),
    getAnalyticsConsent: analytics.getAnalyticsConsent.bind(analytics)
  };
};

// React hook for page view tracking
export const usePageTracking = (pageName: string, pageTitle?: string) => {
  React.useEffect(() => {
    analytics.trackPageView(pageName, pageTitle);
  }, [pageName, pageTitle]);
};

export default analytics;